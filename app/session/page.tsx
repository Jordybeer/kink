"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import Link from "next/link";
import { useStore, useHasHydrated } from "@/lib/store";
import { KINKS, CATEGORIES, getKinksByCategory } from "@/lib/kinks";
import type { KinkStatus, Profile } from "@/types";
import { genCode, postOffer, getOffer, postAnswer, pollAnswer, waitForIceGathering, fetchIceServers } from "@/lib/webrtc";

const STATUS_COLOR: Record<NonNullable<KinkStatus>, string> = {
  yes: "var(--yes)", willing: "var(--willing)", maybe: "var(--maybe)",
  no: "var(--no)", hard_no: "var(--hard-no)",
};
const STATUS_LABEL: Record<NonNullable<KinkStatus>, string> = {
  yes: "Heel graag", willing: "Ja", maybe: "Misschien", no: "Voor hen", hard_no: "Harde grens",
};
const PILLS: { s: NonNullable<KinkStatus>; label: string }[] = [
  { s: "yes", label: "Heel graag" }, { s: "willing", label: "Ja" },
  { s: "maybe", label: "Misschien" }, { s: "no", label: "Voor hen" },
  { s: "hard_no", label: "Harde grens" },
];

type Msg =
  | { t: "a" }
  | { t: "p"; n: string; r: string }
  | { t: "d"; entries: Record<string, KinkStatus> };

type Phase =
  | "choose"
  | "host_idle" | "host_gathering" | "host_waiting" | "host_connecting"
  | "guest_idle" | "guest_gathering"
  | "connected" | "done_local" | "revealed";

function HostGuestSession({ joinParam }: { joinParam: string | null }) {
  const { profiles } = useStore();
  const _hasHydrated = useHasHydrated();

  const isGuest = !!joinParam;

  const [phase, setPhase] = useState<Phase>(isGuest ? "guest_idle" : "choose");
  const [profileId, setProfileId] = useState(() => profiles[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [codeInput, setCodeInput] = useState(() => joinParam ?? "");
  const [codeQr, setCodeQr] = useState("");
  const [local, setLocal] = useState<Record<string, KinkStatus>>({});
  const [remote, setRemote] = useState<Record<string, KinkStatus>>({});
  const [remoteProfile, setRemoteProfile] = useState<{ name: string; role: string } | null>(null);
  const [partnerDone, setPartnerDone] = useState(false);
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [gatheringElapsed, setGatheringElapsed] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);
  const applyAnswerRef = useRef<((sdp: string) => Promise<void>) | null>(null);
  const partnerActiveTimerRef  = useRef<ReturnType<typeof setTimeout>>(undefined);
  const partnerShimmerTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const partnerActiveDebounceRef = useRef<number>(0);
  const [partnerActive,  setPartnerActive]  = useState(false);
  const [partnerShimmer, setPartnerShimmer] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const revealCancelRef = useRef(false);
  const [showZeroState, setShowZeroState] = useState(false);

  const profile = profiles.find(p => p.id === profileId);
  const partnerName = remoteProfile?.name ?? "partner";

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

  function setupChannel(ch: RTCDataChannel, p: Profile) {
    channelRef.current = ch;
    ch.onmessage = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data as string) as Msg;
        if (!msg || typeof msg !== "object" || typeof msg.t !== "string") return;
        if (msg.t === "p") {
          if (typeof msg.n !== "string" || typeof msg.r !== "string") return;
          setRemoteProfile({ name: msg.n, role: msg.r });
        } else if (msg.t === "d") {
          setRemote(msg.entries);
          setPartnerDone(true);
        } else if (msg.t === "a") {
          clearTimeout(partnerActiveTimerRef.current);
          setPartnerActive(true);
          partnerActiveTimerRef.current = setTimeout(() => setPartnerActive(false), 3000);
          if (Date.now() - partnerActiveDebounceRef.current > 500) {
            clearTimeout(partnerShimmerTimerRef.current);
            setPartnerShimmer(true);
            partnerActiveDebounceRef.current = Date.now();
            partnerShimmerTimerRef.current = setTimeout(() => setPartnerShimmer(false), 620);
          }
        }
      } catch (err) {
        console.error("Invalid message received:", err);
      }
    };
    const onOpen = () => {
      setPhase("connected");
      channelRef.current!.send(JSON.stringify({ t: "p", n: p.name, r: p.role } as Msg));
    };
    if (ch.readyState === "open") onOpen();
    else ch.onopen = onOpen;
  }

  const applyAnswerSdp = async (sdp: string) => {
    const pc = pcRef.current;
    if (!pc) return;
    setError("");
    setPhase("host_connecting");
    pollAbortRef.current?.abort();
    try {
      await pc.setRemoteDescription({ type: "answer", sdp });
    } catch (err) {
      setError("Ongeldig antwoord: " + String(err));
      setPhase("host_waiting");
    }
  };

  useEffect(() => { applyAnswerRef.current = applyAnswerSdp; });

  async function handleStartHost() {
    if (!profile) return;
    setRevealedIds(new Set());
    setShowZeroState(false);
    initLocal(profile);
    const newCode = genCode();
    setCode(newCode);
    setPhase("host_gathering");
    setError("");
    try {
      const iceServers = await fetchIceServers();
      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
          setError("Verbinding verloren — probeer opnieuw.");
          setPhase("host_idle");
          pollAbortRef.current?.abort();
          pc.close();
        }
      };
      const ch = pc.createDataChannel("kink", { ordered: true });
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await Promise.race([
        waitForIceGathering(pc),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Verbinding mislukt — zelfde WiFi proberen of opnieuw.")), 15000)
        ),
      ]);
      await postOffer(newCode, pc.localDescription!.sdp);
      // QR encodes KINKSYNC:<CODE> — no URL, no shareable link
      const qr = await QRCode.toDataURL(`KINKSYNC:${newCode}`, {
        width: 200, margin: 2, errorCorrectionLevel: "L",
        color: { dark: "#c084fc", light: "#0a0a0f" },
      });
      setCodeQr(qr);
      setupChannel(ch, profile);
      setPhase("host_waiting");
      const ac = new AbortController();
      pollAbortRef.current = ac;
      pollAnswer(newCode, (sdp) => applyAnswerRef.current?.(sdp), ac.signal);
    } catch (err) {
      setError((err as Error).message ?? String(err));
      setPhase("host_idle");
    }
  }

  async function handleStartGuest() {
    if (!profile || codeInput.length !== 6) return;
    setRevealedIds(new Set());
    setShowZeroState(false);
    initLocal(profile);
    setPhase("guest_gathering");
    setError("");
    try {
      const [offerSdp, iceServers] = await Promise.all([getOffer(codeInput), fetchIceServers()]);
      if (!offerSdp) { setError("Code niet gevonden of verlopen."); setPhase("guest_idle"); return; }
      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
          setError("Verbinding verloren — probeer opnieuw.");
          setPhase("guest_idle");
          pollAbortRef.current?.abort();
          pc.close();
        }
      };
      let channelResolve!: (ch: RTCDataChannel) => void;
      const channelPromise = new Promise<RTCDataChannel>(res => { channelResolve = res; });
      pc.ondatachannel = (e) => channelResolve(e.channel);
      await pc.setRemoteDescription({ type: "offer", sdp: offerSdp });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await Promise.race([
        waitForIceGathering(pc),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Verbinding mislukt — zelfde WiFi proberen of opnieuw.")), 15000)
        ),
      ]);
      await postAnswer(codeInput, pc.localDescription!.sdp);
      const ch = await channelPromise;
      setupChannel(ch, profile);
    } catch (err) {
      setError((err as Error).message ?? String(err));
      setPhase("guest_idle");
    }
  }

  function handleStatusChange(kinkId: string, s: KinkStatus) {
    setLocal(l => ({ ...l, [kinkId]: s }));
    send({ t: "a" });
  }

  function handleDone() {
    send({ t: "d", entries: local });
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

  useEffect(() => {
    const gathering = phase === "host_gathering" || phase === "guest_gathering";
    if (!gathering) { setGatheringElapsed(0); return; }
    setGatheringElapsed(0);
    const t = setInterval(() => setGatheringElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => () => {
    pcRef.current?.close();
    pollAbortRef.current?.abort();
    clearTimeout(partnerActiveTimerRef.current);
    clearTimeout(partnerShimmerTimerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "revealed" || Object.keys(remote).length === 0) return;
    revealCancelRef.current = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const allIds = Object.keys(remote);
    const matchIds = allIds.filter(
      id => ["yes","willing"].includes(local[id] as string) && ["yes","willing"].includes(remote[id] as string)
    );
    const nonMatchIds = allIds.filter(id => !matchIds.includes(id));

    if (reducedMotion) {
      setRevealedIds(new Set(allIds));
      if (matchIds.length === 0) setShowZeroState(true);
      return;
    }

    const categoryMap = new Map<string, string[]>();
    for (const id of nonMatchIds) {
      const cat = KINKS.find(k => k.id === id)?.category ?? "overig";
      if (!categoryMap.has(cat)) categoryMap.set(cat, []);
      categoryMap.get(cat)!.push(id);
    }
    const groups: { ids: string[]; isMatchGroup: boolean }[] = [
      ...[...categoryMap.entries()].map(([, ids]) => ({ ids, isMatchGroup: false })),
      ...(matchIds.length > 0 ? [{ ids: matchIds, isMatchGroup: true }] : []),
    ];

    const pausePerGroup = Math.min(300, 2500 / Math.max(groups.length, 1));
    const allTimeouts: ReturnType<typeof setTimeout>[] = [];

    (async () => {
      for (const [groupIndex, { ids, isMatchGroup }] of groups.entries()) {
        if (revealCancelRef.current) return;

        const groupRevealDelay = ids.length * 30;
        await new Promise<void>(r => {
          const tid = setTimeout(() => {
            if (revealCancelRef.current) return;
            setRevealedIds(prev => new Set([...prev, ...ids]));
            r();
          }, groupRevealDelay);
          allTimeouts.push(tid);
        });

        if (!isMatchGroup) {
          const cat = KINKS.find(k => k.id === ids[0])?.category;
          if (cat) {
            document.querySelector(`[data-category="${cat}"]`)
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }

        if (isMatchGroup) {
          ids.forEach((id, i) => {
            const tid = setTimeout(() => {
              if (revealCancelRef.current) return;
              document.querySelectorAll(`[data-kink-id="${id}"]`).forEach(el => {
                el.classList.add("match-pulse");
              });
            }, i * 30 + 50);
            allTimeouts.push(tid);
          });
        }

        if (groupIndex < groups.length - 1) {
          await new Promise<void>(r => {
            const tid = setTimeout(r, pausePerGroup);
            allTimeouts.push(tid);
          });
        }
      }

      if (matchIds.length === 0) {
        const tid = setTimeout(() => {
          if (!revealCancelRef.current) setShowZeroState(true);
        }, 600);
        allTimeouts.push(tid);
      }
    })().catch(console.error);

    return () => {
      revealCancelRef.current = true;
      allTimeouts.forEach(clearTimeout);
    };
  }, [phase, remote, local]);

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
      {gatheringElapsed >= 5 && (
        <p className="text-xs mt-2" style={{ color: "var(--text2)", opacity: 0.6 }}>
          Nog bezig… ({gatheringElapsed}s) — controleer je WiFi-verbinding.
        </p>
      )}
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
        <button
          onClick={() => {
            if (phase === "host_idle" || phase === "guest_idle") {
              pollAbortRef.current?.abort();
              setPhase("choose");
            } else {
              window.history.back();
            }
          }}
          className="focus-ring text-sm"
          style={{ color: "var(--text2)" }}
        >
          ← Terug
        </button>
        <h1 className="text-xl font-bold flex-1 text-center" style={{ color: "var(--accent)" }}>Live sessie</h1>
        <div className="w-16" />
      </div>

      {phase === "choose" && (
        <div className="flex flex-col gap-3">
          <div
            className="rounded-xl px-4 py-3 text-xs leading-relaxed"
            style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}
          >
            <span className="font-semibold" style={{ color: "var(--text)" }}>🔒 End-to-end versleuteld — </span>
            ook wij kunnen niet meelezen. Je toestel regelt via onze server een verbinding met dat van je partner; daarna gaat alles direct tussen jullie twee. Je kinks en naam verlaten je toestel nooit.
          </div>
          <button
            onClick={() => setPhase("host_idle")}
            className="focus-ring w-full text-left px-4 py-4 rounded-2xl transition-opacity hover:opacity-90"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="text-2xl mb-1">📡</div>
            <div className="text-sm font-bold mb-0.5">Sessie aanmaken</div>
            <div className="text-xs" style={{ color: "var(--text2)" }}>Genereer een code en deel die met je partner.</div>
          </button>
          <button
            onClick={() => setPhase("guest_idle")}
            className="focus-ring w-full text-left px-4 py-4 rounded-2xl transition-opacity hover:opacity-90"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="text-2xl mb-1">🔑</div>
            <div className="text-sm font-bold mb-0.5">Deelnemen met code</div>
            <div className="text-xs" style={{ color: "var(--text2)" }}>Voer de 6-letterige code in van je partner.</div>
          </button>
        </div>
      )}

      {phase === "host_idle" && (
        <div>
          <p className="text-sm mb-5" style={{ color: "var(--text2)" }}>
            Start een live sessie — jij genereert een code, je partner typt die in. Verbinding loopt via een beveiligde relay en daarna direct apparaat-tot-apparaat.
          </p>
          {profilePicker()}
          {accentBtn("Sessie starten →", handleStartHost, !profile)}
          {error && <p className="text-xs mt-3" style={{ color: "var(--hard-no)" }}>{error}</p>}
        </div>
      )}

      {phase === "host_gathering" && spinner("Verbinding voorbereiden…")}

      {phase === "host_waiting" && (
        <div className="text-center">
          <p className="text-sm mb-4" style={{ color: "var(--text2)" }}>Geef je partner deze code:</p>
          <div className="text-6xl font-mono font-bold mb-1 tracking-widest" style={{ color: "var(--accent)", letterSpacing: "0.15em" }}>
            {code}
          </div>
          <p className="text-xs mb-5" style={{ color: "var(--text2)" }}>of scan de QR-code</p>
          {codeQr && (
            <img src={codeQr} width={200} height={200} alt="Sessie QR" className="mx-auto rounded-xl mb-5" />
          )}
          <p className="text-xs mb-5 animate-pulse" style={{ color: "var(--text2)" }}>Wacht op partner…</p>
          <button onClick={() => { pollAbortRef.current?.abort(); setPhase("host_idle"); setRevealedIds(new Set()); setShowZeroState(false); }}
            className="focus-ring w-full py-2.5 rounded-xl text-sm border transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
            Annuleer
          </button>
          {error && <p className="text-xs mt-3" style={{ color: "var(--hard-no)" }}>{error}</p>}
        </div>
      )}

      {phase === "host_connecting" && spinner("Verbinding tot stand brengen…")}

      {phase === "guest_idle" && (
        <div>
          <p className="text-sm mb-5" style={{ color: "var(--text2)" }}>
            Voer de 6-letterige code in die de host ziet.
          </p>
          {profilePicker()}
          <input
            value={codeInput}
            onChange={e => setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
            placeholder="Bijv. H7K2PQ"
            maxLength={6}
            className="focus-ring w-full rounded-lg px-3 py-2.5 text-center text-2xl font-mono font-bold mb-4 tracking-widest focus:outline-none"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--accent)" }}
          />
          {accentBtn("Verbinden →", handleStartGuest, !profile || codeInput.length !== 6)}
          {error && <p className="text-xs mt-3" style={{ color: "var(--hard-no)" }}>{error}</p>}
        </div>
      )}

      {phase === "guest_gathering" && spinner("Antwoord voorbereiden…")}

      {phase === "connected" && (
        <div>
          <div className="flex items-center gap-3 mb-4 p-3 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">
                <span style={{ color: "var(--accent)" }}>{profile?.name}</span>
                <span style={{ color: "var(--text2)" }}> vs </span>
                <span style={{ color: "var(--text)" }}>{partnerName}</span><span style={{ opacity: partnerActive ? 1 : 0, transition: "opacity 200ms ease", color: "var(--text2)" }}> is aan het invullen…</span>
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
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border flex-none partner-hidden${partnerShimmer ? " partner-shimmer" : ""}`}
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
                                  className={`focus-ring rounded-full border text-[11px] px-2.5 py-2.5 transition-colors disabled:opacity-50${myStatus === s ? ` status-${s}` : ""}`}
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

          <div className="fixed bottom-0 left-0 right-0 p-4" style={{ background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
            <button onClick={handleDone}
              className="focus-ring w-full max-w-lg mx-auto block py-3 rounded-xl text-sm font-bold"
              style={{ background: "var(--surface)", border: "2px solid var(--accent)", color: "var(--accent)" }}>
              🔒 Sluit af &amp; onthul matches
            </button>
          </div>
        </div>
      )}

      {phase === "done_local" && !partnerDone && (
        <div className="ks-fade-in flex flex-col items-center justify-center gap-4 text-center" style={{ minHeight: "60vh" }}>
          <div className="ks-icon-pop animate-pulse text-4xl">🔒</div>
          <div className="text-base" style={{ color: "var(--text)" }}>
            <span>{partnerName}</span>
            <span style={{ opacity: partnerActive ? 1 : 0, transition: "opacity 200ms ease", color: "var(--text2)" }}> is aan het invullen…</span>
          </div>
          <div className="ks-dot-pulse flex gap-1">
            <span /><span /><span />
          </div>
          <p className="text-sm" style={{ color: "var(--text2)", maxWidth: "36ch" }}>
            Zodra je partner klaar is, worden jullie antwoorden onthuld.
          </p>
        </div>
      )}

      {phase === "revealed" && (
        <div>
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🖤</div>
            <h2 className="text-3xl font-bold mb-1">{matchCount} matches</h2>
            <p className="text-sm" style={{ color: "var(--text2)" }}>
              {hardCount > 0 && `${hardCount} harde grens${hardCount !== 1 ? "en" : ""} · `}
              {profile?.name} &amp; <span style={{ color: "var(--text)" }}>{partnerName}</span><span style={{ opacity: partnerActive ? 1 : 0, transition: "opacity 200ms ease", color: "var(--text2)" }}> is aan het invullen…</span>
            </p>
          </div>

          {CATEGORIES.map(cat => {
            const kinks = getKinksByCategory(cat).filter(k => remote[k.id]);
            if (kinks.length === 0) return null;
            return (
              <div key={cat} className="mb-4">
                <div
                  data-category={cat}
                  className="text-[10px] uppercase tracking-widest font-bold mb-2 px-1"
                  style={{ color: "var(--accent)" }}
                >
                  {cat}
                </div>
                {kinks.map((kink, index) => {
                  const revealed = revealedIds.has(kink.id);
                  const isMatchKink = matched.includes(kink.id);
                  return (
                    <div
                      key={kink.id}
                      data-kink-id={kink.id}
                      className={`rounded-xl px-3 py-2.5 mb-1.5 flex items-center gap-2${revealed ? " partner-reveal" : " partner-hidden"}`}
                      style={{
                        background: "var(--surface)",
                        border: `1px solid ${isMatchKink ? "var(--yes)" : "var(--border)"}`,
                        ...(revealed ? { animationDelay: `${index * 30}ms` } : {}),
                      }}
                    >
                      <span className="text-sm font-medium flex-1">{kink.name}</span>
                      {isMatchKink ? (
                        <span className="text-[10px] font-bold" style={{ color: "var(--yes)" }}>✓ Match</span>
                      ) : (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded border flex-none"
                          style={{
                            color: STATUS_COLOR[remote[kink.id]!],
                            borderColor: `color-mix(in srgb, ${STATUS_COLOR[remote[kink.id]!]} 35%, transparent)`,
                            background: `color-mix(in srgb, ${STATUS_COLOR[remote[kink.id]!]} 15%, transparent)`,
                          }}
                        >
                          {STATUS_LABEL[remote[kink.id]!]}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {showZeroState && (
            <div className="ks-fade-in text-center my-6 p-8 rounded-xl" style={{ background: "var(--surface)", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
              <div className="ks-icon-pop text-4xl mb-3">🖤</div>
              <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text)" }}>Geen matches — en dat is oké.</h3>
              <p className="text-sm mx-auto" style={{ color: "var(--text2)", maxWidth: "36ch" }}>
                Jullie lijsten overlappen niet, maar eerlijkheid is het begin van alles.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2 mb-3">
            <Link href={`/compare?a=${profileId}`}
              className="focus-ring block w-full py-3 rounded-xl text-sm font-bold text-center transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "#000" }}>
              Vergelijk uitgebreid →
            </Link>
            <Link href={`/contract?a=${profileId}`}
              className="focus-ring block w-full py-3 rounded-xl text-sm font-bold text-center transition-opacity hover:opacity-90"
              style={{ background: "var(--surface)", border: "1px solid var(--accent)", color: "var(--accent)" }}>
              Maak een contract →
            </Link>
          </div>
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
  // Use ?join= param (set by QR scanner) — never exposes code in a shareable URL
  const joinParam = searchParams.get("join");
  return <HostGuestSession joinParam={joinParam} />;
}

export default function SessionPage() {
  return <Suspense><SessionContent /></Suspense>;
}
