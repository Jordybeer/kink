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
