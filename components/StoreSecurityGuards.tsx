"use client";

import { useEffect } from "react";
import type { Profile } from "@/types";
import { useStore } from "@/lib/store";

function isSharedProfile(profile: Profile | undefined): boolean {
  return !!profile && (profile.origin === "shared" || profile.isImported === true);
}

let installedAgainst: ReturnType<typeof useStore.getState>["renameProfile"] | null = null;

/**
 * Wraps the persisted store actions so read-only and locked data cannot be
 * rewritten by another component accidentally. This is defence in depth; the
 * cryptographic verification remains the source of truth for imported data.
 */
export function installStoreSecurityGuards(): void {
  const current = useStore.getState();
  if (installedAgainst === current.renameProfile) return;

  const originals = {
    renameProfile: current.renameProfile,
    setBdsmtestScores: current.setBdsmtestScores,
    setEntry: current.setEntry,
    resetEntry: current.resetEntry,
    addCustomKink: current.addCustomKink,
    removeCustomKink: current.removeCustomKink,
    saveScene: current.saveScene,
    lockSceneConsent: current.lockSceneConsent,
  };

  const editable = (profileId: string) => {
    const profile = useStore.getState().profiles.find((candidate) => candidate.id === profileId);
    return !!profile && !isSharedProfile(profile);
  };

  const guardedRename: typeof current.renameProfile = (...args) => {
    if (editable(args[0])) originals.renameProfile(...args);
  };

  useStore.setState({
    renameProfile: guardedRename,
    setBdsmtestScores: (...args) => {
      if (editable(args[0])) originals.setBdsmtestScores(...args);
    },
    setEntry: (...args) => {
      if (editable(args[0])) originals.setEntry(...args);
    },
    resetEntry: (...args) => {
      if (editable(args[0])) originals.resetEntry(...args);
    },
    addCustomKink: (...args) => {
      if (editable(args[0])) originals.addCustomKink(...args);
    },
    removeCustomKink: (...args) => {
      if (editable(args[0])) originals.removeCustomKink(...args);
    },
    saveScene: (record) => {
      const existing = record.id
        ? useStore.getState().scenes.find((scene) => scene.id === record.id)
        : undefined;
      if (existing?.consentLockedAt || existing?.consentSnapshots) return existing.id;
      return originals.saveScene(record);
    },
    lockSceneConsent: async (sceneId) => {
      const state = useStore.getState();
      const scene = state.scenes.find((candidate) => candidate.id === sceneId);
      if (!scene) return { ok: false, message: "Scène niet gevonden." };
      const participants = state.profiles.filter((profile) =>
        profile.id === scene.profileAId || profile.id === scene.profileBId);
      if (!participants.some((profile) => !isSharedProfile(profile))) {
        return {
          ok: false,
          message: "Minstens één deelnemer moet deze scène op het eigen toestel vastzetten.",
        };
      }
      return originals.lockSceneConsent(sceneId);
    },
  });

  installedAgainst = guardedRename;
}

export default function StoreSecurityGuards() {
  useEffect(() => {
    installStoreSecurityGuards();
  }, []);
  return null;
}
