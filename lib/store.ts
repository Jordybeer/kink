import type { StoreApi, UseBoundStore } from "zustand";
import type { Profile, ProfileOwnerKey } from "@/types";
import { useStore as coreUseStore, useHasHydrated } from "@/lib/storeCore";
import {
  installStoreSecurity,
  type BackupRestoreResult,
} from "@/lib/storeSecurity";
import { installBackupRestoreSecurity } from "@/lib/storeBackupRestoreSecurity";
import {
  installProfileQuarantineSecurity,
  type ProfileQuarantineState,
} from "@/lib/profileQuarantine";

type CoreState = ReturnType<typeof coreUseStore.getState>;
export type StoreState = Omit<CoreState, "restoreBackupProfiles" | "theme" | "setTheme"> & ProfileQuarantineState & {
  restoreBackupProfiles: (
    incoming: Profile[],
    ownerKeys: ProfileOwnerKey[],
  ) => BackupRestoreResult;
};

type SafeStoreHook = UseBoundStore<StoreApi<StoreState>>
  & Pick<typeof coreUseStore, "persist">;

installStoreSecurity(coreUseStore);
installBackupRestoreSecurity(coreUseStore);
installProfileQuarantineSecurity(coreUseStore);

function stripLegacyThemeState() {
  const state = coreUseStore.getState() as CoreState & {
    theme?: unknown;
    setTheme?: unknown;
  };
  if (!("theme" in state) && !("setTheme" in state)) return;

  // One-way compatibility migration for installations that once persisted a
  // selectable theme. KinkSync now has one fixed house style.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { theme: _theme, setTheme: _setTheme, ...withoutTheme } = state;
  coreUseStore.setState(withoutTheme as CoreState, true);
}

if (typeof window !== "undefined") {
  stripLegacyThemeState();
  coreUseStore.persist.onFinishHydration(stripLegacyThemeState);
}

// Tests and explicit resets must restore the guarded actions, not the raw core.
const guardedInitialState = coreUseStore.getState();
Object.defineProperty(coreUseStore, "getInitialState", {
  configurable: true,
  value: () => guardedInitialState,
});

export const useStore = coreUseStore as unknown as SafeStoreHook;
export { useHasHydrated };
export type { BackupRestoreResult } from "@/lib/storeSecurity";
