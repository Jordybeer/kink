import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { BeforeInstallPromptEvent } from "@/lib/installPrompt";

// The lib/installPrompt module uses a module-level singleton (_deferred).
// We reset modules before each test and stub window so the module starts fresh
// and can access window.__installPrompt safely.

type PromptModule = {
  getInstallPrompt: () => BeforeInstallPromptEvent | null;
  setInstallPrompt: (e: BeforeInstallPromptEvent) => void;
  clearInstallPrompt: () => void;
};

async function freshModule(): Promise<PromptModule> {
  vi.resetModules();
  return import("@/lib/installPrompt") as Promise<PromptModule>;
}

function makeFakePrompt(): BeforeInstallPromptEvent {
  return {
    type: "beforeinstallprompt",
    prompt: vi.fn<[], Promise<void>>().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome: "accepted" as const, platform: "web" }),
    preventDefault: vi.fn(),
    // minimal Event stubs
    bubbles: false,
    cancelable: true,
    cancelBubble: false,
    composed: false,
    currentTarget: null,
    defaultPrevented: false,
    eventPhase: 0,
    isTrusted: true,
    returnValue: true,
    srcElement: null,
    target: null,
    timeStamp: 0,
    composedPath: () => [],
    initEvent: vi.fn(),
    stopImmediatePropagation: vi.fn(),
    stopPropagation: vi.fn(),
    AT_TARGET: 2,
    BUBBLING_PHASE: 3,
    CAPTURING_PHASE: 1,
    NONE: 0,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as BeforeInstallPromptEvent;
}

beforeEach(() => {
  // Give node env a minimal window object so the module can read/write __installPrompt.
  vi.stubGlobal("window", { __installPrompt: undefined });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getInstallPrompt", () => {
  it("returns null when nothing has been set", async () => {
    const { getInstallPrompt } = await freshModule();
    expect(getInstallPrompt()).toBeNull();
  });

  it("returns the prompt previously stored via setInstallPrompt", async () => {
    const { getInstallPrompt, setInstallPrompt } = await freshModule();
    const prompt = makeFakePrompt();
    setInstallPrompt(prompt);
    expect(getInstallPrompt()).toBe(prompt);
  });

  it("reads prompt from window.__installPrompt when module-level cache is empty", async () => {
    const prompt = makeFakePrompt();
    // Simulate the inline <script> storing the prompt on window before the module loads.
    (globalThis.window as Record<string, unknown>).__installPrompt = prompt;

    const { getInstallPrompt } = await freshModule();
    // _deferred starts null — getInstallPrompt should fall back to window.__installPrompt.
    expect(getInstallPrompt()).toBe(prompt);
  });

  it("caches the window prompt into the module-level singleton on first access", async () => {
    const prompt = makeFakePrompt();
    (globalThis.window as Record<string, unknown>).__installPrompt = prompt;

    const { getInstallPrompt } = await freshModule();
    getInstallPrompt(); // first call caches it

    // Remove it from window — subsequent calls should still return the cached value.
    delete (globalThis.window as Record<string, unknown>).__installPrompt;
    expect(getInstallPrompt()).toBe(prompt);
  });
});

describe("setInstallPrompt", () => {
  it("makes the prompt retrievable via getInstallPrompt", async () => {
    const { getInstallPrompt, setInstallPrompt } = await freshModule();
    const prompt = makeFakePrompt();
    setInstallPrompt(prompt);
    expect(getInstallPrompt()).toBe(prompt);
  });

  it("also writes the prompt to window.__installPrompt", async () => {
    const { setInstallPrompt } = await freshModule();
    const prompt = makeFakePrompt();
    setInstallPrompt(prompt);
    expect((globalThis.window as Record<string, unknown>).__installPrompt).toBe(prompt);
  });

  it("overwrites a previously set prompt", async () => {
    const { getInstallPrompt, setInstallPrompt } = await freshModule();
    const first = makeFakePrompt();
    const second = makeFakePrompt();
    setInstallPrompt(first);
    setInstallPrompt(second);
    expect(getInstallPrompt()).toBe(second);
  });
});

describe("clearInstallPrompt", () => {
  it("makes getInstallPrompt return null after clearing", async () => {
    const { getInstallPrompt, setInstallPrompt, clearInstallPrompt } = await freshModule();
    const prompt = makeFakePrompt();
    setInstallPrompt(prompt);
    clearInstallPrompt();
    expect(getInstallPrompt()).toBeNull();
  });

  it("removes __installPrompt from window", async () => {
    const { setInstallPrompt, clearInstallPrompt } = await freshModule();
    const prompt = makeFakePrompt();
    setInstallPrompt(prompt);
    clearInstallPrompt();
    expect((globalThis.window as Record<string, unknown>).__installPrompt).toBeUndefined();
  });

  it("is a no-op when nothing was set", async () => {
    const { getInstallPrompt, clearInstallPrompt } = await freshModule();
    expect(() => clearInstallPrompt()).not.toThrow();
    expect(getInstallPrompt()).toBeNull();
  });

  it("clears prompt that was loaded from window (not set via setInstallPrompt)", async () => {
    const prompt = makeFakePrompt();
    (globalThis.window as Record<string, unknown>).__installPrompt = prompt;
    const { getInstallPrompt, clearInstallPrompt } = await freshModule();
    // Prime the cache.
    getInstallPrompt();
    clearInstallPrompt();
    expect(getInstallPrompt()).toBeNull();
    expect((globalThis.window as Record<string, unknown>).__installPrompt).toBeUndefined();
  });
});
