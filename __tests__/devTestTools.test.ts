import { describe, expect, it } from "vitest";
import {
  isDevTestToolsHost,
  resolveDevTestToolsDecision,
} from "@/lib/devTestTools";

describe("dev test tools gate", () => {
  it("only enables on the explicit dev origins", () => {
    expect(isDevTestToolsHost("dev.jordy.beer")).toBe(true);
    expect(isDevTestToolsHost("localhost")).toBe(true);
    expect(isDevTestToolsHost("127.0.0.1")).toBe(true);
    expect(isDevTestToolsHost("kinksync.be")).toBe(false);
    expect(isDevTestToolsHost("www.kinksync.be")).toBe(false);
    expect(isDevTestToolsHost("preview.vercel.app")).toBe(false);
  });

  it("persists an explicit enable or disable only on a dev host", () => {
    expect(resolveDevTestToolsDecision({
      hostname: "dev.jordy.beer",
      search: "?testtools=1",
      storedValue: null,
    })).toEqual({ enabled: true, persist: "enable" });

    expect(resolveDevTestToolsDecision({
      hostname: "dev.jordy.beer",
      search: "?testtools=0",
      storedValue: "1",
    })).toEqual({ enabled: false, persist: "disable" });

    expect(resolveDevTestToolsDecision({
      hostname: "dev.jordy.beer",
      search: "",
      storedValue: "1",
    })).toEqual({ enabled: true, persist: null });

    expect(resolveDevTestToolsDecision({
      hostname: "kinksync.be",
      search: "?testtools=1",
      storedValue: "1",
    })).toEqual({ enabled: false, persist: null });
  });
});
