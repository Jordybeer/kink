"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Broadcast, Check, Eye, EyeSlash, Heart, Key, Lock, SpinnerGap } from "@phosphor-icons/react";
import { useStore, useHasHydrated } from "@/lib/store";
import { CATEGORIES, getKinksByCategory } from "@/lib/kinks";
import type { CustomKink, ExperienceLevel, KinkStatus, Profile } from "@/types";
import { genCode, postOffer, getOffer, postAnswer, pollAnswer, waitForIceGathering, fetchIceServers } from "@/lib/webrtc";
import PageShell from "@/components/PageShell";
import {
  buildPartnerProfile,
  sanitizeRemoteProfileFull,
  sanitizeSessionResponses,
  type RemoteProfileFull,
  type SessionResponse,
  type SessionResponses,
} from "@/lib/sessionImport";
import SessionImportAction from "@/components/SessionImportAction";
import PrivateResponseStatus from "@/components/PrivateResponseStatus";
import { STATUS_LABEL, STATUS_ORDER, STATUS_VAR } from "@/lib/statusLabels";

function iceServersSummary(servers: RTCIceServer[]): string {
  const urls = servers.map(s => String(s.urls));
  const turn = urls.filter(u => u.startsWith("turn:")).length;
  const stun = urls.filter(u => u.startsWith("stun:")).length;
  return `${servers.length} servers — ${turn} TURN, ${stun} STUN${turn === 0 ? " — GEEN TURN" : ""}`;
}

function iceCandSummary(types: string[]): string {
  const counts: Record<string, number> = {};
  for (const t of types) counts[t] = (counts[t] ?? 0) + 1;
  const parts = Object.entries(counts).map(([t, n]) => `${n}× ${t}`).join(", ") || "geen";
  return `${types.length} kandidaten (${parts})${counts.relay ? " — relay aanwezig" : " — GEEN relay; cross-netwerk zal falen"}`;
}

const PILLS = STATUS_ORDER.map((s) => ({ s, label: STATUS_LABEL[s] }));

function statusOf(response: SessionResponse | undefined): KinkStatus {
  return response?.status ?? null;
}

function isEnthusiastic(status: KinkStatus): boolean {
  return status === "yes" || status === "willing";
}

function mergeSessionPayload(
  publicEntries: unknown,
  privateEntries: unknown,
): SessionResponses {
  const publicResponses = sanitizeSessionResponses(publicEntries);
  const privateResponses = sanitizeSessionResponses(privateEntries);
  for (const [kinkId, response] of Object.entries(privateResponses)) {
    publicResponses[kinkId] = { ...response, privateResponse: true };
  }
  return publicResponses;
}

type Msg =
  | { t: "a"; id?: string }
  | { t: "p"; n: string; r: string }
  | { t: "P"; id: string; n: string; r: string; e?: ExperienceLevel; ck?: CustomKink[]; av?: string }
  | {
      t: "d";
      /** Legacy-safe public statuses. Old clients only read this field. */
      entries: Record<string, KinkStatus>;
      /** Private statuses live separately so old clients cannot expose them. */
      privateEntries?: Record<string, KinkStatus>;
    }
  | { t: "k" };

type Phase =
  | "choose"
  | "host_idle" | "host_gathering" | "host_waiting" | "host_connecting"
  | "guest_idle" | "guest_gathering"
  | "connected" | "done_local" | "revealed";

function HostGuestSession({ joinParam }: { joinParam: string | null }) {
  const { profiles, importProfiles } = useStore();
  const _hasHydrated = useHasHydrated();
  const router = useRouter();

  const isGuest = !!joinParam;

  const [phase, setPhase] = useState<Phase>(isGuest ? "guest_idle" : "choose");
  const [profileId, setProfileId] = useState(() => profiles[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [codeInput, setCodeInput] = useState(() => joinParam ?? "");
  const [codeQr, setCodeQr] = useState("");
  const [local, setLocal] = useState<SessionResponses>({});
  const [remote, setRemote] = useState<SessionResponses>({});
  const [remoteProfile, setRemoteProfile] = useState<{ name: string; role: string } | null>(null);
  const [remoteProfileFull, setRemoteProfileFull] = useState<RemoteProfileFull | null>(null);
  const [partnerDone, setPartnerDone] = useState(false);
  const [importDone, setImportDone] = useState<null | "saved" | "exists">(null);
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [gatheringElapsed, setGatheringElapsed] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);
  const applyAnswerRef = useRef<((sdp: string) => Promise<void>) | null>(null);
  const partnerActiveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const partnerShimmerTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const partnerActiveDebounceRef = useRef<number>(0);
  const [partnerActive, setPartnerActive] = useState(false);
  const [partnerShimmer, setPartnerShimmer] = useState(false);
  const [partnerTappedId, setPartnerTappedId] = useState<string | null>(null);
  const partnerTapTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [privacyRevealedIds, setPrivacyRevealedIds] = useState<Set<string>>(new Set());
  const revealedRef = useRef<Set<string>>(new Set());
  const revealCancelRef = useRef(false);
  const [showZeroState, setShowZeroState] = useState(false);

  const profile = profiles.find(p => p.id === profileId);
  const partnerName = remoteProfile?.name ?? "partner";

  function log(msg: string) {
    console.log(msg);
    setDebugLog(prev => [...prev.slice(-19), msg]);
  }

  function send(msg: Msg) {
    const ch = channelRef.current;
    if (ch?.readyState === "open") ch.send(JSON.stringify(msg));
  }

  function initLocal(p: Profile): SessionResponses {
    const entries: SessionResponses = {};
    for (const [id, entry] of Object.entries(p.entries)) {
      if (entry.status || entry.privateResponse) {
        entries[id] = {
          status: entry.status,
          ...(entry.privateResponse ? { privateResponse: true } : {}),
        };
      }
    }
    setLocal(entries);
    return entries;
  }

  function setupChannel(ch: RTCDataChannel, p: Profile) {
    channelRef.current = ch;
    ch.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as Msg;
        if (!msg || typeof msg !== "object" || typeof msg.t !== "string") return;
        if (msg.t === "p") {
          if (typeof msg.n !== "string" || typeof msg.r !== "string") return;
          setRemoteProfile({ name: msg.n, role: msg.r });
        } else if (msg.t === "P") {
          const full = sanitizeRemoteProfileFull(msg);
          if (full) {
            setRemoteProfileFull(full);
            setRemoteProfile({ name: full.name, role: full.role });
          }
        } else if (msg.t === "d") {
          setRemote(mergeSessionPayload(msg.entries, msg.privateEntries));
          setPartnerDone(true);
        } else if (msg.t === "a") {
          clearTimeout(partnerActiveTimerRef.current);
          setPartnerActive(true);
          partnerActiveTimerRef.current = setTimeout(() => setPartnerActive(false), 3000);
          if (msg.id) {
            clearTimeout(partnerTapTimerRef.current);
            setPartnerTappedId(msg.id);
            partnerTapTimerRef.current = setTimeout(() => setPartnerTappedId(null), 700);
          }
          if (Date.now() - partnerActiveDebounceRef.current > 500) {
            clearTimeout(partnerShimmerTimerRef.current);
            setPartnerShimmer(true);
            partnerActiveDebounceRef.current = Date.now();
            partnerShimmerTimerRef.current = setTimeout(() => setPartnerShimmer(false), 620);
          }
        }
        // "k" keepalive — no-op, receiving it is enough to keep NAT mappings alive
      } catch (err) {
        console.error("Invalid message received:", err);
      }
    };
    const onOpen = () => {
      setPhase("connected");
      const ch2 = channelRef.current!;
      ch2.send(JSON.stringify({ t: "p", n: p.name, r: p.role } as Msg));
      ch2.send(JSON.stringify({
        t: "P", id: p.id, n: p.name, r: p.role,
        e: p.experienceLevel, ck: p.customKinks,
        av: p.avatarDataUrl,
      } as Msg));
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = setInterval(() => {
        if (ch2.readyState === "open") ch2.send(JSON.stringify({ t: "k" } as Msg));
        else clearInterval(heartbeatRef.current);
      }, 25000);
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

  function resetPeerState() {
    setRemote({});
    setRemoteProfile(null);
    setRemoteProfileFull(null);
    setPartnerDone(false);
    setImportDone(null);
    setPrivacyRevealedIds(new Set());
  }

  async function handleStartHost() {
    if (!profile) return;
    resetPeerState();
    setRevealedIds(new Set());
    setShowZeroState(false);
    initLocal(profile);
    const newCode = genCode();
    setCode(newCode);
    setPhase("host_gathering");
    setError("");
    setDebugLog([]);
    try {
      log("[host] TURN ophalen...");
      const iceServers = await fetchIceServers(log);
      log("[host] ICE servers: " + iceServersSummary(iceServers));
      let pc: RTCPeerConnection;
      try {
        pc = new RTCPeerConnection({ iceServers, iceCandidatePoolSize: 2 });
      } catch (err) {
        console.warn("[host] RTCPeerConnection met TURN mislukt, val terug op STUN:", err);
        pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }], iceCandidatePoolSize: 2 });
      }
      pcRef.current = pc;
      const hostCandTypes: string[] = [];
      pc.onicecandidate = (event) => {
        if (event.candidate?.type) hostCandTypes.push(event.candidate.type);
        else log("[host] ICE klaar: " + iceCandSummary(hostCandTypes));
      };
      let disconnectTimer: ReturnType<typeof setTimeout> | undefined;
      pc.oniceconnectionstatechange = () => {
        log("[host] ICE state: " + pc.iceConnectionState);
        if (pc.iceConnectionState === "failed") {
          clearTimeout(disconnectTimer);
          setError("Verbinding mislukt — zorg dat beide toestellen online zijn en probeer opnieuw.");
          setPhase("host_idle");
          pollAbortRef.current?.abort();
          pc.close();
        } else if (pc.iceConnectionState === "disconnected") {
          try { pc.restartIce(); } catch { /* not supported on this browser */ }
          disconnectTimer = setTimeout(() => {
            if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
              setError("Verbinding verloren — probeer opnieuw.");
              setPhase("host_idle");
              pollAbortRef.current?.abort();
              pc.close();
            }
          }, 6000);
        } else {
          clearTimeout(disconnectTimer);
        }
      };
      const ch = pc.createDataChannel("kink", { ordered: true });
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log("[host] local description set, gathering ICE...");
      await Promise.race([
        waitForIceGathering(pc, 8000),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Verbinding mislukt — zelfde WiFi proberen of opnieuw.")), 15000)
        ),
      ]);
      log("[host] ICE na timeout: " + iceCandSummary(hostCandTypes));
      log("[host] offer posten...");
      await postOffer(newCode, pc.localDescription!.sdp);
      const qr = await QRCode.toDataURL(`${location.origin}/session?join=${newCode}`, {
        width: 200, margin: 2, errorCorrectionLevel: "L",
        color: { dark: "#D946AF", light: "#0a0a0f" },
      });
      setCodeQr(qr);
      setupChannel(ch, profile);
      setPhase("host_waiting");
      const ac = new AbortController();
      pollAbortRef.current = ac;
      pollAnswer(newCode, (sdp) => applyAnswerRef.current?.(sdp), ac.signal);
      console.log("[host] waiting for guest answer");
    } catch (err) {
      console.error("[host] error:", err);
      setError(String(err));
      setPhase("host_idle");
    }
  }

  async function handleStartGuest() {
    if (!profile || codeInput.length !== 6) return;
    resetPeerState();
    setRevealedIds(new Set());
    setShowZeroState(false);
    initLocal(profile);
    setPhase("guest_gathering");
    setError("");
    setDebugLog([]);
    try {
      log("[guest] offer + TURN ophalen...");
      const [offerSdp, iceServers] = await Promise.all([getOffer(codeInput), fetchIceServers(log)]);
      log("[guest] ICE servers: " + iceServersSummary(iceServers));
      if (!offerSdp) { setError("Code niet gevonden of verlopen."); setPhase("guest_idle"); return; }
      console.log("[guest] offer received, creating RTCPeerConnection");
      let pc: RTCPeerConnection;
      try {
        pc = new RTCPeerConnection({ iceServers, iceCandidatePoolSize: 2 });
      } catch (err) {
        console.warn("[guest] RTCPeerConnection met TURN mislukt, val terug op STUN:", err);
        pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }], iceCandidatePoolSize: 2 });
      }
      pcRef.current = pc;
      const guestCandTypes: string[] = [];
      pc.onicecandidate = (event) => {
        if (event.candidate?.type) guestCandTypes.push(event.candidate.type);
        else log("[guest] ICE klaar: " + iceCandSummary(guestCandTypes));
      };
      let disconnectTimer: ReturnType<typeof setTimeout> | undefined;
      pc.oniceconnectionstatechange = () => {
        log("[guest] ICE state: " + pc.iceConnectionState);
        if (pc.iceConnectionState === "failed") {
          clearTimeout(disconnectTimer);
          setError("Verbinding mislukt — zorg dat beide toestellen online zijn en probeer opnieuw.");
          setPhase("guest_idle");
          pollAbortRef.current?.abort();
          pc.close();
        } else if (pc.iceConnectionState === "disconnected") {
          try { pc.restartIce(); } catch { /* not supported on this browser */ }
          disconnectTimer = setTimeout(() => {
            if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
              setError("Verbinding verloren — probeer opnieuw.");
              setPhase("guest_idle");
              pollAbortRef.current?.abort();
              pc.close();
            }
          }, 6000);
        } else {
          clearTimeout(disconnectTimer);
        }
      };
      let channelResolve!: (ch: RTCDataChannel) => void;
      const channelPromise = new Promise<RTCDataChannel>(resolve => { channelResolve = resolve; });
      pc.ondatachannel = (event) => channelResolve(event.channel);
      await pc.setRemoteDescription({ type: "offer", sdp: offerSdp });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log("[guest] local description set, gathering ICE...");
      await Promise.race([
        waitForIceGathering(pc, 8000),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Verbinding mislukt — zelfde WiFi proberen of opnieuw.")), 15000)
        ),
      ]);
      log("[guest] ICE na timeout: " + iceCandSummary(guestCandTypes));
      log("[guest] answer posten...");
      await postAnswer(codeInput, pc.localDescription!.sdp);
      console.log("[guest] answer posted, waiting for data channel");
      const ch = await channelPromise;
      console.log("[guest] data channel open");
      setupChannel(ch, profile);
    } catch (err) {
      console.error("[guest] error:", err);
      setError(String(err));
      setPhase("guest_idle");
    }
  }

  function handleStatusChange(kinkId: string, status: KinkStatus) {
    setLocal(current => ({
      ...current,
      [kinkId]: {
        status,
        ...(current[kinkId]?.privateResponse ? { privateResponse: true } : {}),
      },
    }));
    send({ t: "a", id: kinkId });
  }

  function handlePrivateChange(kinkId: string) {
    setLocal(current => ({
      ...current,
      [kinkId]: {
        status: statusOf(current[kinkId]),
        ...(!current[kinkId]?.privateResponse ? { privateResponse: true } : {}),
      },
    }));
    send({ t: "a", id: kinkId });
  }

  function handleDone() {
    const entries: Record<string, KinkStatus> = {};
    const privateEntries: Record<string, KinkStatus> = {};
    for (const [kinkId, response] of Object.entries(local)) {
      if (!response.status) continue;
      if (response.privateResponse) privateEntries[kinkId] = response.status;
      else entries[kinkId] = response.status;
    }
    send({
      t: "d",
      entries,
      ...(Object.keys(privateEntries).length ? { privateEntries } : {}),
    });
    setPhase("done_local");
  }

  function handleImportPartner() {
    if (!remoteProfile || importDone) return;
    if (Object.keys(remote).length === 0) return;
    const partner = buildPartnerProfile(remoteProfileFull, remoteProfile, remote);
    const exists = profiles.some(p => p.id === partner.id);
    if (!exists) importProfiles([partner]);
    setImportDone(exists ? "exists" : "saved");
    setTimeout(() => router.replace("/"), 1400);
  }

  function toggleCat(cat: string) {
    setOpenCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  }

  function revealPrivate(kinkId: string) {
    setPrivacyRevealedIds(current => new Set(current).add(kinkId));
  }

  function concealPrivate(kinkId: string) {
    setPrivacyRevealedIds(current => {
      const next = new Set(current);
      next.delete(kinkId);
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
    const timer = setInterval(() => setGatheringElapsed(seconds => seconds + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => () => {
    pcRef.current?.close();
    pollAbortRef.current?.abort();
    clearTimeout(partnerActiveTimerRef.current);
    clearTimeout(partnerShimmerTimerRef.current);
    clearTimeout(partnerTapTimerRef.current);
    clearInterval(heartbeatRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "revealed" || Object.keys(remote).length === 0) return;
    revealCancelRef.current = false;
    revealedRef.current = new Set();

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const allIds = Object.keys(remote).filter(id => statusOf(remote[id]));
    const matchIds = new Set(allIds.filter(id => {
      const mine = local[id];
      const theirs = remote[id];
      return !mine?.privateResponse
        && !theirs?.privateResponse
        && isEnthusiastic(statusOf(mine))
        && isEnthusiastic(statusOf(theirs));
    }));

    if (reducedMotion) {
      revealedRef.current = new Set(allIds);
      setRevealedIds(new Set(allIds));
      if (matchIds.size === 0) setShowZeroState(true);
      return;
    }

    // Groups follow DOM order (by CATEGORIES) so scroll stays coherent
    const groups = CATEGORIES
      .map(cat => ({ cat, ids: getKinksByCategory(cat).map(k => k.id).filter(id => statusOf(remote[id])) }))
      .filter(group => group.ids.length > 0);

    const allTimeouts: ReturnType<typeof setTimeout>[] = [];
    const observers: IntersectionObserver[] = [];

    function wait(ms: number): Promise<void> {
      return new Promise(resolve => { const timer = setTimeout(resolve, ms); allTimeouts.push(timer); });
    }

    function waitVisible(el: Element): Promise<void> {
      return new Promise(resolve => {
        if (revealCancelRef.current) { resolve(); return; }
        // Auto-advance after 6s so a category never stays permanently hidden
        const fallback = setTimeout(resolve, 6000);
        allTimeouts.push(fallback);
        const observer = new IntersectionObserver(entries => {
          if (entries[0].isIntersecting) { clearTimeout(fallback); observer.disconnect(); resolve(); }
        }, { threshold: 0.15 });
        observer.observe(el);
        observers.push(observer);
      });
    }

    async function revealGroup(cat: string, ids: string[]) {
      document.querySelector(`[data-category="${cat}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      await wait(350);
      for (const id of ids) {
        if (revealCancelRef.current) return;
        // Direct DOM toggle instead of per-kink setState — avoids 240+ re-renders
        revealedRef.current.add(id);
        document.querySelectorAll(`[data-kink-id="${id}"]`).forEach(element => {
          element.classList.remove("partner-hidden");
          element.classList.add("partner-reveal");
        });
        if (matchIds.has(id)) {
          const timer = setTimeout(() => {
            document.querySelectorAll(`[data-kink-id="${id}"]`).forEach(element => element.classList.add("match-pulse"));
          }, 220);
          allTimeouts.push(timer);
        }
        await wait(75);
      }
    }

    (async () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      await wait(450);

      for (const [index, { cat, ids }] of groups.entries()) {
        if (revealCancelRef.current) return;
        if (index > 0) {
          const element = document.querySelector(`[data-category="${cat}"]`);
          if (element) await waitVisible(element);
          if (revealCancelRef.current) return;
        }
        await revealGroup(cat, ids);
      }

      // Settle React state once so a later re-render keeps everything revealed
      setRevealedIds(new Set(revealedRef.current));
      if (matchIds.size === 0 && !revealCancelRef.current) setShowZeroState(true);
    })().catch(console.error);

    return () => {
      revealCancelRef.current = true;
      allTimeouts.forEach(clearTimeout);
      observers.forEach(observer => observer.disconnect());
    };
  }, [phase, remote, local]);

  if (!_hasHydrated) return <PageShell loading width="lg" flush />;

  const allIds = [...new Set([...Object.keys(local), ...Object.keys(remote)])];
  let matchCount = 0, hardCount = 0;
  const matched: string[] = [];
  for (const id of allIds) {
    const mine = local[id];
    const theirs = remote[id];
    if (theirs?.privateResponse && !privacyRevealedIds.has(id)) continue;
    const myStatus = statusOf(mine);
    const theirStatus = statusOf(theirs);
    if (myStatus === "hard_no" || theirStatus === "hard_no") { hardCount++; continue; }
    if (isEnthusiastic(myStatus) && isEnthusiastic(theirStatus)) { matchCount++; matched.push(id); }
  }

  const spinner = (msg: string) => (
    <div className="text-center py-16">
      <SpinnerGap size={36} className="mx-auto mb-4 animate-spin" aria-hidden="true" style={{ color: "var(--accent)" }} />
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
      style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
      {label}
    </button>
  );

  const profilePicker = () => (
    <>
      <p className="text-xs mb-1.5 font-medium" style={{ color: "var(--text2)" }}>Jouw profiel</p>
      <select value={profileId} onChange={event => setProfileId(event.target.value)}
        className="ks-select focus-ring w-full rounded-lg px-3 py-2.5 text-base mb-4 focus:outline-none"
        style={{ backgroundColor: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>
        {profiles.map(item => <option key={item.id} value={item.id}>{item.name} — {item.role}</option>)}
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
    <main style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100dvh" }} className="max-w-lg lg:max-w-3xl mx-auto px-4 py-6">
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
          className="focus-ring text-sm min-h-[44px] px-3 inline-flex items-center"
          style={{ color: "var(--text2)" }}
        >
          <ArrowLeft size={15} aria-hidden="true" className="mr-1" />
          Terug
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
            <span className="inline-flex items-center gap-1.5 font-semibold align-middle" style={{ color: "var(--text)" }}><Lock size={13} aria-hidden="true" /> End-to-end versleuteld — </span>
            ook wij kunnen niet meelezen. Je toestel regelt via onze server een verbinding met dat van je partner; daarna gaat alles direct tussen jullie twee. Je kinks en naam verlaten je toestel nooit.
          </div>
          <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-3">
            <button
              onClick={() => setPhase("host_idle")}
              className="focus-ring w-full text-left px-4 py-4 rounded-2xl transition-opacity hover:opacity-90 lg:h-full"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <Broadcast size={22} aria-hidden="true" className="mb-1.5" style={{ color: "var(--accent)" }} />
              <div className="text-sm font-bold mb-0.5">Sessie aanmaken</div>
              <div className="text-xs" style={{ color: "var(--text2)" }}>Genereer een code en deel die met je partner.</div>
            </button>
            <button
              onClick={() => setPhase("guest_idle")}
              className="focus-ring w-full text-left px-4 py-4 rounded-2xl transition-opacity hover:opacity-90 lg:h-full"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <Key size={22} aria-hidden="true" className="mb-1.5" style={{ color: "var(--accent)" }} />
              <div className="text-sm font-bold mb-0.5">Deelnemen met code</div>
              <div className="text-xs" style={{ color: "var(--text2)" }}>Voer de 6-letterige code in van je partner.</div>
            </button>
          </div>
        </div>
      )}

      {phase === "host_idle" && (
        <div>
          <p className="text-sm mb-5" style={{ color: "var(--text2)" }}>
            Start een live sessie — jij genereert een code, je partner typt die in. Verbinding loopt via een beveiligde relay en daarna direct apparaat-tot-apparaat.
          </p>
          {profilePicker()}
          {accentBtn("Sessie starten", handleStartHost, !profile)}
          {error && <p className="text-xs mt-3" style={{ color: "var(--hard-no)" }}>{error}</p>}
          {debugLog.length > 0 && (
            <div className="mt-3 rounded-xl p-3 text-left" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              {debugLog.map((line, index) => (
                <p key={index} className="font-mono text-[10px] leading-5 break-all" style={{ color: line.includes("GEEN") ? "var(--maybe)" : "var(--text2)" }}>{line}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {phase === "host_gathering" && spinner("Verbinding voorbereiden… (TURN ophalen → ICE → offer posten)")}

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
          <button onClick={() => { pollAbortRef.current?.abort(); setPhase("host_idle"); setRevealedIds(new Set()); setPrivacyRevealedIds(new Set()); setShowZeroState(false); }}
            className="focus-ring w-full py-2.5 rounded-xl text-sm border transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
            Annuleer
          </button>
          {error && <p className="text-xs mt-3" style={{ color: "var(--hard-no)" }}>{error}</p>}
          {debugLog.length > 0 && (
            <div className="mt-3 rounded-xl p-3 text-left" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              {debugLog.map((line, index) => (
                <p key={index} className="font-mono text-[10px] leading-5 break-all" style={{ color: line.includes("GEEN") ? "var(--maybe)" : "var(--text2)" }}>{line}</p>
              ))}
            </div>
          )}
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
            onChange={event => setCodeInput(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
            placeholder="Bijv. H7K2PQ"
            maxLength={6}
            className="focus-ring w-full rounded-lg px-3 py-2.5 text-center text-2xl font-mono font-bold mb-4 tracking-widest focus:outline-none"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--accent)" }}
          />
          {accentBtn("Verbinden", handleStartGuest, !profile || codeInput.length !== 6)}
          {error && <p className="text-xs mt-3" style={{ color: "var(--hard-no)" }}>{error}</p>}
          {debugLog.length > 0 && (
            <div className="mt-3 rounded-xl p-3 text-left" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              {debugLog.map((line, index) => (
                <p key={index} className="font-mono text-[10px] leading-5 break-all" style={{ color: line.includes("GEEN") ? "var(--maybe)" : "var(--text2)" }}>{line}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {phase === "guest_gathering" && spinner("Antwoord voorbereiden… (TURN ophalen → ICE → answer posten)")}

      {phase === "connected" && (
        <div>
          <div className="sticky top-0 z-10 pt-2 pb-3 mb-4 flex items-center gap-3" style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">
                <span style={{ color: "var(--accent)" }}>{profile?.name}</span>
                <span style={{ color: "var(--text2)" }}> vs </span>
                <span style={{ color: "var(--text)" }}>{partnerName}</span><span className="transition-opacity duration-200" style={{ opacity: partnerActive ? 1 : 0, color: "var(--text2)" }}> is aan het invullen…</span>
              </div>
              <div className="text-xs mt-0.5 truncate" style={{ color: "var(--text2)" }}>
                {profile?.role}{remoteProfile ? ` · ${remoteProfile.role}` : ""}
              </div>
            </div>
            <div className="w-2 h-2 rounded-full flex-none animate-pulse" style={{ background: "var(--yes)" }} />
            <span className="text-xs font-medium flex-none" style={{ color: "var(--yes)" }}>Live</span>
          </div>

          <div className="mb-24">
            {CATEGORIES.map(cat => {
              const kinks = getKinksByCategory(cat);
              const myCount = kinks.filter(kink => statusOf(local[kink.id])).length;
              const theirCount = kinks.filter(kink => statusOf(remote[kink.id]) && remote[kink.id]?.privateResponse !== true).length;
              const isOpen = openCats.has(cat);
              return (
                <div key={cat} className="mb-2">
                  <button onClick={() => toggleCat(cat)}
                    className="focus-ring w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", borderLeft: `4px solid ${isOpen ? "var(--accent)" : "transparent"}` }}>
                    <span className="text-sm font-semibold flex-1">{cat}</span>
                    {myCount > 0 && <span className="text-xs" style={{ color: "var(--accent)" }}>jij: {myCount}</span>}
                    {theirCount > 0 && <span className="text-xs" style={{ color: "var(--text2)" }}>partner: {theirCount}</span>}
                    <span className="text-xs" style={{ color: "var(--text2)" }}>{isOpen ? "▲" : "▼"}</span>
                  </button>

                  {isOpen && (
                    <div className="mt-1 pl-1">
                      {kinks.map(kink => {
                        const myResponse = local[kink.id];
                        const theirResponse = remote[kink.id];
                        const myStatus = statusOf(myResponse);
                        const theirStatus = statusOf(theirResponse);
                        return (
                          <div key={kink.id} className={`rounded-xl mb-1 px-3 py-2${partnerTappedId === kink.id ? " partner-card-tap" : ""}`}
                            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderLeft: `3px solid ${myStatus ? STATUS_VAR[myStatus] : "transparent"}` }}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-sm font-medium flex-1 leading-snug">{kink.name}</span>
                              <button
                                type="button"
                                onClick={() => handlePrivateChange(kink.id)}
                                disabled={!myStatus}
                                aria-pressed={!!myResponse?.privateResponse}
                                aria-label={myResponse?.privateResponse ? `${kink.name} niet langer privé maken` : `${kink.name} privé maken`}
                                className="focus-ring w-7 h-7 inline-flex items-center justify-center rounded-lg border disabled:opacity-30"
                                style={{ color: myResponse?.privateResponse ? "var(--accent)" : "var(--text2)", borderColor: "var(--border)" }}
                              >
                                {myResponse?.privateResponse
                                  ? <EyeSlash size={13} weight="bold" aria-hidden="true" />
                                  : <Eye size={13} aria-hidden="true" />}
                              </button>
                              {theirStatus && theirResponse?.privateResponse ? (
                                <span
                                  className="text-[11px] px-1.5 py-0.5 rounded border flex-none inline-flex items-center gap-1"
                                  style={{ color: "var(--text2)", borderColor: "var(--border)", background: "var(--tag-muted)" }}
                                >
                                  <EyeSlash size={9} aria-hidden="true" />
                                  Privé
                                </span>
                              ) : theirStatus ? (
                                <span className={`text-[11px] px-1.5 py-0.5 rounded border flex-none partner-hidden${partnerShimmer ? " partner-shimmer" : ""}`}
                                  style={{ color: STATUS_VAR[theirStatus], borderColor: `color-mix(in srgb, ${STATUS_VAR[theirStatus]} 35%, transparent)`, background: `color-mix(in srgb, ${STATUS_VAR[theirStatus]} 15%, transparent)` }}>
                                  {STATUS_LABEL[theirStatus]}
                                </span>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {PILLS.map(({ s, label }) => (
                                <button key={s}
                                  onClick={() => phase === "connected" && handleStatusChange(kink.id, myStatus === s ? null : s)}
                                  disabled={phase !== "connected"}
                                  aria-pressed={myStatus === s}
                                  className={`focus-ring rounded-full border text-xs px-2.5 py-2.5 transition-colors disabled:opacity-50${myStatus === s ? ` status-${s}` : ""}`}
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
              <span className="inline-flex items-center justify-center gap-1.5"><Lock size={16} aria-hidden="true" />Sluit af &amp; onthul matches</span>
            </button>
          </div>
        </div>
      )}

      {phase === "done_local" && !partnerDone && (
        <div className="ks-fade-in flex flex-col items-center justify-center gap-4 text-center" style={{ minHeight: "60vh" }}>
          <Lock size={36} className="ks-icon-pop animate-pulse" aria-hidden="true" style={{ color: "var(--accent)" }} />
          <div className="text-base" style={{ color: "var(--text)" }}>
            <span>{partnerName}</span>
            <span className="transition-opacity duration-200" style={{ opacity: partnerActive ? 1 : 0, color: "var(--text2)" }}> is aan het invullen…</span>
          </div>
          <div className="ks-dot-pulse flex gap-1">
            <span /><span /><span />
          </div>
          <p className="text-sm" style={{ color: "var(--text2)", maxWidth: "36ch" }}>
            Zodra je partner klaar is, worden jullie antwoorden onthuld. Privéantwoorden blijven dicht tot je erop tikt.
          </p>
        </div>
      )}

      {phase === "revealed" && (
        <div>
          <div className="text-center mb-8">
            <Heart size={48} weight="fill" className="mx-auto mb-3" aria-hidden="true" style={{ color: "var(--accent)" }} />
            <h2 className="text-3xl font-bold mb-1">{matchCount} matches</h2>
            <p className="text-sm" style={{ color: "var(--text2)" }}>
              {hardCount > 0 && `${hardCount} harde grens${hardCount !== 1 ? "en" : ""} · `}
              {profile?.name} &amp; <span style={{ color: "var(--text)" }}>{partnerName}</span><span className="transition-opacity duration-200" style={{ opacity: partnerActive ? 1 : 0, color: "var(--text2)" }}> is aan het invullen…</span>
            </p>
          </div>

          {CATEGORIES.map(cat => {
            const kinks = getKinksByCategory(cat).filter(kink => statusOf(remote[kink.id]));
            if (kinks.length === 0) return null;
            return (
              <div key={cat} className="mb-4">
                <div
                  data-category={cat}
                  className="text-xs uppercase tracking-widest font-bold mb-2 px-1"
                  style={{ color: "var(--accent)" }}
                >
                  {cat}
                </div>
                {kinks.map(kink => {
                  const theatricalReveal = revealedIds.has(kink.id) || revealedRef.current.has(kink.id);
                  const remoteResponse = remote[kink.id];
                  const remoteStatus = statusOf(remoteResponse)!;
                  const privateConcealed = remoteResponse.privateResponse && !privacyRevealedIds.has(kink.id);
                  const rowMatch = !privateConcealed
                    && isEnthusiastic(statusOf(local[kink.id]))
                    && isEnthusiastic(remoteStatus);
                  return (
                    <div
                      key={kink.id}
                      data-kink-id={kink.id}
                      className={`rounded-xl px-3 py-2.5 mb-1.5 flex items-center gap-2${theatricalReveal ? " partner-reveal" : " partner-hidden"}`}
                      style={{
                        background: "var(--surface)",
                        border: `1px solid ${rowMatch ? "var(--yes)" : "var(--border)"}`,
                      }}
                    >
                      <span className="text-sm font-medium flex-1">{kink.name}</span>
                      {remoteResponse.privateResponse ? (
                        <PrivateResponseStatus
                          status={remoteStatus}
                          privateResponse
                          concealed={!!privateConcealed}
                          subject={`${partnerName} bij ${kink.name}`}
                          onReveal={() => revealPrivate(kink.id)}
                          onConceal={() => concealPrivate(kink.id)}
                          compact
                        />
                      ) : rowMatch ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: "var(--yes)" }}><Check size={12} aria-hidden="true" />Match</span>
                      ) : (
                        <PrivateResponseStatus
                          status={remoteStatus}
                          subject={`${partnerName} bij ${kink.name}`}
                          compact
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {showZeroState && (
            <div className="ks-fade-in text-center my-6 p-8 rounded-xl" style={{ background: "var(--surface)", boxShadow: "0 4px 12px var(--scrim)" }}>
              <Heart size={36} weight="fill" className="ks-icon-pop mx-auto mb-3" aria-hidden="true" style={{ color: "var(--accent)" }} />
              <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text)" }}>Geen zichtbare matches — en dat is oké.</h3>
              <p className="text-sm mx-auto" style={{ color: "var(--text2)", maxWidth: "36ch" }}>
                Privéantwoorden tellen pas mee nadat je ze bewust opent.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2 mb-3">
            <SessionImportAction status={importDone} onImport={handleImportPartner} />
            <Link href={`/compare?a=${profileId}`}
              className="focus-ring flex w-full items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold text-center transition-opacity hover:opacity-90"
              style={{ background: "var(--surface)", border: "1px solid var(--accent)", color: "var(--accent)" }}>
              Vergelijk uitgebreid <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link href={`/contract?a=${profileId}`}
              className="focus-ring inline-flex w-full items-center justify-center gap-1.5 py-3 rounded-xl text-center transition-opacity hover:opacity-90"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--accent)",
                color: "var(--accent)",
                fontFamily: "var(--font-display, Georgia, serif)",
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: "1.05rem",
              }}>
              Maak een contract <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <Link href="/"
            className="focus-ring inline-flex w-full items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold text-center"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
            <ArrowLeft size={15} aria-hidden="true" /> Terug naar home
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
