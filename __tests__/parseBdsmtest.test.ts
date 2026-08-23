import { describe, expect, it } from "vitest";
import { parseBdsmtestCopyAll, parseBdsmtestOutput } from "@/lib/parseBdsmtest";

const SAMPLE = `== Results from bdsmtest.org ==
100% Dominant
97% Sadist
85% Rigger
72% Master/Mistress
50% Switch
12% Submissive
0% Vanilla`;

const COPY_ALL = `Don’t judge 🙈

https://bdsmtest.org/r/qXBN9QWw

100% Little
100% Exhibitionist
99% Voyeur
98% Ageplayer
97% Experimentalist
94% Submissive
93% Switch
79% Sadist
78% Rope bunny
73% Primal (Hunter)
72% Rigger
68% Non-monogamist
58% Brat
48% Master/Mistress
44% Dominant
38% Daddy/Mommy
37% Slave
30% Vanilla
20% Pet
16% Owner
9% Brat tamer
9% Masochist
2% Degrader
0% Degradee
0% Primal (Prey)`;

const IOS_URI_ENCODED_COPY_ALL = "https://bdsmtest.org/r/iosCopyAll%0A%0A100%25%20Little%0A93%25%20Switch%0A78%25%20Rope%20bunny%0A0%25%20Primal%20(Prey)";

describe("parseBdsmtestOutput", () => {
  it("parses standard bdsmtest copy output", () => {
    const results = parseBdsmtestOutput(SAMPLE);
    expect(results[0]).toEqual({ role: "Dominant", pct: 100 });
    expect(results[1]).toEqual({ role: "Sadist", pct: 97 });
    expect(results).toHaveLength(7);
  });

  it("returns results sorted descending by pct", () => {
    const out = "50% Switch\n100% Dominant\n72% Rigger";
    const results = parseBdsmtestOutput(out);
    expect(results.map((r) => r.pct)).toEqual([100, 72, 50]);
  });

  it("includes 0% results", () => {
    const results = parseBdsmtestOutput(SAMPLE);
    expect(results.find((r) => r.role === "Vanilla")).toEqual({ role: "Vanilla", pct: 0 });
  });

  it("handles roles with slashes and spaces", () => {
    const out = "72% Master/Mistress\n65% Rope bunny";
    const results = parseBdsmtestOutput(out);
    expect(results[0].role).toBe("Master/Mistress");
    expect(results[1].role).toBe("Rope bunny");
  });
});

describe("parseBdsmtestCopyAll", () => {
  it("splits the real Copy all shape into a canonical URL and scores", () => {
    const result = parseBdsmtestCopyAll(COPY_ALL);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.url).toBe("https://bdsmtest.org/r/qXBN9QWw");
    expect(result.scores).toHaveLength(25);
    expect(result.scores[0]).toEqual({ role: "Little", pct: 100 });
    expect(result.scores.at(-1)).toEqual({ role: "Primal (Prey)", pct: 0 });
  });

  it("decodes the single-line URI-encoded Copy all shape produced on iOS", () => {
    const result = parseBdsmtestCopyAll(IOS_URI_ENCODED_COPY_ALL);
    expect(result).toEqual({
      ok: true,
      url: "https://bdsmtest.org/r/iosCopyAll",
      scores: [
        { role: "Little", pct: 100 },
        { role: "Switch", pct: 93 },
        { role: "Rope bunny", pct: 78 },
        { role: "Primal (Prey)", pct: 0 },
      ],
    });
  });

  it("ignores harmless free text around the payload", () => {
    const result = parseBdsmtestCopyAll(`Whatever you want to write here 😏\n\n${COPY_ALL}`);
    expect(result.ok).toBe(true);
  });

  it("canonicalizes www, http, tracking and fragments away", () => {
    const result = parseBdsmtestCopyAll("http://www.bdsmtest.org/r/qXBN9QWw?utm_source=test#result\n100% Little");
    expect(result).toEqual({
      ok: true,
      url: "https://bdsmtest.org/r/qXBN9QWw",
      scores: [{ role: "Little", pct: 100 }],
    });
  });

  it("rejects look-alike hosts and active URL schemes", () => {
    expect(parseBdsmtestCopyAll("https://bdsmtest.org.evil.example/r/abc\n100% Little")).toEqual({ ok: false, error: "invalid-url" });
    expect(parseBdsmtestCopyAll("javascript:alert(1)\n100% Little")).toEqual({ ok: false, error: "invalid-url" });
  });

  it("keeps strict URL validation after decoding an iOS-shaped paste", () => {
    expect(parseBdsmtestCopyAll("https://bdsmtest.org.evil.example/r/steal%0A100%25%20Little")).toEqual({
      ok: false,
      error: "invalid-url",
    });
  });

  it("fails closed instead of throwing on malformed URI encoding", () => {
    expect(parseBdsmtestCopyAll("https://bdsmtest.org/r/abc%0A100%ZZ%20Little")).toEqual({
      ok: false,
      error: "invalid-url",
    });
  });

  it("rejects more than one distinct result link", () => {
    expect(parseBdsmtestCopyAll("https://bdsmtest.org/r/abc\nhttps://bdsmtest.org/r/def\n100% Little")).toEqual({ ok: false, error: "multiple-urls" });
  });

  it("rejects missing URL or missing score rows", () => {
    expect(parseBdsmtestCopyAll("100% Little")).toEqual({ ok: false, error: "missing-url" });
    expect(parseBdsmtestCopyAll("https://bdsmtest.org/r/abc")).toEqual({ ok: false, error: "missing-results" });
  });

  it("rejects out-of-range and conflicting duplicate scores", () => {
    expect(parseBdsmtestCopyAll("https://bdsmtest.org/r/abc\n101% Little")).toEqual({ ok: false, error: "invalid-results" });
    expect(parseBdsmtestCopyAll("https://bdsmtest.org/r/abc\n100% Little\n99% Little")).toEqual({ ok: false, error: "invalid-results" });
  });

  it("deduplicates an identical repeated score", () => {
    expect(parseBdsmtestCopyAll("https://bdsmtest.org/r/abc\n100% Little\n100% Little")).toEqual({
      ok: true,
      url: "https://bdsmtest.org/r/abc",
      scores: [{ role: "Little", pct: 100 }],
    });
  });

  it("rejects HTML-shaped role labels instead of storing them as text", () => {
    expect(parseBdsmtestCopyAll("https://bdsmtest.org/r/abc\n100% <script>alert(1)</script>")).toEqual({ ok: false, error: "invalid-results" });
  });

  it("rejects absurdly large clipboard input before parsing", () => {
    const huge = "x".repeat(20_000) + "\nhttps://bdsmtest.org/r/abc\n100% Little";
    expect(parseBdsmtestCopyAll(huge)).toEqual({ ok: false, error: "too-large" });
  });
});
