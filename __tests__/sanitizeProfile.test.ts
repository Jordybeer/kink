import { describe, expect, it } from "vitest";
import {
  sanitizeBdsmtestScores,
  sanitizeContractSnapshot,
  sanitizeKinkEntry,
  sanitizeProfileFull,
} from "@/lib/sanitizeProfile";
import { decodeAny, encodeProfile } from "@/lib/shareProfile";
import { parseBdsmtestOutput } from "@/lib/parseBdsmtest";
import type { Profile } from "@/types";

// The bouncer's job description: strangers' JSON (share-URLs, backups,
// pastes) never reaches the store unfrisked, and honest guests are never
// turned away. Round-trips prove the second half.

const HONEST_PROFILE: Profile = {
  id: "prof-1",
  name: "Val",
  role: "Domme",
  experienceLevel: "ervaren",
  relationshipStatus: "Gecollared",
  customKinks: [{ id: "custom_1", name: "Eigen ding" }],
  createdAt: 1716000000000,
  updatedAt: 1716000000001,
  entries: {
    spanking_hand: { status: "yes", desire: 5, experienced: true, comment: "fijn", tags: ["vraag eerst"] },
    flogging: { status: "maybe", desire: 3, comment: "" },
    custom_1: { status: "willing", comment: "" },
  },
  bdsmtestScores: [{ role: "Dominant", pct: 97 }],
};

describe("sanitizeProfileFull", () => {
  it("lets an honest profile through intact", () => {
    const clean = sanitizeProfileFull(HONEST_PROFILE);
    expect(clean).not.toBeNull();
    expect(clean!.name).toBe("Val");
    expect(clean!.role).toBe("Domme");
    expect(clean!.experienceLevel).toBe("ervaren");
    expect(clean!.relationshipStatus).toBe("Gecollared");
    expect(clean!.entries.spanking_hand).toEqual({
      status: "yes", desire: 5, experienced: true, comment: "fijn", tags: ["vraag eerst"],
    });
    expect(clean!.customKinks).toEqual([{ id: "custom_1", name: "Eigen ding" }]);
    expect(clean!.bdsmtestScores).toEqual([{ role: "Dominant", pct: 97 }]);
    expect(clean!.createdAt).toBe(1716000000000);
  });

  it("rejects payloads without id or name", () => {
    expect(sanitizeProfileFull(null)).toBeNull();
    expect(sanitizeProfileFull("string")).toBeNull();
    expect(sanitizeProfileFull({})).toBeNull();
    expect(sanitizeProfileFull({ id: 42, name: "x" })).toBeNull();
    expect(sanitizeProfileFull({ id: "  ", name: "x" })).toBeNull();
  });

  it("clamps hostile string lengths instead of storing megabytes", () => {
    const clean = sanitizeProfileFull({
      id: "x".repeat(10_000),
      name: "n".repeat(10_000),
      role: "r".repeat(10_000),
      privateNote: "p".repeat(100_000),
      entries: { evil: { status: "yes", comment: "c".repeat(100_000) } },
    });
    expect(clean!.id.length).toBe(64);
    expect(clean!.name.length).toBe(80);
    expect(clean!.role.length).toBe(32);
    expect(clean!.privateNote!.length).toBe(2_000);
    expect(clean!.entries.evil.comment.length).toBe(2_000);
  });

  it("enforces the status enum and drops junk entries", () => {
    const clean = sanitizeProfileFull({
      id: "x", name: "x",
      entries: {
        good: { status: "willing", comment: "" },
        badStatus: { status: "DROP TABLE", comment: "" },
        notAnObject: "yes",
        empty: { status: null, comment: "" },
      },
    });
    expect(clean!.entries.good.status).toBe("willing");
    // invalid status collapses to null, and a nothing-entry is dropped whole
    expect(clean!.entries.badStatus).toBeUndefined();
    expect(clean!.entries.notAnObject).toBeUndefined();
    expect(clean!.entries.empty).toBeUndefined();
  });

  it("caps collections: entries at 400, tags at 20 per entry", () => {
    const entries: Record<string, unknown> = {};
    for (let i = 0; i < 1_000; i++) entries[`k${i}`] = { status: "yes", comment: "" };
    entries.tagged = { status: "yes", comment: "", tags: Array.from({ length: 100 }, (_, i) => `t${i}`) };
    const clean = sanitizeProfileFull({ id: "x", name: "x", entries });
    expect(Object.keys(clean!.entries).length).toBeLessThanOrEqual(400);
    const tagged = sanitizeProfileFull({ id: "x", name: "x", entries: { tagged: entries.tagged } });
    expect(tagged!.entries.tagged.tags!.length).toBe(20);
  });

  it("falls back to safe defaults for bogus enums and timestamps", () => {
    const clean = sanitizeProfileFull({
      id: "x", name: "x", experienceLevel: "grandmaster", createdAt: "yesterday", updatedAt: Infinity,
    });
    expect(clean!.experienceLevel).toBe("beginner");
    expect(Number.isFinite(clean!.createdAt)).toBe(true);
    expect(Number.isFinite(clean!.updatedAt)).toBe(true);
  });

  it("clamps desire to 0..5 and drops non-numeric scores", () => {
    const clean = sanitizeProfileFull({
      id: "x", name: "x",
      entries: { a: { status: "yes", desire: 999, comment: "" }, b: { status: "yes", desire: "high", comment: "" } },
    });
    expect(clean!.entries.a.desire).toBe(5);
    expect(clean!.entries.b.desire).toBeUndefined();
  });

  it("only admits data-URI avatars under the size cap", () => {
    const ok = sanitizeProfileFull({ id: "x", name: "x", avatarDataUrl: "data:image/png;base64,QUJD" });
    expect(ok!.avatarDataUrl).toBe("data:image/png;base64,QUJD");
    const evil = sanitizeProfileFull({ id: "x", name: "x", avatarDataUrl: "javascript:alert(1)" });
    expect(evil!.avatarDataUrl).toBeUndefined();
  });
});

describe("sanitizeBdsmtestScores", () => {
  it("clamps pct, caps rows at 50, drops malformed rows", () => {
    const raw = [
      { role: "Dominant", pct: 150 },
      { role: "Brat", pct: -3 },
      { role: 42, pct: 10 },
      "nope",
      ...Array.from({ length: 100 }, (_, i) => ({ role: `Role${i}`, pct: 50 })),
    ];
    const rows = sanitizeBdsmtestScores(raw)!;
    expect(rows.length).toBe(50);
    expect(rows[0]).toEqual({ role: "Dominant", pct: 100 });
    expect(rows[1]).toEqual({ role: "Brat", pct: 0 });
  });

  it("returns undefined for non-arrays and empty results", () => {
    expect(sanitizeBdsmtestScores("x")).toBeUndefined();
    expect(sanitizeBdsmtestScores([{ bad: true }])).toBeUndefined();
  });
});

describe("sanitizeContractSnapshot", () => {
  it("admits an honest snapshot and floors the counts at zero", () => {
    const snap = sanitizeContractSnapshot({
      id: "c1", date: 1716000000000, profileAName: "Val", profileBName: "Noor",
      matchCount: 12, hardLimitCount: -4, softLimitCount: 2.6, discussCount: "veel",
      safeword: "rood", profileAId: "a", profileBId: "b",
    })!;
    expect(snap.matchCount).toBe(12);
    expect(snap.hardLimitCount).toBe(0);
    expect(snap.softLimitCount).toBe(3);
    expect(snap.discussCount).toBe(0);
    expect(snap.safeword).toBe("rood");
  });

  it("rejects snapshots missing identity fields", () => {
    expect(sanitizeContractSnapshot({ id: "c1", profileAName: "Val" })).toBeNull();
    expect(sanitizeContractSnapshot(null)).toBeNull();
  });
});

describe("decodeAny — v1 door now frisked", () => {
  it("round-trips an honest v1 share without losing a single field", () => {
    const decoded = decodeAny(encodeProfile(HONEST_PROFILE));
    expect(decoded.name).toBe("Val");
    expect(decoded.role).toBe("Domme");
    expect(decoded.relationshipStatus).toBe("Gecollared");
    expect(decoded.entries.spanking_hand).toEqual({
      status: "yes", desire: 5, experienced: true, comment: "fijn", tags: ["vraag eerst"],
    });
    expect(decoded.entries.flogging).toEqual({ status: "maybe", desire: 3, comment: "" });
    expect(decoded.customKinks).toEqual([{ id: "custom_1", name: "Eigen ding" }]);
    expect(decoded.bdsmtestScores).toEqual([{ role: "Dominant", pct: 97 }]);
    expect(decoded.isImported).toBe(true);
  });

  it("neutralises a hostile v1 payload instead of casting it into the store", () => {
    const hostile = {
      id: "x", name: "Mallory", role: "r",
      experienceLevel: "root",
      entries: { a: { status: "sudo", comment: "x".repeat(50_000) } },
      __proto__: { polluted: true },
      extraField: "should not survive",
      customKinks: Array.from({ length: 500 }, (_, i) => ({ id: `c${i}`, name: `C${i}` })),
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(hostile))));
    const decoded = decodeAny(encoded);
    expect(decoded.experienceLevel).toBe("beginner");
    expect(decoded.entries.a?.status ?? null).toBeNull();
    expect((decoded as Record<string, unknown>).extraField).toBeUndefined();
    expect(decoded.customKinks.length).toBe(100);
  });

  it("still throws the Dutch error on structurally hopeless payloads", () => {
    const encoded = btoa(JSON.stringify({ hello: "world" }));
    expect(() => decodeAny(encoded)).toThrow(/Ongeldig profiel/);
  });

  it("never leaks privateNote into a share link", () => {
    const decoded = decodeAny(encodeProfile({ ...HONEST_PROFILE, privateNote: "geheim dagboek" }));
    expect(decoded.privateNote).toBeUndefined();
  });
});

describe("parseBdsmtestOutput — flood control", () => {
  it("caps a hostile paste at 100 rows and 64-char roles", () => {
    const flood = Array.from({ length: 5_000 }, (_, i) => `${i % 101}% ${"R".repeat(500)}${i}`).join("\n");
    const rows = parseBdsmtestOutput(flood);
    expect(rows.length).toBe(100);
    for (const row of rows) expect(row.role.length).toBeLessThanOrEqual(64);
  });
});
