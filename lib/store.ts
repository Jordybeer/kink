import type { StoreApi, UseBoundStore } from "zustand";
import type { Profile, ProfileOwnerKey } from "@/types";
import { useStore as coreUseStore, useHasHydrated } from "@/lib/storeCore";
import {
  installStoreSecurity,
  type BackupRestoreResult,
} from "@/lib/storeSecurity";
import { installBackupRestoreSecurity } from "@/lib/storeBackupRestoreSecurity";

type CoreState = ReturnType<typeof coreUseStore.getState>;
export type StoreState = Omit<CoreState, "restoreBackupProfiles"> & {
  restoreBackupProfiles: (
    incoming: Profile[],
    ownerKeys: ProfileOwnerKey[],
  ) => BackupRestoreResult;
};

type SafeStoreHook = UseBoundStore<StoreApi<StoreState>>
  & Pick<typeof coreUseStore, "persist">;

installStoreSecurity(coreUseStore);
installBackupRestoreSecurity(coreUseStore);

// Tests and explicit resets must restore the guarded actions, not the raw core.
const guardedInitialState = coreUseStore.getState();
Object.defineProperty(coreUseStore, "getInitialState", {
  configurable: true,
  value: () => guardedInitialState,
});

export const useStore = coreUseStore as unknown as SafeStoreHook;
export { useHasHydrated };
export type { BackupRestoreResult } from "@/lib/storeSecurity";
