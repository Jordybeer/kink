import { beforeEach, describe, expect, it } from "vitest";
import { prepareBackupRestore } from "@/lib/backupRestore";
import { useContractStore } from "@/lib/contractStore";
import type { ContractSeries } from "@/lib/contractLifecycle";

function series(updatedAt = 100): ContractSeries {
  return {
    id: "series-1",
    pairKey: "a|b",
    participants: [
      { profileId: "a", profileName: "A", role: "Dominant", verificationCode: "code-a" },
      { profileId: "b", profileName: "B", role: "Submissive", verificationCode: "code-b" },
    ],
    status: "active",
    createdAt: 50,
    updatedAt,
    currentVersionId: "version-1",
    versions: [{
      id: "version-1",
      number: 1,
      createdAt: 50,
      updatedAt,
      contentHash: "legacy:test",
      summary: { matchCount: 2, hardLimitCount: 1, softLimitCount: 1, discussCount: 0 },
      state: "signed",
      signatures: [],
    }],
    events: [],
  };
}

beforeEach(() => {
  useContractStore.setState({ series: [], migratedLegacySnapshotIds: [] });
});

describe("contract-series backup restore", () => {
  it("sanitizes and returns contract series from an encrypted backup payload", async () => {
    const prepared = await prepareBackupRestore({
      version: 3,
      source: "backup",
      profiles: [],
      contracts: [],
      profileOwnerKeys: [],
      contractSeries: [series(), { id: "broken" }],
    });

    expect(prepared.contractSeries).toHaveLength(1);
    expect(prepared.contractSeries[0].id).toBe("series-1");
  });

  it("adds missing series, keeps newer local history and accepts a newer backup", () => {
    const restore = useContractStore.getState().restoreSeries;
    expect(restore([series(100)])).toEqual({ added: 1, updated: 0, unchanged: 0 });
    expect(restore([series(90)])).toEqual({ added: 0, updated: 0, unchanged: 1 });

    const newer = { ...series(150), status: "paused" as const };
    expect(restore([newer])).toEqual({ added: 0, updated: 1, unchanged: 0 });
    expect(useContractStore.getState().series[0].status).toBe("paused");
  });
});
