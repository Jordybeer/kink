import { describe, it, expect } from "vitest";
import { shouldAnnounceUpdate } from "@/lib/swUpdateNotice";

// Guards the update channel. The old worker handed showNotification() straight
// to install's waitUntil(); without granted permission that promise rejects,
// the install fails, and the new build never reaches `waiting` — so nobody
// without notifications ever got an update. These cases pin the gate shut.

describe("shouldAnnounceUpdate", () => {
  it("stays silent on the very first install — there is nobody to tell yet", () => {
    expect(shouldAnnounceUpdate(false, "granted")).toBe(false);
  });

  it("stays silent when consent was never given (the default for most users)", () => {
    expect(shouldAnnounceUpdate(true, "default")).toBe(false);
  });

  it("stays silent when notifications were denied outright", () => {
    expect(shouldAnnounceUpdate(true, "denied")).toBe(false);
  });

  it("stays silent where the Notification API does not exist at all", () => {
    expect(shouldAnnounceUpdate(true, undefined)).toBe(false);
  });

  it("announces only on a real update with consent already on the record", () => {
    expect(shouldAnnounceUpdate(true, "granted")).toBe(true);
  });
});
