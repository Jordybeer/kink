const STUN_ONLY: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export async function fetchIceServers(): Promise<RTCIceServer[]> {
  try {
    const r = await fetch("/api/turn", { method: "POST" });
    if (!r.ok) return STUN_ONLY;
    const data = await r.json() as { iceServers?: RTCIceServer[] };
    return data.iceServers ?? STUN_ONLY;
  } catch {
    return STUN_ONLY;
  }
}

export function encodeSdp(sdp: string): string {
  return btoa(unescape(encodeURIComponent(sdp)));
}

export function decodeSdp(enc: string): string {
  return decodeURIComponent(escape(atob(enc)));
}

const RELAY = "/api/relay";

export function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function postOffer(code: string, sdp: string): Promise<void> {
  const r = await fetch(`${RELAY}/${code}/offer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ offer: sdp }),
  });
  if (!r.ok) throw new Error(`Sessie aanmaken mislukt (${r.status}) — probeer opnieuw.`);
}

export async function getOffer(code: string, retries = 4, delayMs = 800): Promise<string | null> {
  for (let i = 0; i <= retries; i++) {
    const r = await fetch(`${RELAY}/${code}/offer`);
    if (r.ok) {
      const data = await r.json() as { offer?: string };
      if (data.offer) return data.offer;
    }
    if (i < retries) await new Promise(res => setTimeout(res, delayMs));
  }
  return null;
}

export async function postAnswer(code: string, sdp: string): Promise<void> {
  const r = await fetch(`${RELAY}/${code}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answer: sdp }),
  });
  if (!r.ok) throw new Error(`Verbinden mislukt (${r.status}) — probeer opnieuw.`);
}

export async function pollAnswer(
  code: string,
  onAnswer: (sdp: string) => void,
  signal: AbortSignal
): Promise<void> {
  while (!signal.aborted) {
    try {
      const r = await fetch(`${RELAY}/${code}/answer`, { signal });
      if (r.ok) {
        const data = await r.json() as { answer?: string };
        if (data.answer) { onAnswer(data.answer); return; }
      }
    } catch { /* aborted or transient */ }
    if (!signal.aborted) await new Promise(res => setTimeout(res, 2000));
  }
}

export function waitForIceGathering(pc: RTCPeerConnection, timeoutMs = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (pc.iceGatheringState === "complete") { resolve(); return; }
    // eslint-disable-next-line prefer-const
    let timer: ReturnType<typeof setTimeout>;
    function handler() {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timer);
        pc.removeEventListener("icegatheringstatechange", handler);
        resolve();
      }
    }
    pc.addEventListener("icegatheringstatechange", handler);
    timer = setTimeout(() => {
      pc.removeEventListener("icegatheringstatechange", handler);
      resolve(); // proceed with whatever candidates gathered so far
    }, timeoutMs);
  });
}
