import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { encodeSdp, decodeSdp, waitForIceGathering, fetchIceServers } from "@/lib/webrtc";

// ---------------------------------------------------------------------------
// encodeSdp / decodeSdp
// ---------------------------------------------------------------------------
describe("encodeSdp / decodeSdp", () => {
  it("round-trips an arbitrary SDP string", () => {
    const sdp = "v=0\r\no=- 123 456 IN IP4 0.0.0.0\r\ns=-\r\nt=0 0\r\n";
    expect(decodeSdp(encodeSdp(sdp))).toBe(sdp);
  });

  it("round-trips a string with special characters", () => {
    const sdp = "a=candidate:0 1 UDP 2122252543 192.168.1.1 50000 typ host";
    expect(decodeSdp(encodeSdp(sdp))).toBe(sdp);
  });
});

// ---------------------------------------------------------------------------
// fetchIceServers
// ---------------------------------------------------------------------------
describe("fetchIceServers", () => {
  it("falls back to STUN-only when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const servers = await fetchIceServers();
    const hasStun = servers.some((s) => {
      const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
      return urls.some((u) => u.startsWith("stun:"));
    });
    expect(hasStun).toBe(true);
    vi.unstubAllGlobals();
  });

  it("falls back to STUN-only when response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const servers = await fetchIceServers();
    expect(servers).toHaveLength(1);
    vi.unstubAllGlobals();
  });

  it("returns iceServers from a successful response", async () => {
    const mockServers = [{ urls: "turn:example.com:3478", username: "u", credential: "p" }];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ iceServers: mockServers }),
    }));
    const servers = await fetchIceServers();
    expect(servers).toEqual(mockServers);
    vi.unstubAllGlobals();
  });
});

// ---------------------------------------------------------------------------
// waitForIceGathering
// ---------------------------------------------------------------------------
function makeMockPc(initialState: RTCIceGatheringState = "new") {
  let state = initialState;
  const listeners: Array<() => void> = [];
  return {
    get iceGatheringState(): RTCIceGatheringState { return state; },
    addEventListener(_: string, fn: () => void) { listeners.push(fn); },
    removeEventListener(_: string, fn: () => void) {
      const i = listeners.indexOf(fn);
      if (i !== -1) listeners.splice(i, 1);
    },
    _complete() {
      state = "complete";
      listeners.slice().forEach((fn) => fn());
    },
    _listenerCount() { return listeners.length; },
  };
}

describe("waitForIceGathering", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("resolves immediately when already complete", async () => {
    const pc = makeMockPc("complete");
    await expect(
      waitForIceGathering(pc as unknown as RTCPeerConnection)
    ).resolves.toBeUndefined();
  });

  it("resolves when ICE gathering completes via event", async () => {
    const pc = makeMockPc("gathering");
    const promise = waitForIceGathering(pc as unknown as RTCPeerConnection, 5000);
    pc._complete();
    await expect(promise).resolves.toBeUndefined();
  });

  it("resolves after timeout even when ICE never completes", async () => {
    const pc = makeMockPc("gathering");
    const promise = waitForIceGathering(pc as unknown as RTCPeerConnection, 3000);
    vi.advanceTimersByTime(3000);
    await expect(promise).resolves.toBeUndefined();
  });

  it("removes event listener on successful completion", async () => {
    const pc = makeMockPc("gathering");
    const promise = waitForIceGathering(pc as unknown as RTCPeerConnection, 5000);
    pc._complete();
    await promise;
    expect(pc._listenerCount()).toBe(0);
  });

  it("removes event listener on timeout", async () => {
    const pc = makeMockPc("gathering");
    const promise = waitForIceGathering(pc as unknown as RTCPeerConnection, 3000);
    vi.advanceTimersByTime(3000);
    await promise.catch(() => {});
    expect(pc._listenerCount()).toBe(0);
  });
});
