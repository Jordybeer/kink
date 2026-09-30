import { describe, expect, it } from "vitest";
import { devQaRouteAllowed } from "@/lib/devQaGate";

describe("dev QA route gate", () => {
  it("allows the explicit dev host when it is not a production branch", () => {
    expect(devQaRouteAllowed("dev.jordy.beer", "dev")).toBe(true);
    expect(devQaRouteAllowed("dev.jordy.beer", "feature/dev-qa-console")).toBe(true);
    expect(devQaRouteAllowed("localhost", null)).toBe(true);
  });

  it("always rejects non-dev hosts", () => {
    expect(devQaRouteAllowed("kinksync.be", "dev")).toBe(false);
    expect(devQaRouteAllowed("www.kinksync.be", "feature/dev-qa-console")).toBe(false);
    expect(devQaRouteAllowed("preview.vercel.app", "dev")).toBe(false);
  });

  it("kills QA on explicit production branch refs even on the dev hostname", () => {
    expect(devQaRouteAllowed("dev.jordy.beer", "main")).toBe(false);
    expect(devQaRouteAllowed("dev.jordy.beer", "MAIN")).toBe(false);
    expect(devQaRouteAllowed("localhost", "master")).toBe(false);
  });
});
