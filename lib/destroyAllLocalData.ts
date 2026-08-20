import { useStore } from "@/lib/store";
import { useContractStore } from "@/lib/contractStore";
import { useSplitTourStore } from "@/lib/splitTourState";
import { useInstallPromptPolicyStore } from "@/lib/installPromptPolicyStore";
import { DEFAULT_INSTALL_PROMPT_POLICY } from "@/lib/installPrompt";
import { deleteAllContractArtifacts } from "@/lib/contractArtifacts";
import { runtimeCachesToPurge } from "@/lib/offlineRoutes";

export async function destroyAllLocalData(): Promise<void> {
  // Reset live stores first. Persist middleware only writes on state changes;
  // doing this before storage deletion prevents stale in-memory PIN/profile data
  // from being written back during teardown.
  useStore.setState({
    profiles: [],
    contracts: [],
    profileSnapshots: [],
    scenes: [],
    profileOwnerKeys: [],
    onboardingComplete: false,
    profileTourComplete: false,
    installPromptDismissed: false,
    notificationPermissionAsked: false,
    pinnedProfileId: null,
    appLockEnabled: false,
    appLockPin: null,
    biometricEnabled: false,
    biometricCredentialId: null,
  });
  useContractStore.setState({ series: [], migratedLegacySnapshotIds: [] });
  useSplitTourStore.setState({ profileIntroTourSeen: false, questionnaireTourSeen: false });
  useInstallPromptPolicyStore.setState({ ...DEFAULT_INSTALL_PROMPT_POLICY });

  await Promise.all([
    useStore.persist.clearStorage(),
    useContractStore.persist.clearStorage(),
    useSplitTourStore.persist.clearStorage(),
    useInstallPromptPolicyStore.persist.clearStorage(),
    deleteAllContractArtifacts(),
  ]);

  localStorage.clear();
  sessionStorage.clear();

  // Runtime caches contain visited application responses/URLs, while the
  // precache contains only app code and intentionally stays available offline.
  if (typeof caches !== "undefined") {
    const names = await caches.keys();
    await Promise.all(runtimeCachesToPurge(names).map((name) => caches.delete(name)));
  }
}
