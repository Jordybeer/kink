import type { StoreApi } from "zustand";
import type { Profile } from "@/types";
import type { ContractSeries } from "@/lib/contractLifecycle";
import { buildCompareModel } from "@/lib/compareV2";
import { invalidateDiscussedTransition, profilePersonKey } from "@/lib/compareDiscussionMemory";

type ProfileState = { profiles: Profile[] };
type AgreementState = { series: ContractSeries[] };

/** Watch actual edits, including edits made while Compare is not mounted. */
export function installDiscussionInvalidation<P extends ProfileState, C extends AgreementState>(
  profiles: Pick<StoreApi<P>, "getState" | "subscribe">,
  agreements: Pick<StoreApi<C>, "getState" | "subscribe">,
  storage: Pick<Storage, "getItem" | "setItem">,
): () => void {
  function reconcile(
    beforeProfiles: readonly Profile[],
    afterProfiles: readonly Profile[],
    beforeSeries: readonly ContractSeries[],
    afterSeries: readonly ContractSeries[],
  ) {
    const afterById = new Map(afterProfiles.map((profile) => [profile.id, profile]));
    for (let i = 0; i < beforeProfiles.length; i++) {
      const a = beforeProfiles[i];
      const nextA = afterById.get(a.id);
      for (const b of beforeProfiles.slice(i + 1)) {
        if (profilePersonKey(a) === profilePersonKey(b)) continue;
        const nextB = afterById.get(b.id);
        if (a === nextA && b === nextB && beforeSeries === afterSeries) continue;
        const beforeFacts = buildCompareModel(a, b).facts;
        const afterFacts = nextA && nextB ? buildCompareModel(nextA, nextB).facts : [];
        invalidateDiscussedTransition(storage, {
          profileA: a, profileB: b, facts: beforeFacts, contractSeries: beforeSeries,
        }, {
          profileA: nextA ?? a, profileB: nextB ?? b, facts: afterFacts, contractSeries: afterSeries,
        });
      }
    }
  }

  const unsubscribeProfiles = profiles.subscribe((next, previous) => {
    if (next.profiles === previous.profiles) return;
    const series = agreements.getState().series;
    reconcile(previous.profiles, next.profiles, series, series);
  });
  const unsubscribeAgreements = agreements.subscribe((next, previous) => {
    if (next.series === previous.series) return;
    const current = profiles.getState().profiles;
    reconcile(current, current, previous.series, next.series);
  });
  return () => {
    unsubscribeProfiles();
    unsubscribeAgreements();
  };
}
