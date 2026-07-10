"use client";
import { useState } from "react";
import { Camera } from "@phosphor-icons/react";
import { ProfileTrendsChart } from "@/components/ProfileTrendsChart";
import type { ProfileSnapshot } from "@/types";

interface Props {
  profileId: string;
  snapshots: ProfileSnapshot[];
  onSave: (profileId: string) => unknown;
}

export default function ProfileSnapshotPanel({ profileId, snapshots, onSave }: Props) {
  const [snapshotSaved, setSnapshotSaved] = useState(false);
  const mine = snapshots.filter((snap) => snap.profileId === profileId);

  function handleSave() {
    const saved = onSave(profileId);
    if (!saved) return;
    setSnapshotSaved(true);
    setTimeout(() => setSnapshotSaved(false), 1600);
  }

  return (
    <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
      <ProfileTrendsChart snapshots={mine} />
      {snapshotSaved ? (
        <p className="text-sm text-center py-3 font-semibold" style={{ color: "var(--accent)" }}>
          ✓ Moment opgeslagen
        </p>
      ) : (
        <button
          onClick={handleSave}
          aria-label="Sla dit moment op"
          className="focus-ring w-full flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors"
          style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)", minHeight: 44 }}
        >
          <Camera size={16} aria-hidden="true" />
          Sla dit moment op
        </button>
      )}
    </div>
  );
}
