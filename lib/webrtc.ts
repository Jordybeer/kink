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
  return new Promise((resolve, reject) => {
    if (pc.iceGatheringState === "complete") { resolve(); return; }
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
      reject(new Error("ICE gathering timed out"));
    }, timeoutMs);
  });
}
