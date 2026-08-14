import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("shared motion accessibility contract", () => {
  it("keeps the app-wide MotionConfig reduced-motion policy mounted at the root", () => {
    const layout = source("app/layout.tsx");
    const policy = source("components/MotionPolicy.tsx");

    expect(layout).toContain("<MotionPolicy>");
    expect(policy).toContain('reducedMotion="user"');
  });

  it.each([
    "components/ui/Accordion.tsx",
    "components/ui/FAB.tsx",
    "components/TopNav.tsx",
  ])("keeps %s on the shared useMotionSafe contract", (path) => {
    expect(source(path)).toContain("useMotionSafe");
  });
});
