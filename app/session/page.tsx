"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import Link from "next/link";
import { useStore, useHasHydrated } from "@/lib/store";
import { KINKS, CATEGORIES, getKinksByCategory } from "@/lib/kinks";
import type { KinkStatus, Profile } from "@/types";
import { encodeSdp, decodeSdp, waitForIceGathering, ICE_SERVERS } from "@/lib/webrtc";

declare global {
  interface Window {
    BarcodeDetector?: {
      new(opts?: { formats?: string[] }): {
        detect(img: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
      };
    };
  }
}

const STATUS_COLOR: Record<NonNullable<KinkStatus>, string> = {
  yes: "var(--yes)", willing: "var(--willing)", maybe: "var(--maybe)",
  no: "var(--no)", hard_no: "var(--hard-no)",
};
const STATUS_LABEL: Record<NonNullable<KinkStatus>, string> = {
  yes: "Ja", willing: "Graag", maybe: "Misschien", no: "Nee", hard_no: "Harde grens",
};
const PILLS: { s: NonNullable<KinkStatus>; label: string }[] = [
  { s: "yes", label: "Ja" }, { s: "willing", label: "Graag" },
  { s: "maybe", label: "Misschien" }, { s: "no", label: "Nee" },
  { s: "hard_no", label: "Harde grens" },
];

type Msg =
  | { t: "e"; k: string; s: KinkStatus }
  | { t: "p"; n: string; r: string }
  | { t: "d" };

type Phase =
  | "host_idle" | "host_gathering" | "host_offering" | "host_connecting"
  | "guest_idle" | "guest_gathering" | "guest_answering"
  | "connected" | "done_local" | "revealed";

function RelayPage({ answer, sid }: { answer: string; sid: string }) {
  useEffect(() => {
    const bc = new BroadcastChannel("kinksync-session");
    bc.postMessage({ type: "answer", answer, sid });
    bc.close();
  }, [answer, sid]);

  return (
    <main className="flex items-center justify-center min-h-screen p-6" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="text-center">
        <div className="text-4xl mb-4">🖤</div>
        <h1 className="text-xl font-bold mb-2" style={{ color: "var(--accent)" }}>Verbonden!</h1>
        <p className="text-sm mb-6" style={{ color: "var(--text2)" }}>
          Je kunt dit venster sluiten — de sessie loopt in het andere tabblad.
        </p>
        <button
          onClick={() => window.close()}
          className="focus-ring px-6 py-2.5 rounded-xl text-sm border"
          style={{ borderColor: "var(--border)", color: "var(--text2)" }}
        >
          Sluit venster
        </button>
      </div>
    </main>
  );
}

function HostGuestSession({ oParam, sidParam }: { oParam: string | null; sidParam: string | null }) {
  const { profiles } = useStore();
  const _hasHydrated = useHasHydrated();

  const isGuest = !!oParam;

  const [phase, setPhase] = useState<Phase>(isGuest ? "guest_idle" : "host_idle");
  const [profileId, setProfileId] = useState(() => profiles[0]?.id ?? "");
  const [sessionId] = useState(() => Math.random().toString(36).slice(2, 10));
  const [offerQr, setOfferQr] = useState("");
  const [answerQr, setAnswerQr] = useState("");
  const [answerEnc, setAnswerEnc] = useState("");
  const [answerCopied, setAnswerCopied] = useState(false);
  const [pasteAnswer, setPasteAnswer] = useState("");
  const [scanning, setScanning] = useState(false);
  const [hasBarcodeDetector, setHasBarcodeDetector] = useState(false);
  const [local, setLocal] = useState<Record<string, KinkStatus>>({});
  const [remote, setRemote] = useState<Record<string, KinkStatus>>({});
  const [remoteProfile, setRemoteProfile] = useState<{ name: string; role: string } | null>(null);
  const [partnerDone, setPartnerDone] = useState(false);
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanFrameRef = useRef<number>(0);
  const scanningRef = useRef(false);
  const applyAnswerRef = useRef<((enc: string) => Promise<void>) | null>(null);

  const profile = profiles.find(p => p.id === profileId);
  const effectiveSid = isGuest ? (sidParam ?? "") : sessionId;

  useEffect(() => {
    setHasBarcodeDetector(typeof window !== "undefined" && "BarcodeDetector" in window);
  }, []);

  // Host listens for relay answer via BroadcastChannel (fallback when native QR scan navigates)
  useEffect(() => {
    if (isGuest) return;
    const bc = new BroadcastChannel("kinksync-session");
    bc.onmessage = (e: MessageEvent) => {
      if (e.data?.type === "answer" && e.data.sid === sessionId) {
        applyAnswerRef.current?.(e.data.answer as string);
      }
    };
    return () => bc.close();
  }, [isGuest, sessionId]);

  function send(msg: Msg) {
    const ch = channelRef.current;
    if (ch?.readyState === "open") ch.send(JSON.stringify(msg));
  }

  function initLocal(p: Profile): Record<string, KinkStatus> {
    const entries: Record<string, KinkStatus> = {};
    for (const [id, e] of Object.entries(p.entries)) {
      if (e.status) entries[id] = e.status;
    }
    setLocal(entries);
    return entries;
  }

  function setupChannel(ch: RTCDataChannel, p: Profile, initial: Record<string, KinkStatus>) {
    channelRef.current = ch;
    ch.onmessage = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data as string) as Msg;
        // Validate message shape
        if (!msg || typeof msg !== "object" || typeof msg.t !== "string") return;
        if (msg.t === "e") {
          if (typeof msg.k !== "string" || (msg.s !== null && typeof msg.s !== "string")) return;
          setRemote(r => ({ ...r, [msg.k]: msg.s }));
        } else if (msg.t === "p") {
          if (typeof msg.n !== "string" || typeof msg.r !== "string") return;
          setRemoteProfile({ name: msg.n, role: msg.r });
        } else if (msg.t === "d") {
          setPartnerDone(true);
        }
      } catch (err) {
        console.error("Invalid message received:", err);
      }
    };
    const onOpen = () => {
      setPhase("connected");
      const ch2 = channelRef.current!;
      ch2.send(JSON.stringify({ t: "p", n: p.name, r: p.role } as Msg));
      for (const [k, s] of Object.entries(initial)) {
        if (s) ch2.send(JSON.stringify({ t: "e", k, s } as Msg));
      }
    };
    if (ch.readyState === "open") onOpen();
    else ch.onopen = onOpen;
  }

  function stopScanner() {
    scanningRef.current = false;
    cancelAnimationFrame(scanFrameRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setScanning(false);
  }

  const applyAnswerSdp = async (enc: string) => {
    const pc = pcRef.current;
    if (!pc) return;
    setError("");
    setPhase("host_connecting");
    stopScanner();
    try {
      const sdp = decodeSdp(enc);
      await pc.setRemoteDescription({ type: "answer", sdp });
    } catch (err) {
      setError("Ongeldig antwoord: " + String(err));
      setPhase("host_offering");
    }
  };

  // Keep ref current so closures (BroadcastChannel, scanner) always call latest version
  useEffect(() => { applyAnswerRef.current = applyAnswerSdp; });

  async function handleStartHost() {
    if (!profile) return;
    const initial = initLocal(profile);
    setPhase("host_gathering");
    setError("");
    try {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;
      const ch = pc.createDataChannel("kink", { ordered: true });
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIceGathering(pc);
      const offerEncoded = encodeSdp(pc.localDescription!.sdp);
      const url = `${window.location.origin}/session?o=${offerEncoded}&sid=${sessionId}`;
      const qr = await QRCode.toDataURL(url, { width: 240, margin: 2, color: { dark: "#c084fc", light: "#0a0a0f" } });
      setOfferQr(qr);
      setupChannel(ch, profile, initial);
      setPhase("host_offering");
    } catch (err) {
      setError(String(err));
      setPhase("host_idle");
    }
  }

  async function handleStartGuest() {
    if (!profile || !oParam) return;
    const initial = initLocal(profile);
    setPhase("guest_gathering");
    setError("");
    try {
      const offerSdp = decodeSdp(oParam);
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;
      let channelResolve!: (ch: RTCDataChannel) => void;
      const channelPromise = new Promise<RTCDataChannel>(res => { channelResolve = res; });
      pc.ondatachannel = (e) => channelResolve(e.channel);
      await pc.setRemoteDescription({ type: "offer", sdp: offerSdp });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitForIceGathering(pc);
      const enc = encodeSdp(pc.localDescription!.sdp);
      setAnswerEnc(enc);
      const answerUrl = `${window.location.origin}/session?a=${enc}&sid=${effectiveSid}`;
      const qr = await QRCode.toDataURL(answerUrl, { width: 240, margin: 2, color: { dark: "#c084fc", light: "#0a0a0f" } });
      setAnswerQr(qr);
      setPhase("guest_answering");
      const ch = await channelPromise;
      setupChannel(ch, profile, initial);
    } catch (err) {
      setError(String(err));
      setPhase("guest_idle");
    }
  }

  async function startScanner() {
    setScanning(true);
    scanningRef.current = true;
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const BD = window.BarcodeDetector;
      if (!BD) { stopScanner(); return; }
      const detector = new BD({ formats: ["qr_code"] });
      const scan = async () => {
        if (!videoRef.current || !scanningRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) {
            const raw = codes[0].rawValue;
            let scannedA: string | null = null;
            let scannedSid: string | null = null;
            try {
              const url = new URL(raw);
              scannedA = url.searchParams.get("a");
              scannedSid = url.searchParams.get("sid");
            } catch {
              scannedA = raw;
            }
            if (scannedA) {
              // Validate session ID if present
              if (scannedSid && scannedSid !== sessionId) {
                setError("Sessie ID komt niet overeen.");
                stopScanner();
                return;
              }
              await applyAnswerRef.current?.(scannedA);
            } else {
              setError("Ongeldige QR-code.");
              stopScanner();
            }
            return;
          }
        } catch { /* detector not ready yet, retry */ }
        scanFrameRef.current = requestAnimationFrame(scan);
      };
      scanFrameRef.current = requestAnimationFrame(scan);
    } catch (err) {
      setError("Camera niet beschikbaar: " + String(err));
      stopScanner();
    }
  }

  function handleStatusChange(kinkId: string, s: KinkStatus) {
    setLocal(l => ({ ...l, [kinkId]: s }));
    send({ t: "e", k: kinkId, s });
  }

  function handleDone() {
    send({ t: "d" });
    setPhase("done_local");
  }

  function toggleCat(cat: string) {
    setOpenCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  }

  useEffect(() => {
    if (phase === "done_local" && partnerDone) setPhase("revealed");
  }, [phase, partnerDone]);

  useEffect(() => () => {
    pcRef.current?.close();
    stopScanner();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!_hasHydrated) return null;

  const allIds = [...new Set([...Object.keys(local), ...Object.keys(remote)])];
  let matchCount = 0, hardCount = 0;
  const matched: string[] = [];
  for (const id of allIds) {
    const a = local[id] ?? null, b = remote[id] ?? null;
    if (a === "hard_no" || b === "hard_no") { hardCount++; continue; }
    if ((a === "yes" || a === "willing") && (b === "yes" || b === "willing")) { matchCount++; matched.push(id); }
  }

  const spinner = (msg: string) => (
    <div className="text-center py-16">
      <div className="animate-pulse text-4xl mb-4">🔮</div>
      <p className="text-sm" style={{ color: "var(--text2)" }}>{msg}</p>
    </div>
  );

  const accentBtn = (label: string, onClick: () => void, disabled = false) => (
    <button onClick={onClick} disabled={disabled}
      className="focus-ring w-full py-3 rounded-xl text-sm font-bold transition-opacity disabled:opacity-40"
      style={{ background: "var(--accent)", color: "#000" }}>
      {label}
    </button>
  );

  const profilePicker = () => (
    <>
      <p className="text-xs mb-1.5 font-medium" style={{ color: "var(--text2)" }}>Jouw profiel</p>
      <select value={profileId} onChange={e => setProfileId(e.target.value)}
        className="focus-ring w-full rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none"
        style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>
        {profiles.map(p => <option key={p.id} value={p.id}>{p.name} — {p.role}</option>)}
      </select>
      {profiles.length === 0 && (
        <p className="text-sm mb-4" style={{ color: "var(--text2)" }}>
          Maak eerst een profiel aan op de{" "}
          <Link href="/" style={{ color: "var(--accent)" }}>homepagina</Link>.
        </p>
      )}
    </>
  );

  return (
    <main style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh" }} className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="focus-ring text-sm" style={{ color: "var(--text2)" }}>← Terug</Link>
        <h1 className="text-xl font-bold flex-1 text-center" style={{ color: "var(--accent)" }}>Live Sessie</h1>
        <div className="w-16" />
      </div>

      {phase === "host_idle" && (
        <div>
          <p className="text-sm mb-5" style={{ color: "var(--text2)" }}>
            Start een live sessie. Geen server, geen cloud — puur apparaat-tot-apparaat via WebRTC met end-to-end encryptie.
          </p>
          {profilePicker()}
          {accentBtn("Sessie starten →", handleStartHost, !profile)}
          {error && <p className="text-xs mt-3" style={{ color: "var(--hard-no)" }}>{error}</p>}
        </div>
      )}

      {phase === "host_gathering" && spinner("Verbinding voorbereiden…")}

      {phase === "host_offering" && (
        <div>
          <p className="text-sm mb-3 text-center" style={{ color: "var(--text2)" }}>
            Laat je partner deze QR scannen met hun telefoon.
          </p>
          {offerQr && (
            <img src={offerQr} width={240} height={240} alt="Sessie QR" className="mx-auto rounded-xl mb-5" />
          )}

          {scanning ? (
            <div className="mb-4">
              <div className="relative rounded-xl overflow-hidden mb-3" style={{ border: "2px solid var(--accent)" }}>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video ref={videoRef} playsInline className="w-full" style={{ maxHeight: 280, objectFit: "cover" }} />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div style={{ width: 160, height: 160, border: "2px solid rgba(255,255,255,0.7)", borderRadius: 12 }} />
                </div>
              </div>
              <button onClick={stopScanner}
                className="focus-ring w-full py-2.5 rounded-xl text-sm border"
                style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
                Annuleer
              </button>
            </div>
          ) : hasBarcodeDetector ? (
            <button onClick={startScanner}
              className="focus-ring w-full py-3 rounded-xl text-sm font-bold mb-3"
              style={{ background: "var(--accent)", color: "#000" }}>
              📷 Scan antwoord van partner
            </button>
          ) : (
            <div className="mb-3">
              <p className="text-xs mb-2 font-medium" style={{ color: "var(--text2)" }}>
                Plak de antwoord-URL van je partner (fallback)
              </p>
              <textarea value={pasteAnswer} onChange={e => setPasteAnswer(e.target.value)}
                rows={3} placeholder="https://kinksync.be/session?a=…&sid=…"
                className="focus-ring w-full rounded-lg px-3 py-2 text-xs mb-2 focus:outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", resize: "none", fontFamily: "monospace" }} />
              <button onClick={() => {
                try {
                  const u = new URL(pasteAnswer.trim());
                  const a = u.searchParams.get("a");
                  const sid = u.searchParams.get("sid");
                  if (!a) {
                    setError("Geen antwoord gevonden in URL.");
                    return;
                  }
                  if (sid && sid !== sessionId) {
                    setError("Sessie ID komt niet overeen.");
                    return;
                  }
                  applyAnswerSdp(a);
                } catch { setError("Ongeldige URL."); }
              }} disabled={!pasteAnswer.trim()}
                className="focus-ring w-full py-3 rounded-xl text-sm font-bold transition-opacity disabled:opacity-40"
                style={{ background: "var(--accent)", color: "#000" }}>
                Verbinden
              </button>
            </div>
          )}
          {error && <p className="text-xs mt-2" style={{ color: "var(--hard-no)" }}>{error}</p>}
        </div>
      )}

      {phase === "host_connecting" && spinner("Verbinding tot stand brengen…")}

      {phase === "guest_idle" && (
        <div>
          <p className="text-sm mb-5" style={{ color: "var(--text2)" }}>
            Je hebt een sessie-uitnodiging ontvangen. Kies jouw profiel en verbind.
          </p>
          {profilePicker()}
          {accentBtn("Verbinden →", handleStartGuest, !profile)}
          {error && <p className="text-xs mt-3" style={{ color: "var(--hard-no)" }}>{error}</p>}
        </div>
      )}

      {phase === "guest_gathering" && spinner("Antwoord voorbereiden…")}

      {phase === "guest_answering" && (
        <div>
          <p className="text-sm mb-3 text-center" style={{ color: "var(--text2)" }}>
            Laat de host jouw QR scannen via de &ldquo;Scan antwoord&rdquo; knop in de app.
          </p>
          {answerQr && (
            <img src={answerQr} width={240} height={240} alt="Antwoord QR" className="mx-auto rounded-xl mb-4" />
          )}
          <button onClick={() => {
            const url = `${window.location.origin}/session?a=${answerEnc}&sid=${effectiveSid}`;
            navigator.clipboard.writeText(url);
            setAnswerCopied(true);
            setTimeout(() => setAnswerCopied(false), 2000);
          }}
            className="focus-ring w-full py-2.5 rounded-xl text-sm font-medium border mb-4 transition-colors"
            style={answerCopied
              ? { borderColor: "var(--yes)", color: "var(--yes)" }
              : { borderColor: "var(--border)", color: "var(--text)" }}>
            {answerCopied ? "✓ Gekopieerd!" : "⎘ Kopieer als fallback-link"}
          </button>
          <p className="text-xs text-center animate-pulse" style={{ color: "var(--text2)" }}>
            Wacht op verbinding van de host…
          </p>
        </div>
      )}

      {(phase === "connected" || phase === "done_local") && (
        <div>
          <div className="flex items-center gap-3 mb-4 p-3 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">
                <span style={{ color: "var(--accent)" }}>{profile?.name}</span>
                <span style={{ color: "var(--text2)" }}> vs </span>
                <span style={{ color: "var(--accent)" }}>{remoteProfile?.name ?? "partner"}</span>
              </div>
              <div className="text-[10px] mt-0.5 truncate" style={{ color: "var(--text2)" }}>
                {profile?.role}{remoteProfile ? ` · ${remoteProfile.role}` : ""}
              </div>
            </div>
            <div className="w-2 h-2 rounded-full flex-none animate-pulse" style={{ background: "var(--yes)" }} />
            <span className="text-[10px] font-medium flex-none" style={{ color: "var(--yes)" }}>Live</span>
          </div>

          <div className="mb-24">
            {CATEGORIES.map(cat => {
              const kinks = getKinksByCategory(cat);
              const myCount = kinks.filter(k => local[k.id]).length;
              const theirCount = kinks.filter(k => remote[k.id]).length;
              const isOpen = openCats.has(cat);
              return (
                <div key={cat} className="mb-2">
                  <button onClick={() => toggleCat(cat)}
                    className="focus-ring w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", borderLeft: `4px solid ${isOpen ? "var(--accent)" : "transparent"}` }}>
                    <span className="text-sm font-semibold flex-1">{cat}</span>
                    {myCount > 0 && <span className="text-[10px]" style={{ color: "var(--accent)" }}>jij: {myCount}</span>}
                    {theirCount > 0 && <span className="text-[10px]" style={{ color: "var(--text2)" }}>partner: {theirCount}</span>}
                    <span className="text-[10px]" style={{ color: "var(--text2)" }}>{isOpen ? "▲" : "▼"}</span>
                  </button>

                  {isOpen && (
                    <div className="mt-1 pl-1">
                      {kinks.map(kink => {
                        const myStatus = local[kink.id] ?? null;
                        const theirStatus = remote[kink.id] ?? null;
                        return (
                          <div key={kink.id} className="rounded-xl mb-1 px-3 py-2"
                            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderLeft: `3px solid ${myStatus ? STATUS_COLOR[myStatus] : "transparent"}` }}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-sm font-medium flex-1 leading-snug">{kink.name}</span>
                              {theirStatus && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded border flex-none"
                                  style={{ color: STATUS_COLOR[theirStatus], borderColor: `color-mix(in srgb, ${STATUS_COLOR[theirStatus]} 35%, transparent)`, background: `color-mix(in srgb, ${STATUS_COLOR[theirStatus]} 15%, transparent)` }}>
                                  {STATUS_LABEL[theirStatus]}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {PILLS.map(({ s, label }) => (
                                <button key={s}
                                  onClick={() => phase === "connected" && handleStatusChange(kink.id, myStatus === s ? null : s)}
                                  disabled={phase !== "connected"}
                                  aria-pressed={myStatus === s}
                                  className={`focus-ring rounded-full border text-[10px] px-2 py-0.5 transition-colors disabled:opacity-50${myStatus === s ? ` status-${s}` : ""}`}
                                  style={myStatus !== s ? { color: "var(--text2)", borderColor: "var(--border)" } : {}}>
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {phase === "connected" ? (
            <div className="fixed bottom-0 left-0 right-0 p-4" style={{ background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
              <button onClick={handleDone}
                className="focus-ring w-full max-w-lg mx-auto block py-3 rounded-xl text-sm font-bold"
                style={{ background: "var(--surface)", border: "2px solid var(--accent)", color: "var(--accent)" }}>
                🔒 Sluit af &amp; onthul matches
              </button>
            </div>
          ) : (
            <div className="fixed bottom-0 left-0 right-0 p-4 text-center" style={{ background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
              <p className="text-sm animate-pulse" style={{ color: "var(--text2)" }}>Wacht op partner…</p>
            </div>
          )}
        </div>
      )}

      {phase === "revealed" && (
        <div>
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🖤</div>
            <h2 className="text-3xl font-bold mb-1">{matchCount} matches</h2>
            <p className="text-sm" style={{ color: "var(--text2)" }}>
              {hardCount > 0 && `${hardCount} harde grens${hardCount !== 1 ? "en" : ""} · `}
              {profile?.name} &amp; {remoteProfile?.name ?? "partner"}
            </p>
          </div>

          {matched.length > 0 && (
            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-widest font-bold mb-2 px-1" style={{ color: "var(--accent)" }}>
                Jullie gedeeld verlangen
              </p>
              {matched.map(id => {
                const kink = KINKS.find(k => k.id === id);
                return kink ? (
                  <div key={id} className="match-pulse rounded-xl px-3 py-2.5 mb-1.5 flex items-center gap-2"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <span className="text-sm font-medium flex-1">{kink.name}</span>
                    <span className="text-[10px] font-bold" style={{ color: "var(--yes)" }}>✓ Match</span>
                  </div>
                ) : null;
              })}
            </div>
          )}

          <Link href="/"
            className="focus-ring block w-full py-3 rounded-xl text-sm font-bold text-center"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
            ← Terug naar home
          </Link>
        </div>
      )}
    </main>
  );
}

function SessionContent() {
  const searchParams = useSearchParams();
  const aParam = searchParams.get("a");
  const sidParam = searchParams.get("sid");
  const oParam = searchParams.get("o");

  if (aParam && sidParam) {
    return <RelayPage answer={aParam} sid={sidParam} />;
  }
  return <HostGuestSession oParam={oParam} sidParam={sidParam} />;
}

export default function SessionPage() {
  return <Suspense><SessionContent /></Suspense>;
}
