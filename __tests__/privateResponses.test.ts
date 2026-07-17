import { describe, expect, it } from "vitest";
import {
  comparableEntry,
  isResponseVisible,
  privateResponseKey,
  profileExportResponse,
  visibleStatus,
} from "@/lib/privateResponses";
import type { KinkEntry } from "@/types";

const PRIVATE_ENTRY: KinkEntry = {
  status: "yes",
  desire: 5,
  experienced: true,
  comment: "alleen voor ons",
  tags: ["vraag eerst"],
  curious: true,
  privateResponse: true,
};

describe("private responses", () => {
  it("uses a profile-scoped reveal key", () => {
    expect(privateResponseKey("profile-a", "spanking")).toBe("profile-a:spanking");
  });

  it("hides status until the response is deliberately revealed", () => {
    expect(isResponseVisible(PRIVATE_ENTRY)).toBe(false);
    expect(visibleStatus(PRIVATE_ENTRY)).toBeNull();
    expect(visibleStatus(PRIVATE_ENTRY, true)).toBe("yes");
  });

  it("removes every sensitive field before matching", () => {
    expect(comparableEntry(PRIVATE_ENTRY)).toEqual({
      status: null,
      comment: "",
      curious: true,
      tags: ["vraag eerst"],
      privateResponse: true,
    });
  });

  it("never puts the underlying answer in a safe export model", () => {
    expect(profileExportResponse(PRIVATE_ENTRY)).toEqual({
      kind: "private",
      tags: ["vraag eerst"],
    });
  });

  it("only includes private details after explicit export opt-in", () => {
    expect(profileExportResponse(PRIVATE_ENTRY, true)).toEqual({
      kind: "visible",
      status: "yes",
      comment: "alleen voor ons",
      tags: ["vraag eerst"],
    });
  });
});
