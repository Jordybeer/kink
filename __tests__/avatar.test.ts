import { describe, expect, it } from "vitest";
import { avatarDuotone, avatarSeed, avatarStyle } from "@/lib/avatar";

describe("avatar wardrobe", () => {
  it("same name always wears the same outfit — case and whitespace forgiven", () => {
    expect(avatarSeed("Val")).toBe(avatarSeed("  val "));
    expect(avatarDuotone("Noor")).toEqual(avatarDuotone("noor"));
    expect(avatarStyle("Val")).toEqual(avatarStyle("Val"));
  });

  it("duotones are real hex pairs", () => {
    for (const name of ["Val", "Noor", "Alex", "Sam", "Kim", "Robin"]) {
      const [a, b] = avatarDuotone(name);
      expect(a).toMatch(/^#[0-9a-f]{6}$/);
      expect(b).toMatch(/^#[0-9a-f]{6}$/);
      expect(a).not.toBe(b);
    }
  });

  it("different names can dress differently", () => {
    const outfits = new Set(
      ["Val", "Noor", "Alex", "Sam", "Kim", "Robin", "Charlie", "Max"].map(
        (n) => avatarDuotone(n).join("→")
      )
    );
    expect(outfits.size).toBeGreaterThan(1);
  });

  it("the style is a layered gradient with a legible face", () => {
    const style = avatarStyle("Val");
    expect(style.background).toContain("radial-gradient");
    expect(style.background).toContain("linear-gradient");
    expect(style.color).toBe("#fff");
  });
});
