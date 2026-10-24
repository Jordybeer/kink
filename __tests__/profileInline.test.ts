import { describe, expect, it } from "vitest";
import { pinnedPublicItems, profileInlineStatus } from "@/lib/profileInline";
import type { ProfileReadItem } from "@/lib/profileReadSummary";
const item = (id: string, status: ProfileReadItem["status"]): ProfileReadItem => ({ id, status, name: id, category: "custom", comment: "", tags: [], curious: false });
describe("inline profile selection and edit position", () => {
  it("honors an explicitly empty deep-linked status", () => {
    expect(profileInlineStatus("maybe", [item("one", "yes")])).toBe("maybe");
  });
  it("defaults to the first nonempty interest without inferring from boundaries", () => {
    expect(profileInlineStatus(null, [item("limit", "hard_no"), item("one", "willing")])).toBe("willing");
    expect(profileInlineStatus("invalid", [item("limit", "hard_no")])).toBe("yes");
  });
  it("retains the active list order through changed or cleared answers", () => {
    const snapshot = [item("first", "yes"), item("editing", "yes")];
    expect(pinnedPublicItems(snapshot, [item("first", "yes")], new Set())).toEqual(snapshot);
    expect(pinnedPublicItems(undefined, [item("first", "yes")], new Set())).toEqual([item("first", "yes")]);
  });
  it("privacy overrides the pinned position synchronously", () => {
    expect(pinnedPublicItems([item("editing", "yes")], [], new Set(["editing"]))).toEqual([]);
  });
});
