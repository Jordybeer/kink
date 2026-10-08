import { describe, expect, it } from "vitest";
import { ambientGlowContextForPathname } from "@/lib/ambientGlow";

describe("ambientGlowContextForPathname", () => {
  it("keeps Home compact and treats every profile route as the same ambient context", () => {
    expect(ambientGlowContextForPathname("/")).toBe("home");
    expect(ambientGlowContextForPathname("/profile/pw-alex-001")).toBe("profile");
    expect(ambientGlowContextForPathname("/profile/pw-alex-001/questions")).toBe("profile");
    expect(ambientGlowContextForPathname("/compare")).toBe("default");
  });
});
