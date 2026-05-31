export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  {
    urls: "turn:turn.cloudflare.com:3478",
    username: process.env.NEXT_PUBLIC_TURN_USER!,
    credential: process.env.NEXT_PUBLIC_TURN_PASS!,
  },
];

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
  await fetch(`${RELAY}/${code}/offer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ offer: sdp }),
  });
}

export async function getOffer(code: string): Promise<string | null> {
  const r = await fetch(`${RELAY}/${code}/offer`);
  if (!r.ok) return null;
  const data = await r.json() as { offer?: string };
  return data.offer ?? null;
}

export async function postAnswer(code: string, sdp: string): Promise<void> {
  await fetch(`${RELAY}/${code}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answer: sdp }),
  });
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
