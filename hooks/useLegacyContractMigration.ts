"use client";

import { useEffect, useState } from "react";
import { useContractStore } from "@/lib/contractStore";
import { useHasHydrated, useStore } from "@/lib/store";

/**
 * Imports pre-series contract snapshots before a route decides that a local
 * contract is missing. The existing migration is idempotent and never changes
 * the consent state of an already migrated series.
 */
export function useLegacyContractMigration(): boolean {
  const hydrated = useHasHydrated();
  const legacyContracts = useStore((state) => state.contracts);
  const profiles = useStore((state) => state.profiles);
  const importLegacyContracts = useContractStore((state) => state.importLegacyContracts);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hydrated) {
      setReady(false);
      return;
    }
    importLegacyContracts(legacyContracts, profiles);
    setReady(true);
  }, [hydrated, importLegacyContracts, legacyContracts, profiles]);

  return hydrated && ready;
}
