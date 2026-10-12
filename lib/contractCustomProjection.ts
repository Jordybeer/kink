import { buildCompareModel, type CompareFactKind } from "@/lib/compareV2";
import type { ContractHardLimit, ContractKinkDetail } from "@/lib/contractLifecycle";
import type { Profile } from "@/types";

/** Project only public Compare evidence. These rows are not consent. */
export function projectCustomContractEvidence(profileA: Profile, profileB: Profile) {
  const result = {
    shared: [] as ContractKinkDetail[],
    softLimits: [] as ContractKinkDetail[],
    discuss: [] as ContractKinkDetail[],
    hardLimits: [] as ContractHardLimit[],
    hardLimitDetails: [] as ContractKinkDetail[],
  };
  const model = buildCompareModel(profileA, profileB);
  function add(detail: ContractKinkDetail, kind: CompareFactKind) {
    if (kind === "conflict" || kind === "limit") {
      const aHard = detail.statusA === "hard_no", bHard = detail.statusB === "hard_no";
      result.hardLimits.push({
        name: detail.name,
        who: aHard && bHard ? "beiden" : aHard ? profileA.name : profileB.name,
        sourceKind: "custom",
        ...(detail.sourceAId ? { sourceAId: detail.sourceAId } : {}),
        ...(detail.sourceBId ? { sourceBId: detail.sourceBId } : {}),
      });
      result.hardLimitDetails.push(detail);
    } else if (kind === "shared" || kind === "complementary") result.shared.push(detail);
    else if (kind === "soft") result.softLimits.push(detail);
    else result.discuss.push(detail);
  }
  for (const fact of model.facts) {
    if (!fact.custom) continue;
    add({ name: fact.label, statusA: fact.statusA, statusB: fact.statusB,
      sourceKind: "custom", sourceAId: fact.kinkAId, sourceBId: fact.kinkBId }, fact.kind);
  }
  for (const item of model.unpaired) {
    if (!item.custom) continue;
    // The missing side's Compare ID is only a placeholder. Never export it.
    add({ name: item.label,
      statusA: item.visibleSide === "a" ? item.status : null,
      statusB: item.visibleSide === "b" ? item.status : null,
      sourceKind: "custom",
      ...(item.visibleSide === "a" ? { sourceAId: item.kinkAId } : { sourceBId: item.kinkBId }),
    }, item.status === "hard_no" ? "limit" : "discuss");
  }
  return result;
}
