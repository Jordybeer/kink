import { describe, expect, it } from "vitest";
import braces from "braces";

function nestedBraces(depth) {
  return "{".repeat(depth) + "a" + "}".repeat(depth);
}

function nestedAst(depth) {
  let node = { type: "text", value: "a" };
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

describe("braces CVE-2026-93687 depth guard", () => {
  it("rejects string input deeper than the 100-level safety boundary", () => {
    expect(() => braces.parse(nestedBraces(100))).not.toThrow();
    expect(() => braces.parse(nestedBraces(101))).toThrow(/exceeds max depth/i);
  });

  it("rejects caller-supplied ASTs deeper than the safety boundary", () => {
    expect(() => braces.compile(nestedAst(100))).not.toThrow();
    expect(() => braces.compile(nestedAst(101))).toThrow(/exceeds max depth/i);
  });

  it("bounds mixed and parenthesis nesting through the real parser", () => {
    for (const input of ["(".repeat(101) + "a" + ")".repeat(101), "{(".repeat(51) + "a" + ")}".repeat(51)]) {
      expect(() => braces.parse(input)).toThrow(/exceeds max depth/i);
    }
    expect(() => braces.parse(nestedBraces(101), { maxDepth: Infinity })).toThrow(/exceeds max depth/i);
  });

  it("rejects recursive AST cycles in each walker", () => {
    const ast = { type: "root", nodes: [] };
    ast.nodes.push(ast);
    for (const walk of [braces.compile, braces.expand, braces.stringify]) {
      expect(() => walk(ast)).toThrow(/exceeds max depth/i);
    }
  });

  it("preserves ordinary expansion, compilation and stringification", () => {
    expect(braces.expand("x{1..3}")).toEqual(["x1", "x2", "x3"]);
    expect(braces("{a,b}")).toEqual(["(a|b)"]);
    expect(braces.stringify(braces.parse("a{b,c}"))).toBe("a{b,c}");
  });
});
