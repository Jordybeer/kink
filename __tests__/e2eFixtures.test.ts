import { describe, expect, it } from "vitest";
import { PROFILE_ALEX, PROFILE_SAM, buildStore } from "../e2e/fixtures";
import { KINKS } from "@/lib/kinks";
import { STORE_PERSIST_VERSION } from "@/lib/storePersistVersion";

describe("E2E-fixturecontract", () => {
  it("seedt uitsluitend actieve catalogus-IDs", () => {
    const catalogIds = new Set(KINKS.map((kink) => kink.id));

    for (const profile of [PROFILE_ALEX, PROFILE_SAM]) {
      for (const kinkId of Object.keys(profile.entries)) {
        expect(catalogIds.has(kinkId), `${profile.name} seedt onbekend ID ${kinkId}`).toBe(true);
      }
    }
  });

  it("loopt in de pas met de actuele persistversie en storevorm", () => {
    const persisted = buildStore([PROFILE_ALEX, PROFILE_SAM]);

    expect(persisted.version).toBe(STORE_PERSIST_VERSION);
    expect(persisted.state).toMatchObject({
      profiles: [PROFILE_ALEX, PROFILE_SAM],
      contracts: [],
      profileSnapshots: [],
      scenes: [],
      profileOwnerKeys: [],
      onboardingComplete: true,
      profileTourComplete: true,
      installPromptDismissed: true,
      notificationPermissionAsked: false,
      pinnedProfileId: null,
      appLockEnabled: false,
      appLockPin: null,
      biometricEnabled: false,
      biometricCredentialId: null,
    });
  });
});
