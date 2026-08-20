"use client";

import { useMemo, useState } from "react";
import { ClockCounterClockwise } from "@phosphor-icons/react";
import { KINKS } from "@/lib/kinks";
import { diffSnapshotEntries } from "@/lib/profileSnapshot";
import { STATUS_LABEL, STATUS_VAR } from "@/lib/statusLabels";
import type { KinkEntry, ProfileSnapshot } from "@/types";

interface Props {
  profileId: string;
  snapshots: ProfileSnapshot[];
  currentEntries: Record<string, KinkEntry>;
  // Kept as a compatibility prop for the caller while manual snapshotting is
  // deliberately removed from the UI. Automatic store snapshots remain intact.
  onSave: (profileId: string) => unknown;
}

const PREVIEW_COUNT = 5;

export default function ProfileSnapshotPanel({ profileId, snapshots, currentEntries }: Props) {
  const [showAll, setShowAll] = useState(false);
  const mine = useMemo(
    () => snapshots
      .filter((snapshot) => snapshot.profileId === profileId)
      .sort((left, right) => left.date - right.date),
    [profileId, snapshots],
  );

  const latest = mine[mine.length - 1];
  const previous = mine[mine.length - 2];
  const liveShifts = useMemo(
    () => latest ? diffSnapshotEntries(latest.entries, currentEntries) : [],
    [currentEntries, latest],
  );
  const recordedShifts = useMemo(
    () => previous && latest
      ? diffSnapshotEntries(previous.entries, latest.entries)
        .filter((shift) => currentEntries[shift.kinkId]?.privateResponse !== true)
      : [],
    [currentEntries, latest, previous],
  );
  const shifts = liveShifts.length > 0 ? liveShifts : recordedShifts;

  const names = useMemo(() => {
    const result = new Map(KINKS.map((kink) => [kink.id, kink.name]));
    for (const snapshot of mine) {
      for (const custom of snapshot.customKinks ?? []) result.set(custom.id, custom.name);
    }
    return result;
  }, [mine]);

  if (!latest || shifts.length === 0) return null;

  const visible = showAll ? shifts : shifts.slice(0, PREVIEW_COUNT);
  const hiddenCount = shifts.length - visible.length;
  const moment = new Date(latest.date);
  const dateLabel = moment.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeLabel = moment.toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <section
      className="mt-4 rounded-2xl p-4 sm:p-5"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      aria-labelledby="profile-history-title"
      data-testid="profile-history-panel"
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 flex-none items-center justify-center rounded-xl"
          style={{ background: "var(--surface2)", color: "var(--accent)" }}
        >
          <ClockCounterClockwise size={19} weight="duotone" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--accent)" }}>
            Profielverloop
          </p>
          <h3
            id="profile-history-title"
            className="mt-2 text-lg italic leading-tight"
            style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}
          >
            Wat er echt veranderde
          </h3>
          <p className="mt-1.5 text-xs leading-5" style={{ color: "var(--text2)" }}>
            {liveShifts.length > 0
              ? "Sinds het laatste profielmoment."
              : "Laatste betekenisvolle wijziging."}
          </p>
          <p
            className="mt-1 text-[11px] leading-4"
            style={{ color: "color-mix(in srgb, var(--accent) 48%, var(--text2))" }}
            aria-label={`Profielmoment ${dateLabel} om ${timeLabel}`}
          >
            {dateLabel} · {timeLabel}
          </p>
        </div>
      </div>

      <ul className="mt-4 flex flex-col gap-2.5">
        {visible.map((shift) => (
          <li
            key={shift.kinkId}
            className="rounded-xl px-3 py-2.5"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <p className="truncate text-sm font-medium">
              {names.get(shift.kinkId) ?? "Eigen onderwerp"}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
              <span style={{ color: "var(--text2)" }}>
                {shift.from ? STATUS_LABEL[shift.from] : "Nieuw"}
              </span>
              <span aria-hidden="true" style={{ color: "var(--text2)" }}>→</span>
              <span
                className="font-semibold"
                style={{ color: shift.to ? STATUS_VAR[shift.to] : "var(--text2)" }}
              >
                {shift.to ? STATUS_LABEL[shift.to] : "Ingetrokken"}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="focus-ring mt-3 min-h-9 rounded-lg px-2 text-xs font-semibold"
          style={{ color: "var(--accent)" }}
        >
          Toon {hiddenCount} meer
        </button>
      )}

      <p className="mt-4 text-xs leading-5" style={{ color: "var(--text2)" }}>
        Nieuwe momenten worden automatisch en lokaal bijgehouden wanneer je profiel verandert.
      </p>
    </section>
  );
}
