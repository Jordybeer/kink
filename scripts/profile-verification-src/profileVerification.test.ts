import { beforeEach, describe, expect, it } from "vitest";
import type { Profile } from "@/types";
import { useStore } from "@/lib/store";
import {
  classifyProfileImport,
  deriveProfileVerificationCode,
  generateProfileVerificationCode,
  getProfileVerificationCode,
  normalizeProfileVerificationCode,
  PROFILE_VERIFICATION_CODE_RE,
} from "@/lib/profileVerification";

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "profile-a",
    verificationCode: "KS-7H3P-9Q2M-A4BC",
    name: "Alex",
    role: "Switch",
    experienceLevel: "ervaren",
    customKinks: [],
    createdAt: 100,
    updatedAt: 200,
    entries: {},
    ...overrides,
  };
}

describe("profile verification codes", () => {
  beforeEach(() => {
    useStore.setState({ profiles: [] });
  });

  it("creates a stable human-readable 60-bit code", () => {
    const bytes = Uint8Array.from({ length: 12 }, (_, index) => index);
    const code = generateProfileVerificationCode(bytes);
    expect(code).toBe("KS-2345-6789-ABCD");
    expect(PROFILE_VERIFICATION_CODE_RE.test(code)).toBe(true);
    expect(normalizeProfileVerificationCode("ks 2345 6789 abcd")).toBe(code);
  });

  it("derives the same legacy code from the same profile id", () => {
    const first = deriveProfileVerificationCode("legacy-profile-id");
    const second = deriveProfileVerificationCode("legacy-profile-id");
    expect(first).toBe(second);
    expect(PROFILE_VERIFICATION_CODE_RE.test(first)).toBe(true);
  });

  it("treats an equal code as the same profile lineage even when ids differ", () => {
    const existing = makeProfile();
    const incoming = makeProfile({ id: "profile-copy", name: "Renamed Alex" });
    const match = classifyProfileImport([existing], incoming);
    expect(match.kind).toBe("same-code");
    if (match.kind === "same-code") expect(match.profile.id).toBe(existing.id);
  });

  it("warns on equal name and role when the code differs", () => {
    const existing = makeProfile();
    const incoming = makeProfile({
      id: "other-profile",
      verificationCode: "KS-8J4R-5T6V-W7XY",
    });
    expect(classifyProfileImport([existing], incoming).kind).toBe("same-name-role");
  });

  it("backfills a code from id when an old profile has none", () => {
    const old = makeProfile({ verificationCode: undefined });
    expect(getProfileVerificationCode(old)).toBe(deriveProfileVerificationCode(old.id));
  });

  it("prevents a second import carrying the same verification code", () => {
    const existing = makeProfile();
    useStore.setState({ profiles: [existing] });
    useStore.getState().importProfiles([
      makeProfile({ id: "different-id", name: "Duplicate attempt" }),
    ]);
    expect(useStore.getState().profiles).toEqual([existing]);
  });
});
