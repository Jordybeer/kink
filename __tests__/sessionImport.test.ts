import { describe, it, expect } from "vitest";
import {
  buildPartnerProfile,
  sanitizeRemoteProfileFull,
  sanitizeSessionResponses,
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

  it("keeps the same fingerprint for legacy and structured responses", () => {
    expect(synthesizePartnerId("Mira", "ontvangen", ENTRIES)).toBe(
      synthesizePartnerId("Mira", "ontvangen", {
        spanking_hand: { status: "yes", privateResponse: true },
        flogging: { status: "maybe" },
        needle_play: { status: "hard_no" },
      })
    );
  });
});

describe("sanitizeSessionResponses", () => {
  it("accepts both legacy statuses and structured private responses", () => {
    expect(sanitizeSessionResponses({
      spanking_hand: "yes",
      flogging: { status: "maybe", privateResponse: true },
      empty_private: { status: null, privateResponse: true },
    })).toEqual({
      spanking_hand: { status: "yes" },
      flogging: { status: "maybe", privateResponse: true },
      empty_private: { status: null, privateResponse: true },
    });
  });

  it("drops malformed statuses and non-boolean privacy flags", () => {
    expect(sanitizeSessionResponses({
      bad: { status: "root", privateResponse: true },
      also_bad: { status: null, privateResponse: "yes" },
      fine: { status: "willing", privateResponse: "yes" },
    })).toEqual({
      bad: { status: null, privateResponse: true },
      fine: { status: "willing" },
    });
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

  describe("avatarDataUrl (av field)", () => {
    const base = { id: "abc", n: "Mira", r: "ontvangen" } as const;
    const VALID_JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRgAB";

    it("accepts a valid jpeg data URL", () => {
      const out = sanitizeRemoteProfileFull({ ...base, av: VALID_JPEG });
      expect(out?.avatarDataUrl).toBe(VALID_JPEG);
    });

    it("accepts png and webp", () => {
      expect(sanitizeRemoteProfileFull({ ...base, av: "data:image/png;base64,iVBORw0KGgo=" })?.avatarDataUrl)
        .toBe("data:image/png;base64,iVBORw0KGgo=");
      expect(sanitizeRemoteProfileFull({ ...base, av: "data:image/webp;base64,UklGRiQA" })?.avatarDataUrl)
        .toBe("data:image/webp;base64,UklGRiQA");
    });

    it("omits avatarDataUrl when av is missing — never collapses to empty string", () => {
      const out = sanitizeRemoteProfileFull(base);
      expect(out).not.toBeNull();
      expect(out?.avatarDataUrl).toBeUndefined();
    });

    it("rejects oversized payloads but keeps the rest of the profile", () => {
      const huge = "data:image/jpeg;base64," + "A".repeat(25_000);
      const out = sanitizeRemoteProfileFull({ ...base, av: huge });
      expect(out).not.toBeNull();
      expect(out?.avatarDataUrl).toBeUndefined();
      expect(out?.name).toBe("Mira");
    });

    it("rejects non-data-URL strings", () => {
      for (const bad of ["http://evil.example/x.png", "<script>alert(1)</script>", "", "   "]) {
        expect(sanitizeRemoteProfileFull({ ...base, av: bad })?.avatarDataUrl).toBeUndefined();
      }
    });

    it("rejects SVG and GIF (MIME outside allowlist)", () => {
      expect(sanitizeRemoteProfileFull({
        ...base, av: "data:image/svg+xml;base64,PHN2Zy8+",
      })?.avatarDataUrl).toBeUndefined();
      expect(sanitizeRemoteProfileFull({
        ...base, av: "data:image/gif;base64,R0lGODlh",
      })?.avatarDataUrl).toBeUndefined();
    });

    it("rejects valid prefix with non-base64 bytes", () => {
      expect(sanitizeRemoteProfileFull({
        ...base, av: "data:image/jpeg;base64,!!",
      })?.avatarDataUrl).toBeUndefined();
    });
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

  it("threads avatarDataUrl from the full payload into the imported profile", () => {
    const avatar = "data:image/jpeg;base64,/9j/4AAQSkZJRgAB";
    const partner = buildPartnerProfile(
      { id: "peer-uuid", name: "Mira", role: "ontvangen", avatarDataUrl: avatar },
      { name: "Mira", role: "ontvangen" },
      ENTRIES,
      NOW,
    );
    expect(partner.avatarDataUrl).toBe(avatar);
  });

  it("leaves avatarDataUrl undefined when the full payload had none", () => {
    const partner = buildPartnerProfile(
      { id: "peer-uuid", name: "Mira", role: "ontvangen" },
      { name: "Mira", role: "ontvangen" },
      ENTRIES,
      NOW,
    );
    expect(partner.avatarDataUrl).toBeUndefined();
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

  it("preserves the private flag when importing the partner", () => {
    const partner = buildPartnerProfile(null, { name: "Mira", role: "ontvangen" }, {
      spanking_hand: { status: "yes", privateResponse: true },
    }, NOW);
    expect(partner.entries.spanking_hand).toEqual({
      status: "yes",
      comment: "",
      privateResponse: true,
    });
  });

  it("is idempotent under store dedupe for the same peer (fallback path)", () => {
    const a = buildPartnerProfile(null, { name: "Mira", role: "ontvangen" }, ENTRIES, NOW);
    const b = buildPartnerProfile(null, { name: "Mira", role: "ontvangen" }, ENTRIES, NOW + 500);
    expect(a.id).toBe(b.id);
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
