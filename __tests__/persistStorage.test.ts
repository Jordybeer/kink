import { describe, it, expect, vi } from "vitest";
import { createQuotaSafeStorage, isQuotaError, STORAGE_FULL_EVENT } from "@/lib/persistStorage";

// Een volle kluis mocht nooit stil zijn. Zonder de wrapper vloog
// QuotaExceededError dwars door de store-actie heen en verdween het laatste
// antwoord zonder een woord. Deze tests spelen die volle kluis na.

function quotaError(): DOMException {
  const err = new DOMException("quota", "QuotaExceededError");
  return err;
}

function fakeStorage(overrides: Partial<Storage> = {}): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    ...overrides,
  } as Storage;
}

describe("isQuotaError", () => {
  it("herkent de naam die Chrome en Safari gebruiken", () => {
    expect(isQuotaError(quotaError())).toBe(true);
  });

  it("herkent de Firefox-variant", () => {
    expect(isQuotaError(new DOMException("vol", "NS_ERROR_DOM_QUOTA_REACHED"))).toBe(true);
  });

  it("houdt gewone fouten erbuiten", () => {
    expect(isQuotaError(new Error("iets anders"))).toBe(false);
    expect(isQuotaError("geen error")).toBe(false);
  });
});

describe("createQuotaSafeStorage", () => {
  it("schrijft en leest gewoon door wanneer er ruimte is", () => {
    const backing = fakeStorage();
    const storage = createQuotaSafeStorage(() => backing, () => {});

    storage.setItem("kink-profiles", "{\"state\":1}");

    expect(storage.getItem("kink-profiles")).toBe("{\"state\":1}");
  });

  it("laat een volle kluis de lopende interactie niet omgooien", () => {
    const backing = fakeStorage({ setItem: () => { throw quotaError(); } });
    const storage = createQuotaSafeStorage(() => backing, () => {});

    // Vóór de wrapper wierp dit en sneuvelde de hele store-actie.
    expect(() => storage.setItem("kink-profiles", "te groot")).not.toThrow();
  });

  it("roept één keer om hulp wanneer de kluis vol zit", () => {
    const onQuota = vi.fn();
    const backing = fakeStorage({ setItem: () => { throw quotaError(); } });
    const storage = createQuotaSafeStorage(() => backing, onQuota);

    storage.setItem("kink-profiles", "te groot");

    expect(onQuota).toHaveBeenCalledTimes(1);
  });

  it("laat de vorige goede staat staan wanneer de nieuwe niet past", () => {
    const map = new Map<string, string>([["kink-profiles", "oude-goede-staat"]]);
    const backing = fakeStorage({
      getItem: (k: string) => map.get(k) ?? null,
      setItem: () => { throw quotaError(); },
    });
    const storage = createQuotaSafeStorage(() => backing, () => {});

    storage.setItem("kink-profiles", "nieuwe-staat");

    expect(storage.getItem("kink-profiles")).toBe("oude-goede-staat");
  });

  it("meldt ook een geweigerde opslag, bijvoorbeeld in private mode", () => {
    const onQuota = vi.fn();
    const backing = fakeStorage({ setItem: () => { throw new Error("opslag uit"); } });
    const storage = createQuotaSafeStorage(() => backing, onQuota);

    expect(() => storage.setItem("kink-profiles", "wat dan ook")).not.toThrow();
    expect(onQuota).toHaveBeenCalledTimes(1);
  });

  it("overleeft een onleesbare kluis bij het opstarten", () => {
    const backing = fakeStorage({ getItem: () => { throw new Error("geblokkeerd"); } });
    const storage = createQuotaSafeStorage(() => backing, () => {});

    expect(storage.getItem("kink-profiles")).toBeNull();
  });

  it("laat removeItem nooit ontploffen", () => {
    const backing = fakeStorage({ removeItem: () => { throw new Error("nee"); } });
    const storage = createQuotaSafeStorage(() => backing, () => {});

    expect(() => storage.removeItem("kink-profiles")).not.toThrow();
  });

  it("doet niets zonder backing store, zoals tijdens SSR", () => {
    const storage = createQuotaSafeStorage(() => undefined, () => {});

    expect(storage.getItem("kink-profiles")).toBeNull();
    expect(() => storage.setItem("kink-profiles", "x")).not.toThrow();
  });

  it("draagt de eventnaam die de UI beluistert", () => {
    expect(STORAGE_FULL_EVENT).toBe("ks:storage-full");
  });
});
