import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ContractSnapshot, Profile } from "@/types";
import {
  contractPairKey,
  contractParticipantFromProfile,
  contractSummaryFromContent,
  hashContractContent,
  type ContractSeries,
  type ContractVersionContent,
} from "@/lib/contractLifecycle";

function uid(): string {
  return crypto.randomUUID();
}

interface SaveDraftInput {
  profileA: Profile;
  profileB: Profile;
  content: ContractVersionContent;
  note?: string;
}

export interface RestoreContractSeriesResult {
  added: number;
  updated: number;
  unchanged: number;
}

function safeRestoredSeries(candidate: ContractSeries, existing?: ContractSeries): ContractSeries {
  const restored = structuredClone(candidate);
  if (existing?.status === "stopped" && restored.status !== "stopped") {
    restored.status = "stopped";
  } else if (restored.status === "active" && existing?.status !== "active") {
    // A backup can restore signed history, but it cannot prove that consent is still active now.
    restored.status = "paused";
  }
  return restored;
}

interface ContractStoreState {
  series: ContractSeries[];
  migratedLegacySnapshotIds: string[];
  saveDraft: (input: SaveDraftInput) => Promise<{ series: ContractSeries; versionId: string }>;
  upsertSeries: (series: ContractSeries) => void;
  deleteSeries: (seriesId: string) => void;
  restoreSeries: (series: readonly ContractSeries[]) => RestoreContractSeriesResult;
  importLegacyContracts: (contracts: readonly ContractSnapshot[], profiles: readonly Profile[]) => void;
}

function fallbackParticipant(
  id: string | undefined,
  name: string,
  profiles: readonly Profile[],
) {
  const profile = id ? profiles.find((candidate) => candidate.id === id) : undefined;
  if (profile) return contractParticipantFromProfile(profile);
  const profileId = id ?? `legacy:${name.trim().toLocaleLowerCase("nl-BE")}`;
  return {
    profileId,
    profileName: name,
    role: "Onbekend",
    verificationCode: profileId,
  };
}

export const useContractStore = create<ContractStoreState>()(
  persist(
    (set, get) => ({
      series: [],
      migratedLegacySnapshotIds: [],

      async saveDraft({ profileA, profileB, content, note }) {
        const now = Date.now();
        const pairKey = contractPairKey(profileA.id, profileB.id);
        const contentHash = await hashContractContent(content);
        const current = get().series.find((item) => item.pairKey === pairKey);
        const existingDraft = current?.draftVersionId
          ? current.versions.find((version) => version.id === current.draftVersionId)
          : undefined;
        const versionId = existingDraft?.id ?? uid();
        const nextNumber = existingDraft?.number
          ?? Math.max(0, ...(current?.versions.map((version) => version.number) ?? [])) + 1;
        const version = {
          id: versionId,
          number: nextNumber,
          createdAt: existingDraft?.createdAt ?? now,
          updatedAt: now,
          contentHash,
          content,
          summary: contractSummaryFromContent(content),
          ...(note?.trim() ? { note: note.trim() } : {}),
          state: "draft" as const,
          signatures: [],
        };

        const next: ContractSeries = current
          ? {
              ...current,
              participants: [
                contractParticipantFromProfile(profileA),
                contractParticipantFromProfile(profileB),
              ],
              versions: [version, ...current.versions.filter((item) => item.id !== versionId)],
              draftVersionId: versionId,
              status: current.currentVersionId ? current.status : "draft",
              updatedAt: now,
            }
          : {
              id: uid(),
              pairKey,
              participants: [
                contractParticipantFromProfile(profileA),
                contractParticipantFromProfile(profileB),
              ],
              status: "draft",
              createdAt: now,
              updatedAt: now,
              draftVersionId: versionId,
              versions: [version],
              events: [],
            };

        set((state) => ({
          series: [next, ...state.series.filter((item) => item.id !== next.id)],
        }));
        return { series: next, versionId };
      },

      upsertSeries(series) {
        set((state) => ({
          series: [series, ...state.series.filter((item) => item.id !== series.id)]
            .sort((left, right) => right.updatedAt - left.updatedAt),
        }));
      },

      deleteSeries(seriesId) {
        set((state) => ({ series: state.series.filter((item) => item.id !== seriesId) }));
      },

      restoreSeries(incoming) {
        const byId = new Map(get().series.map((item) => [item.id, item]));
        let added = 0;
        let updated = 0;
        let unchanged = 0;

        for (const candidate of incoming) {
          const existing = byId.get(candidate.id);
          if (!existing) {
            byId.set(candidate.id, safeRestoredSeries(candidate));
            added += 1;
          } else if (candidate.updatedAt > existing.updatedAt) {
            byId.set(candidate.id, safeRestoredSeries(candidate, existing));
            updated += 1;
          } else {
            unchanged += 1;
          }
        }

        set({ series: [...byId.values()].sort((left, right) => right.updatedAt - left.updatedAt) });
        return { added, updated, unchanged };
      },

      importLegacyContracts(contracts, profiles) {
        const migrated = new Set(get().migratedLegacySnapshotIds);
        const novel = contracts.filter((contract) => !migrated.has(contract.id));
        if (novel.length === 0) return;

        const nextSeries = [...get().series];
        const byPair = new Map<string, ContractSnapshot[]>();
        for (const contract of novel) {
          const a = contract.profileAId ?? `legacy:${contract.profileAName.trim().toLocaleLowerCase("nl-BE")}`;
          const b = contract.profileBId ?? `legacy:${contract.profileBName.trim().toLocaleLowerCase("nl-BE")}`;
          const key = contractPairKey(a, b);
          byPair.set(key, [...(byPair.get(key) ?? []), contract]);
        }

        for (const [pairKey, snapshots] of byPair) {
          const ordered = [...snapshots].sort((left, right) => left.date - right.date);
          const existingIndex = nextSeries.findIndex((item) => item.pairKey === pairKey);
          const existing = existingIndex >= 0 ? nextSeries[existingIndex] : undefined;
          const baseNumber = Math.max(0, ...(existing?.versions.map((version) => version.number) ?? []));
          const versions = ordered.map((snapshot, index) => ({
            id: `legacy-version:${snapshot.id}`,
            number: baseNumber + index + 1,
            createdAt: snapshot.date,
            updatedAt: snapshot.date,
            contentHash: `legacy:${snapshot.id}`,
            summary: {
              matchCount: snapshot.matchCount,
              hardLimitCount: snapshot.hardLimitCount,
              softLimitCount: snapshot.softLimitCount,
              discussCount: snapshot.discussCount,
              ...(snapshot.safeword ? { safeword: snapshot.safeword } : {}),
            },
            state: "signed" as const,
            signatures: [],
            legacySnapshotId: snapshot.id,
          }));
          const newest = versions.at(-1)!;
          const first = ordered[0];
          const participants = [
            fallbackParticipant(first.profileAId, first.profileAName, profiles),
            fallbackParticipant(first.profileBId, first.profileBName, profiles),
          ] as ContractSeries["participants"];

          if (existing) {
            const merged: ContractSeries = {
              ...existing,
              participants,
              versions: [...versions.reverse(), ...existing.versions],
              currentVersionId: existing.currentVersionId ?? newest.id,
              status: existing.currentVersionId ? existing.status : "active",
              updatedAt: Math.max(existing.updatedAt, newest.updatedAt),
              legacySnapshotIds: [
                ...(existing.legacySnapshotIds ?? []),
                ...ordered.map((snapshot) => snapshot.id),
              ],
            };
            nextSeries[existingIndex] = merged;
          } else {
            nextSeries.push({
              id: `legacy-series:${newest.legacySnapshotId}`,
              pairKey,
              participants,
              status: "active",
              createdAt: ordered[0].date,
              updatedAt: newest.updatedAt,
              currentVersionId: newest.id,
              versions: versions.reverse(),
              events: ordered.map((snapshot) => ({
                id: `legacy-event:${snapshot.id}`,
                type: "activated" as const,
                createdAt: snapshot.date,
                actorProfileId: snapshot.profileAId ?? participants[0].profileId,
                actorName: snapshot.profileAName,
                counterpartyProfileId: snapshot.profileBId ?? participants[1].profileId,
                eventHash: `legacy:${snapshot.id}`,
              })),
              legacySnapshotIds: ordered.map((snapshot) => snapshot.id),
            });
          }
        }

        set({
          series: nextSeries.sort((left, right) => right.updatedAt - left.updatedAt),
          migratedLegacySnapshotIds: [...migrated, ...novel.map((contract) => contract.id)],
        });
      },
    }),
    {
      name: "kink-contract-series",
      version: 1,
      partialize: (state) => ({
        series: state.series,
        migratedLegacySnapshotIds: state.migratedLegacySnapshotIds,
      }),
    },
  ),
);
