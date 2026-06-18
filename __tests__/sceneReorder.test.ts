import { describe, it, expect } from "vitest";
import { moveUp, moveDown } from "@/lib/sceneOrder";

const [a, b, c] = ["a", "b", "c"];

describe("moveUp", () => {
  it("no-op at index 0", () => expect(moveUp([a, b, c], 0)).toEqual([a, b, c]));
  it("moves item at index 2 up", () => expect(moveUp([a, b, c], 2)).toEqual([a, c, b]));
  it("moves item at index 1 up", () => expect(moveUp([a, b, c], 1)).toEqual([b, a, c]));
  it("does not mutate original", () => {
    const arr = [a, b, c];
    moveUp(arr, 1);
    expect(arr).toEqual([a, b, c]);
  });
});

describe("moveDown", () => {
  it("no-op at last index", () => expect(moveDown([a, b, c], 2)).toEqual([a, b, c]));
  it("moves item at index 0 down", () => expect(moveDown([a, b, c], 0)).toEqual([b, a, c]));
  it("moves item at index 1 down", () => expect(moveDown([a, b, c], 1)).toEqual([a, c, b]));
  it("does not mutate original", () => {
    const arr = [a, b, c];
    moveDown(arr, 0);
    expect(arr).toEqual([a, b, c]);
  });
});
