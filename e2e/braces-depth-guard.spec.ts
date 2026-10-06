import { expect, test } from "@playwright/test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const braces = require("braces") as {
  parse(input: string, options?: { maxDepth?: number }): unknown;
  compile(ast: unknown, options?: { maxDepth?: number }): unknown;
};

function nestedBraces(depth: number): string {
  return "{".repeat(depth) + "a" + "}".repeat(depth);
}

function nestedAst(depth: number): unknown {
  let node: Record<string, unknown> = { type: "text", value: "a" };
  for (let index = 0; index < depth; index += 1) {
    node = {
      type: "brace",
      open: true,
      close: true,
      commas: 1,
      ranges: 0,
      nodes: [node],
    };
  }
  return { type: "root", nodes: [node] };
}

test.describe("braces CVE-2026-93687 depth guard", () => {
  test("rejects string input deeper than the 100-level safety boundary", () => {
    expect(() => braces.parse(nestedBraces(100))).not.toThrow();
    expect(() => braces.parse(nestedBraces(101))).toThrow(/exceeds max depth/i);
  });

  test("rejects caller-supplied ASTs deeper than the safety boundary", () => {
    expect(() => braces.compile(nestedAst(100))).not.toThrow();
    expect(() => braces.compile(nestedAst(101))).toThrow(/exceeds max depth/i);
  });
});
