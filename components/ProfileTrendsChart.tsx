"use client";
import { useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
  type ChartOptions,
  type ChartData,
} from "chart.js";
import type { ProfileSnapshot } from "@/types";
import {
  PROFILE_TREND_SERIES,
  diffSnapshotEntries,
  prepareProfileTrendData,
  type CountKey,
} from "@/lib/profileSnapshot";
import { KINKS } from "@/lib/kinks";
import { STATUS_LABEL, STATUS_VAR } from "@/lib/statusLabels";

ChartJS.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
);

function readVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function tint(color: string, pct: number): string {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

interface ResolvedTokens {
  yes: string;
  willing: string;
  maybe: string;
  no: string;
  hardNo: string;
  text2: string;
  surface2: string;
  border: string;
  fontSans: string;
  fontDisplay: string;
}

const FALLBACK_TOKENS: ResolvedTokens = {
  yes: "#f97316",
  willing: "#84cc16",
  maybe: "#fbbf24",
  no: "#818cf8",
  hardNo: "#ef4444",
  text2: "#9d9ab8",
  surface2: "#181824",
  border: "rgba(255,255,255,0.08)",
  fontSans: "system-ui, -apple-system, sans-serif",
  fontDisplay: "Georgia, serif",
};

interface Props {
  snapshots: ProfileSnapshot[];
}

export function ProfileTrendsChart({ snapshots }: Props) {
  const [hidden, setHidden] = useState<Record<CountKey, boolean>>({
    yes: false, willing: false, maybe: false, no: false, hard_no: false,
  });

  const [tokens, setTokens] = useState<ResolvedTokens>(FALLBACK_TOKENS);

  useEffect(() => {
    setTokens({
      yes: readVar("--yes", FALLBACK_TOKENS.yes),
      willing: readVar("--willing", FALLBACK_TOKENS.willing),
      maybe: readVar("--maybe", FALLBACK_TOKENS.maybe),
      no: readVar("--no", FALLBACK_TOKENS.no),
      hardNo: readVar("--hard-no", FALLBACK_TOKENS.hardNo),
      text2: readVar("--text2", FALLBACK_TOKENS.text2),
      surface2: readVar("--surface2", FALLBACK_TOKENS.surface2),
      border: readVar("--border", FALLBACK_TOKENS.border),
      fontSans: readVar("--font-sans", FALLBACK_TOKENS.fontSans),
      fontDisplay: readVar("--font-display", FALLBACK_TOKENS.fontDisplay),
    });
  }, []);

  const prep = useMemo(() => prepareProfileTrendData(snapshots), [snapshots]);

  if (snapshots.length < 2) {
    return <Placeholder tokens={tokens} />;
  }

  const seriesColor: Record<CountKey, string> = {
    yes: tokens.yes,
    willing: tokens.willing,
    maybe: tokens.maybe,
    no: tokens.no,
    hard_no: tokens.hardNo,
  };

  const data: ChartData<"line"> = {
    labels: prep.labels,
    datasets: PROFILE_TREND_SERIES.map((s) => {
      const color = seriesColor[s.key];
      const isPrimary = s.key === "yes";
      return {
        label: s.label,
        data: prep.series[s.key],
        borderColor: color,
        backgroundColor: isPrimary ? tint(color, 9) : "transparent",
        pointBackgroundColor: color,
        pointBorderColor: color,
        pointRadius: 3,
        pointHoverRadius: 6,
        borderWidth: 2,
        tension: 0.32,
        fill: isPrimary,
        hidden: hidden[s.key],
      };
    }),
  };

  const gridColor = `color-mix(in srgb, ${tokens.text2} 14%, transparent)`;

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 280 },
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: tokens.surface2,
        borderColor: tokens.border,
        borderWidth: 1,
        padding: 10,
        titleColor: tokens.text2,
        titleFont: { family: tokens.fontDisplay, size: 13, style: "italic", weight: 400 },
        bodyColor: "#ffffff",
        bodyFont: { family: tokens.fontSans, size: 12 },
        bodySpacing: 4,
        cornerRadius: 6,
        displayColors: true,
        boxWidth: 8,
        boxHeight: 8,
        callbacks: {
          title: (items) => {
            const idx = items[0]?.dataIndex ?? 0;
            const s = prep.ascending[idx];
            return s
              ? new Date(s.date).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })
              : "";
          },
          label: (item) => `  ${item.dataset.label}: ${item.formattedValue}`,
          afterBody: (items) => {
            const idx = items[0]?.dataIndex ?? 0;
            const s = prep.ascending[idx];
            if (!s) return "";
            const total = s.counts.yes + s.counts.willing + s.counts.maybe + s.counts.no + s.counts.hard_no;
            if (total === 0) return "";
            return `  totaal beoordeeld: ${total}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: tokens.text2, font: { family: tokens.fontSans, size: 11 }, maxRotation: 0, autoSkipPadding: 12 },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: gridColor, lineWidth: 1 },
        ticks: { color: tokens.text2, font: { family: tokens.fontSans, size: 11 }, precision: 0, maxTicksLimit: 5 },
      },
    },
  };

  const last = prep.ascending[prep.ascending.length - 1];
  const ariaLabel = last
    ? `Profielverloop. Laatste moment: ${last.counts.yes} heel graag, ${last.counts.willing} ja, ${last.counts.maybe} misschien, ${last.counts.no} voor hen, ${last.counts.hard_no} harde grenzen.`
    : "Profielverloop chart";

  return (
    <section
      className="mb-4 rounded-xl p-4 sm:p-5"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      aria-label="Verloop van dit profiel"
    >
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-xs uppercase tracking-widest" style={{ color: "var(--text2)" }}>
            Verloop
          </h3>
          <p
            className="mt-0.5 italic"
            style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: "0.95rem", color: "var(--text)", lineHeight: 1.2 }}
          >
            Hoe dit profiel beweegt over tijd
          </p>
        </div>
        <span className="shrink-0 text-xs" style={{ color: "var(--text2)", fontVariantNumeric: "tabular-nums" }}>
          {snapshots.length} momenten
        </span>
      </header>

      <div className="relative w-full" style={{ height: "clamp(180px, 38vw, 240px)" }}>
        <Line data={data} options={options} aria-label={ariaLabel} role="img" />
      </div>

      <ShiftLedger snapshots={prep.ascending} />

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Toon series">
        {PROFILE_TREND_SERIES.map((s) => {
          const color = seriesColor[s.key];
          const isHidden = hidden[s.key];
          const arr = prep.series[s.key];
          const latest = arr[arr.length - 1] ?? 0;
          return (
            <button
              key={s.key}
              type="button"
              role="checkbox"
              aria-checked={!isHidden}
              onClick={() => setHidden((h) => ({ ...h, [s.key]: !h[s.key] }))}
              className="focus-ring inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-opacity"
              style={{
                background: tint(color, 14),
                border: `1px solid ${tint(color, 35)}`,
                color: "var(--text)",
                opacity: isHidden ? 0.4 : 1,
                minHeight: 32,
              }}
            >
              <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
              <span>{s.label}</span>
              <span
                style={{
                  color: isHidden ? "var(--text2)" : color,
                  fontVariantNumeric: "tabular-nums",
                  textDecoration: isHidden ? "line-through" : "none",
                }}
              >
                {latest}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// What actually moved between the last two saved moments — the chart shows
// that lines wander, this names the kinks that did the wandering.
const SHIFT_PREVIEW = 5;

function ShiftLedger({ snapshots }: { snapshots: ProfileSnapshot[] }) {
  const [showAll, setShowAll] = useState(false);
  const prev = snapshots[snapshots.length - 2];
  const last = snapshots[snapshots.length - 1];
  const shifts = useMemo(
    () => (prev && last ? diffSnapshotEntries(prev.entries, last.entries) : []),
    [prev, last]
  );
  const names = useMemo(() => {
    const m = new Map<string, string>(KINKS.map((k) => [k.id, k.name]));
    for (const ck of last?.customKinks ?? []) m.set(ck.id, ck.name);
    for (const ck of prev?.customKinks ?? []) if (!m.has(ck.id)) m.set(ck.id, ck.name);
    return m;
  }, [prev, last]);

  if (!shifts.length) return null;
  const visible = showAll ? shifts : shifts.slice(0, SHIFT_PREVIEW);
  const hiddenCount = shifts.length - visible.length;

  return (
    <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
      <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--text2)" }}>
        Sinds vorig moment
      </p>
      <ul className="flex flex-col gap-1">
        {visible.map((s) => (
          <li key={s.kinkId} className="flex items-baseline gap-2 text-xs">
            <span className="truncate" style={{ color: "var(--text)" }}>
              {names.get(s.kinkId) ?? s.kinkId}
            </span>
            <span className="flex-none" style={{ color: "var(--text2)" }}>
              {s.from ? STATUS_LABEL[s.from] : "nieuw"}
              {" → "}
            </span>
            <span className="flex-none font-medium" style={{ color: s.to ? STATUS_VAR[s.to] : "var(--text2)" }}>
              {s.to ? STATUS_LABEL[s.to] : "ingetrokken"}
            </span>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="focus-ring mt-1.5 text-xs"
          style={{ color: "var(--accent)" }}
        >
          +{hiddenCount} meer
        </button>
      )}
    </div>
  );
}

function Placeholder({ tokens }: { tokens: ResolvedTokens }) {
  return (
    <section
      className="mb-4 rounded-xl p-4 sm:p-5"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      aria-label="Verloop nog niet beschikbaar"
    >
      <header className="mb-3">
        <h3 className="text-xs uppercase tracking-widest" style={{ color: "var(--text2)" }}>
          Verloop
        </h3>
      </header>
      <div className="relative flex items-center justify-center" style={{ height: "clamp(140px, 30vw, 180px)" }}>
        <svg aria-hidden className="absolute inset-0 h-full w-full" viewBox="0 0 240 120" preserveAspectRatio="none">
          <line x1="20" y1="100" x2="220" y2="100" stroke={tint(tokens.text2, 22)} strokeDasharray="3 4" />
          <circle cx="40" cy="70" r="4" fill={tokens.yes} />
        </svg>
        <div className="relative text-center">
          <p
            className="italic"
            style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: "1.1rem", color: "var(--text)", lineHeight: 1.2 }}
          >
            Eerst meer momenten.
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>
            Sla nog een moment op om het verloop te zien.
          </p>
        </div>
      </div>
    </section>
  );
}
