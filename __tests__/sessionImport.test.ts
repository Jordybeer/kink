import { describe, it, expect } from "vitest";
import {
  buildPartnerProfile,
  sanitizeRemoteProfileFull,
  synthesizePartnerId,
} from "@/lib/sessionImport";
import type { KinkStatus } from "@/types";

const ENTRIES: Record<string, KinkStatus> = {
  spanking_hand: "yes",
  flogging: "maybe",
  needle_play: "hard_no",
};

describe("synthesizePartnerId", () => {
  it("is stable across calls with identical input", () => {
    const a = synthesizePartnerId("Mira", "ontvangen", ENTRIES);
    const b = synthesizePartnerId("Mira", "ontvangen", ENTRIES);
    expect(a).toBe(b);
    expect(a).toMatch(/^partner_[0-9a-f]{16}$/);
  });

  it("ignores entry insertion order", () => {
    const reordered: Record<string, KinkStatus> = {
      needle_play: "hard_no",
      spanking_hand: "yes",
      flogging: "maybe",
    };
    expect(synthesizePartnerId("Mira", "ontvangen", ENTRIES))
      .toBe(synthesizePartnerId("Mira", "ontvangen", reordered));
  });

  it("ignores null-status entries", () => {
    const withNull: Record<string, KinkStatus> = { ...ENTRIES, wax_play: null };
    expect(synthesizePartnerId("Mira", "ontvangen", ENTRIES))
      .toBe(synthesizePartnerId("Mira", "ontvangen", withNull));
  });

  it("differs when name, role, or entries change", () => {
    const base = synthesizePartnerId("Mira", "ontvangen", ENTRIES);
    expect(synthesizePartnerId("Maya", "ontvangen", ENTRIES)).not.toBe(base);
    expect(synthesizePartnerId("Mira", "geven", ENTRIES)).not.toBe(base);
    expect(synthesizePartnerId("Mira", "ontvangen", { ...ENTRIES, flogging: "yes" })).not.toBe(base);
  });
});

describe("sanitizeRemoteProfileFull", () => {
  it("accepts a well-formed payload", () => {
    const out = sanitizeRemoteProfileFull({
      t: "P",
      id: "abc",
      n: "Mira",
      r: "ontvangen",
      e: "gevorderd",
      ck: [{ id: "ck_1", name: "Eigen ding" }, { id: "ck_2", name: "Andere" }],
    });
    expect(out).toEqual({
      id: "abc",
      name: "Mira",
      role: "ontvangen",
      experienceLevel: "gevorderd",
      customKinks: [{ id: "ck_1", name: "Eigen ding" }, { id: "ck_2", name: "Andere" }],
    });
  });

  it("drops bogus experienceLevel and customKinks shapes", () => {
    const out = sanitizeRemoteProfileFull({
      id: "abc", n: "Mira", r: "ontvangen",
      e: "demigod", ck: [{ id: "ok", name: "Ja" }, { id: 42, name: "fout" }, "junk"],
    });
    expect(out?.experienceLevel).toBeUndefined();
    expect(out?.customKinks).toEqual([{ id: "ok", name: "Ja" }]);
  });

  it("returns null on missing required fields", () => {
    expect(sanitizeRemoteProfileFull(null)).toBeNull();
    expect(sanitizeRemoteProfileFull({ id: "abc", n: "Mira" })).toBeNull();
    expect(sanitizeRemoteProfileFull({ id: 1, n: "Mira", r: "ontvangen" })).toBeNull();
  });

  it("clamps oversized peer-controlled strings to defensive caps", () => {
    const huge = "x".repeat(10_000);
    const out = sanitizeRemoteProfileFull({ id: huge, n: huge, r: huge });
    expect(out).not.toBeNull();
    expect(out!.id.length).toBeLessThanOrEqual(64);
    expect(out!.name.length).toBeLessThanOrEqual(80);
    expect(out!.role.length).toBeLessThanOrEqual(32);
  });

  it("returns null when trimmed required fields collapse to empty", () => {
    expect(sanitizeRemoteProfileFull({ id: "   ", n: "Mira", r: "ontvangen" })).toBeNull();
    expect(sanitizeRemoteProfileFull({ id: "abc", n: "   ", r: "ontvangen" })).toBeNull();
  });

  it("caps customKinks to 100 entries and clamps long names", () => {
    const longName = "k".repeat(500);
    const overflow = Array.from({ length: 200 }, (_, i) => ({ id: `ck_${i}`, name: longName }));
    const out = sanitizeRemoteProfileFull({ id: "abc", n: "Mira", r: "ontvangen", ck: overflow });
    expect(out?.customKinks).toHaveLength(100);
    expect(out?.customKinks?.every((c) => c.name.length <= 80)).toBe(true);
  });
});

describe("buildPartnerProfile", () => {
  const NOW = 1_750_000_000_000;

  it("uses the full payload's id and metadata when present", () => {
    const partner = buildPartnerProfile(
      { id: "peer-uuid", name: "Mira", role: "ontvangen", experienceLevel: "ervaren", customKinks: [{ id: "ck_1", name: "Eigen" }] },
      { name: "Mira", role: "ontvangen" },
      ENTRIES,
      NOW,
    );
    expect(partner.id).toBe("peer-uuid");
    expect(partner.experienceLevel).toBe("ervaren");
    expect(partner.customKinks).toEqual([{ id: "ck_1", name: "Eigen" }]);
    expect(partner.isImported).toBe(true);
    expect(partner.origin).toBe("shared");
    expect(partner.lockedAt).toBe(NOW);
    expect(partner.createdAt).toBe(NOW);
    expect(partner.updatedAt).toBe(NOW);
  });

  it("falls back to synthesized id + defaults when no full payload arrived", () => {
    const partner = buildPartnerProfile(null, { name: "Mira", role: "ontvangen" }, ENTRIES, NOW);
    expect(partner.id).toMatch(/^partner_[0-9a-f]{16}$/);
    expect(partner.experienceLevel).toBe("beginner");
    expect(partner.customKinks).toEqual([]);
  });

  it("maps remote statuses into KinkEntry shape and skips nulls", () => {
    const partner = buildPartnerProfile(null, { name: "Mira", role: "ontvangen" }, {
      ...ENTRIES,
      wax_play: null,
    }, NOW);
    expect(partner.entries.spanking_hand).toEqual({ status: "yes", comment: "" });
    expect(partner.entries.needle_play).toEqual({ status: "hard_no", comment: "" });
    expect(partner.entries.wax_play).toBeUndefined();
  });

  it("is idempotent under store dedupe for the same peer (fallback path)", () => {
    const a = buildPartnerProfile(null, { name: "Mira", role: "ontvangen" }, ENTRIES, NOW);
    const b = buildPartnerProfile(null, { name: "Mira", role: "ontvangen" }, ENTRIES, NOW + 500);
    expect(a.id).toBe(b.id);
  });
});

// ---------------------------------------------------------------------------
// Additional edge cases
// ---------------------------------------------------------------------------
describe("synthesizePartnerId — additional edge cases", () => {
  it("produces different ids for empty vs non-empty entries", () => {
    const withEntries = synthesizePartnerId("Mira", "ontvangen", ENTRIES);
    const noEntries = synthesizePartnerId("Mira", "ontvangen", {});
    expect(withEntries).not.toBe(noEntries);
  });

  it("produces a valid partner_ prefix id for empty entries", () => {
    const id = synthesizePartnerId("A", "B", {});
    expect(id).toMatch(/^partner_[0-9a-f]{16}$/);
  });

  it("trims leading/trailing whitespace from name and role before fingerprinting", () => {
    const a = synthesizePartnerId("Mira", "ontvangen", ENTRIES);
    const b = synthesizePartnerId("  Mira  ", "  ontvangen  ", ENTRIES);
    expect(a).toBe(b);
  });
});

describe("sanitizeRemoteProfileFull — additional edge cases", () => {
  it("trims whitespace from id, name, and role fields", () => {
    const out = sanitizeRemoteProfileFull({ id: " abc ", n: " Mira ", r: " ontvangen " });
    expect(out?.id).toBe("abc");
    expect(out?.name).toBe("Mira");
    expect(out?.role).toBe("ontvangen");
  });

  it("returns null when r field is whitespace-only", () => {
    expect(sanitizeRemoteProfileFull({ id: "abc", n: "Mira", r: "   " })).toBeNull();
  });

  it("accepts all four valid experienceLevel values", () => {
    for (const level of ["beginner", "gevorderd", "ervaren", "diepgaand"] as const) {
      const out = sanitizeRemoteProfileFull({ id: "abc", n: "Mira", r: "ontvangen", e: level });
      expect(out?.experienceLevel).toBe(level);
    }
  });

  it("omits customKinks field entirely when ck is not present", () => {
    const out = sanitizeRemoteProfileFull({ id: "abc", n: "Mira", r: "ontvangen" });
    expect(out?.customKinks).toBeUndefined();
  });

  it("filters out customKink items whose id or name is empty after clamping", () => {
    const out = sanitizeRemoteProfileFull({
      id: "abc", n: "Mira", r: "ontvangen",
      ck: [
        { id: "", name: "valid name" },
        { id: "valid-id", name: "" },
        { id: "ok", name: "ok" },
      ],
    });
    expect(out?.customKinks).toEqual([{ id: "ok", name: "ok" }]);
  });

  it("handles non-array ck field gracefully (treats as absent)", () => {
    const out = sanitizeRemoteProfileFull({ id: "abc", n: "Mira", r: "ontvangen", ck: "not-an-array" });
    expect(out).not.toBeNull();
    expect(out?.customKinks).toBeUndefined();
  });
});

describe("buildPartnerProfile — additional edge cases", () => {
  const NOW = 1_750_000_000_000;

  it("produces an empty entries object when remote entries are all null", () => {
    const partner = buildPartnerProfile(
      null,
      { name: "Mira", role: "ontvangen" },
      { spanking_hand: null, flogging: null },
      NOW,
    );
    expect(Object.keys(partner.entries)).toHaveLength(0);
  });

  it("produces an empty entries object when remote entries object is empty", () => {
    const partner = buildPartnerProfile(null, { name: "Mira", role: "ontvangen" }, {}, NOW);
    expect(Object.keys(partner.entries)).toHaveLength(0);
  });

  it("entry count in result equals number of non-null remote statuses", () => {
    const partner = buildPartnerProfile(null, { name: "Mira", role: "ontvangen" }, {
      ...ENTRIES,
      wax_play: null,
    }, NOW);
    // ENTRIES has 3 keys, wax_play is null so only 3 should land
    expect(Object.keys(partner.entries)).toHaveLength(3);
  });

  it("all three timestamps equal NOW when NOW is explicit", () => {
    const partner = buildPartnerProfile(null, { name: "Mira", role: "ontvangen" }, {}, NOW);
    expect(partner.createdAt).toBe(NOW);
    expect(partner.updatedAt).toBe(NOW);
    expect(partner.lockedAt).toBe(NOW);
  });
});

// ---------------------------------------------------------------------------
// QRScanner paste-URL extraction contract
// ---------------------------------------------------------------------------
describe("paste-from-URL extraction", () => {
  function extractP(url: string): string | null {
    try {
      return new URL(url).searchParams.get("p");
    } catch {
      return null;
    }
  }

  it("extracts ?p= from a valid share URL", () => {
    expect(extractP("https://kinksync.be/share?p=abc123")).toBe("abc123");
  });

  it("returns null for a URL without ?p=", () => {
    expect(extractP("https://kinksync.be/share")).toBeNull();
  });

  it("returns null for an invalid URL", () => {
    expect(extractP("not-a-url")).toBeNull();
  });

  it("extracts ?p= even with other params present", () => {
    expect(extractP("https://kinksync.be/share?foo=bar&p=xyz&baz=1")).toBe("xyz");
  });
});
