export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
];

export function encodeSdp(sdp: string): string {
  return btoa(unescape(encodeURIComponent(sdp)));
}

export function decodeSdp(enc: string): string {
  return decodeURIComponent(escape(atob(enc)));
}

export function waitForIceGathering(pc: RTCPeerConnection, timeoutMs = 8000): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") { resolve(); return; }
    pc.addEventListener("icegatheringstatechange", function handler() {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", handler);
        resolve();
      }
    });
    setTimeout(resolve, timeoutMs);
  });
}
