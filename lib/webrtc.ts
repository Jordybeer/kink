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

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handler = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", handler);
        if (timeoutId !== null) clearTimeout(timeoutId);
        resolve();
      }
    };

    pc.addEventListener("icegatheringstatechange", handler);

    timeoutId = setTimeout(() => {
      pc.removeEventListener("icegatheringstatechange", handler);
      reject(new Error("ICE gathering timed out"));
    }, timeoutMs);
  });
}
