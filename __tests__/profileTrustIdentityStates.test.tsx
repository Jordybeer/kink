import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ProfileTrustStateNotice,
  visibleProfileTrustState,
} from "@/components/ProfileTrust";
import type { ProfileIdentityAnchor } from "@/types";

const anchor: ProfileIdentityAnchor = {
  schema: 1,
  profileId: "profile-a",
  verificationCode: "KS-7H3P-9Q2M-A4BC",
  keyId: "key-a",
  fingerprint: "word one two three",
  anchoredAt: 1234,
  method: "source-device-fingerprint",
};

function renderState(state: Parameters<typeof ProfileTrustStateNotice>[0]["state"]): string {
  return renderToStaticMarkup(<ProfileTrustStateNotice state={state} version={2} />);
}

describe("ProfileTrust independent identity states", () => {
  it("renders cryptographically invalid as a blocking state", () => {
    const html = renderState("cryptographically-invalid");
    expect(html).toContain("Cryptografische controle mislukt");
    expect(html).not.toContain("Identiteit bevestigd.");
  });

  it("renders unsigned legacy material as legacy-unverified", () => {
    const html = renderState("legacy-unsigned");
    expect(html).toContain("Legacy profiel · identiteit niet bevestigd");
    expect(html).not.toContain("Identiteit bevestigd.");
  });

  it("renders a valid signed but unanchored profile without any verified identity label", () => {
    const html = renderState("signed-unanchored");
    expect(html).toContain("Identiteit nog niet bevestigd");
    expect(html).toContain("digitale handtekening");
    expect(html).not.toContain("Identiteit bevestigd.");
    expect(html.toLowerCase()).not.toContain("identity verified");
  });

  it("renders identity-anchored only after an independent anchor exists", () => {
    const html = renderState("identity-anchored");
    expect(html).toContain("Identiteit bevestigd.");
    expect(html).toContain("onafhankelijk vergeleken");
  });

  it("maps the four trust outcomes to the four visible states", () => {
    expect(visibleProfileTrustState({ status: "cryptographically-invalid" })).toBe("cryptographically-invalid");
    expect(visibleProfileTrustState({ status: "legacy-unverified" })).toBe("legacy-unsigned");
    expect(visibleProfileTrustState({ status: "signed-unanchored" })).toBe("signed-unanchored");
    expect(visibleProfileTrustState({ status: "identity-anchored", anchor })).toBe("identity-anchored");
  });

  it("maps an anchored identity conflict to the blocking cryptographic presentation", () => {
    expect(visibleProfileTrustState({ status: "identity-conflict", reason: "key-id", anchor }))
      .toBe("cryptographically-invalid");
  });
});
