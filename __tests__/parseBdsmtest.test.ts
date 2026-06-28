import { describe, it, expect } from "vitest";
import { parseBdsmtestOutput } from "@/lib/parseBdsmtest";

const SAMPLE = `== Results from bdsmtest.org ==
100% Dominant
97% Sadist
85% Rigger
72% Master/Mistress
50% Switch
12% Submissive
0% Vanilla`;

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

  it("skips header and blank lines", () => {
    const results = parseBdsmtestOutput(SAMPLE);
    expect(results.every((r) => !r.role.startsWith("=="))).toBe(true);
  });

  it("handles roles with slashes and spaces", () => {
    const out = "72% Master/Mistress\n65% Rope bunny";
    const results = parseBdsmtestOutput(out);
    expect(results[0].role).toBe("Master/Mistress");
    expect(results[1].role).toBe("Rope bunny");
  });

  it("returns empty array for empty input", () => {
    expect(parseBdsmtestOutput("")).toEqual([]);
    expect(parseBdsmtestOutput("no matching lines here")).toEqual([]);
  });
});
