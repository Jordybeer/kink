import { beforeEach, describe, expect, it } from "vitest";
import { restoreLocalBackup } from "@/lib/restoreLocalBackup";
import { useStore } from "@/lib/store";
import { useContractStore } from "@/lib/contractStore";
import { useIntimacyStore } from "@/lib/intimacyStore";
import { encryptBackup, decryptBackup } from "@/lib/crypto";
import type { SceneRecord } from "@/types";

const entry = { id: "moment", status: "planned", date: "2026-09-18", createdAt: 1, updatedAt: 2 };
const scene: SceneRecord = {
  id: "scene", title: "Rustig", profileAId: "a", profileBId: "b", profileAName: "A", profileBName: "B",
  items: [], status: "draft", createdAt: 1, updatedAt: 2,
};
const series = {
  id: "series", pairKey: "a|b", participants: [
    { profileId: "a", profileName: "A", role: "Switch", verificationCode: "a" },
    { profileId: "b", profileName: "B", role: "Switch", verificationCode: "b" },
  ], status: "draft", createdAt: 1, updatedAt: 2, versions: [], events: [],
};
const backup = { source: "backup", profiles: [], contractSeries: [series], intimacyEntries: [entry], scenes: [scene] };

beforeEach(() => {
  useStore.setState({ profiles: [], profileOwnerKeys: [], contracts: [], scenes: [], profileSnapshots: [] });
  useContractStore.setState({ series: [], migratedLegacySnapshotIds: [] });
  useIntimacyStore.setState({ entries: [] });
});

describe("complete local backup restore", () => {
  it.each([false, true])("restores records without profiles, encrypted=%s", async (encrypted) => {
    const raw = encrypted
      ? JSON.parse(await decryptBackup(await encryptBackup(JSON.stringify(backup), "backup-test-123"), "backup-test-123"))
      : JSON.parse(JSON.stringify(backup));
    const message = await restoreLocalBackup(raw);
    expect(useContractStore.getState().series).toEqual([series]);
    expect(useIntimacyStore.getState().entries).toEqual([entry]);
    expect(useStore.getState().scenes).toEqual([scene]);
    expect(message).toContain("1 scène(s)");
  });

  it("restores history with derived counts and preserves newer existing snapshots", async () => {
    const snapshot = { id: "history", profileId: "a", date: 2, entries: { rope: { status: "yes", comment: "" } }, customKinks: [], counts: { yes: 999 } };
    await restoreLocalBackup({ source: "backup", profiles: [], profileSnapshots: [snapshot] });
    expect(useStore.getState().profileSnapshots[0].counts.yes).toBe(1);
    await restoreLocalBackup({ source: "backup", profiles: [], profileSnapshots: [{ ...snapshot, entries: {} }] });
    expect(useStore.getState().profileSnapshots[0].entries.rope.status).toBe("yes");
  });

  it("never replaces an existing scene with an older backup or drops unrelated data", async () => {
    const current = { ...scene, title: "Gewijzigde afspraak", updatedAt: 10 };
    useStore.setState({ scenes: [current] });
    useIntimacyStore.setState({ entries: [{ ...entry, status: "planned", note: "later", updatedAt: 10 }] });
    await restoreLocalBackup(backup);
    expect(useStore.getState().scenes).toEqual([current]);
    expect(useIntimacyStore.getState().entries[0].note).toBe("later");
  });

  it("cancelling during validation leaves every store untouched", async () => {
    const controller = new AbortController();
    const pending = restoreLocalBackup(backup, controller.signal);
    controller.abort();
    await expect(pending).rejects.toThrow();
    expect(useStore.getState().scenes).toEqual([]);
    expect(useIntimacyStore.getState().entries).toEqual([]);
    expect(useContractStore.getState().series).toEqual([]);
  });

  it("does not inject private archives through a shared-profile import", async () => {
    await restoreLocalBackup({ ...backup, source: "shared" });
    expect(useStore.getState().scenes).toEqual([]);
    expect(useIntimacyStore.getState().entries).toEqual([]);
    expect(useContractStore.getState().series).toEqual([]);
  });

  it.each([null, [], { source: "backup", profiles: [], scenes: [{ ...scene, items: [null] }] }])("rejects malformed data without mutations: %j", async (raw) => {
    await expect(restoreLocalBackup(raw)).rejects.toThrow();
    expect(useStore.getState().scenes).toEqual([]);
    expect(useContractStore.getState().series).toEqual([]);
  });
});
