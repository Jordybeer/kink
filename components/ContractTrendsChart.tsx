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
import type { ContractSnapshot } from "@/types";

ChartJS.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
);

type SeriesKey =
  | "matchCount"
  | "discussCount"
  | "softLimitCount"
  | "hardLimitCount";

export interface TrendSeries {
  key: SeriesKey;
  label: string;
  cssVar: string;
}

export const TREND_SERIES: readonly TrendSeries[] = [
  { key: "matchCount", label: "Matches", cssVar: "--yes" },
  { key: "discussCount", label: "Te bespreken", cssVar: "--maybe" },
  { key: "softLimitCount", label: "Zachte grenzen", cssVar: "--no" },
  { key: "hardLimitCount", label: "Harde grenzen", cssVar: "--hard-no" },
] as const;

export interface ChartPrep {
  labels: string[];
  series: Record<SeriesKey, number[]>;
  ascending: ContractSnapshot[];
}

export function prepareTrendData(contracts: ContractSnapshot[]): ChartPrep {
  const ascending = [...contracts].sort((a, b) => a.date - b.date);
  const fmt = (ms: number) =>
    new Date(ms).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "short",
    });
  return {
    labels: ascending.map((c) => fmt(c.date)),
    series: {
      matchCount: ascending.map((c) => c.matchCount),
      discussCount: ascending.map((c) => c.discussCount),
      softLimitCount: ascending.map((c) => c.softLimitCount),
      hardLimitCount: ascending.map((c) => c.hardLimitCount),
    },
    ascending,
  };
}

function readVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

function tint(color: string, pct: number): string {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

interface ResolvedTokens {
  yes: string;
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
  yes: "#4ade80",
  maybe: "#fbbf24",
  no: "#fb923c",
  hardNo: "#ef4444",
  text2: "#9d9ab8",
  surface2: "#181824",
  border: "rgba(255,255,255,0.08)",
  fontSans: "system-ui, -apple-system, sans-serif",
  fontDisplay: "Georgia, serif",
};

interface Props {
  contracts: ContractSnapshot[];
}

export function ContractTrendsChart({ contracts }: Props) {
  const [hidden, setHidden] = useState<Record<SeriesKey, boolean>>({
    matchCount: false,
    discussCount: false,
    softLimitCount: false,
    hardLimitCount: false,
  });

  const [tokens, setTokens] = useState<ResolvedTokens>(FALLBACK_TOKENS);

  useEffect(() => {
    setTokens({
      yes: readVar("--yes", FALLBACK_TOKENS.yes),
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

  const prep = useMemo(() => prepareTrendData(contracts), [contracts]);

  if (contracts.length < 2) {
    return <Placeholder tokens={tokens} />;
  }

  const seriesColor: Record<SeriesKey, string> = {
    matchCount: tokens.yes,
    discussCount: tokens.maybe,
    softLimitCount: tokens.no,
    hardLimitCount: tokens.hardNo,
  };

  const data: ChartData<"line"> = {
    labels: prep.labels,
    datasets: TREND_SERIES.map((s) => {
      const color = seriesColor[s.key];
      const isPrimary = s.key === "matchCount";
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
        titleFont: {
          family: tokens.fontDisplay,
          size: 13,
          style: "italic",
          weight: 400,
        },
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
            const c = prep.ascending[idx];
            return c
              ? new Date(c.date).toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "";
          },
          label: (item) => `  ${item.dataset.label}: ${item.formattedValue}`,
          afterBody: (items) => {
            const idx = items[0]?.dataIndex ?? 0;
            const c = prep.ascending[idx];
            if (!c) return "";
            const total =
              c.matchCount +
              c.discussCount +
              c.softLimitCount +
              c.hardLimitCount;
            if (total === 0) return "";
            const pct = Math.round((c.matchCount / total) * 100);
            return `  verbond: ${pct}%`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: tokens.text2,
          font: { family: tokens.fontSans, size: 11 },
          maxRotation: 0,
          autoSkipPadding: 12,
        },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: gridColor, lineWidth: 1 },
        ticks: {
          color: tokens.text2,
          font: { family: tokens.fontSans, size: 11 },
          precision: 0,
          maxTicksLimit: 5,
        },
      },
    },
  };

  const last = prep.ascending[prep.ascending.length - 1];
  const ariaLabel = last
    ? `Verloop. Laatste contract: ${last.matchCount} matches, ${last.discussCount} te bespreken, ${last.softLimitCount} zachte grenzen, ${last.hardLimitCount} harde grenzen.`
    : "Verloop chart";

  return (
    <section
      className="mb-4 rounded-xl p-4 sm:p-5"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
      aria-label="Trends tussen contracten"
    >
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h3
            className="text-xs uppercase tracking-widest"
            style={{ color: "var(--text2)" }}
          >
            Verloop
          </h3>
          <p
            className="mt-0.5 italic"
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              fontSize: "0.95rem",
              color: "var(--text)",
              lineHeight: 1.2,
            }}
          >
            Hoe de getallen bewegen tussen contracten
          </p>
        </div>
        <span
          className="shrink-0 text-xs"
          style={{
            color: "var(--text2)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {contracts.length} snapshots
        </span>
      </header>

      <div
        className="relative w-full"
        style={{ height: "clamp(180px, 38vw, 240px)" }}
      >
        <Line data={data} options={options} aria-label={ariaLabel} role="img" />
      </div>

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Toon series">
        {TREND_SERIES.map((s) => {
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
              onClick={() =>
                setHidden((h) => ({ ...h, [s.key]: !h[s.key] }))
              }
              className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-opacity"
              style={{
                background: tint(color, 14),
                border: `1px solid ${tint(color, 35)}`,
                color: "var(--text)",
                opacity: isHidden ? 0.4 : 1,
              }}
            >
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: color }}
              />
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

function Placeholder({ tokens }: { tokens: ResolvedTokens }) {
  return (
    <section
      className="mb-4 rounded-xl p-4 sm:p-5"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
      aria-label="Verloop nog niet beschikbaar"
    >
      <header className="mb-3">
        <h3
          className="text-xs uppercase tracking-widest"
          style={{ color: "var(--text2)" }}
        >
          Verloop
        </h3>
      </header>
      <div
        className="relative flex items-center justify-center"
        style={{ height: "clamp(140px, 30vw, 180px)" }}
      >
        <svg
          aria-hidden
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 240 120"
          preserveAspectRatio="none"
        >
          <line
            x1="20"
            y1="100"
            x2="220"
            y2="100"
            stroke={tint(tokens.text2, 22)}
            strokeDasharray="3 4"
          />
          <circle cx="40" cy="70" r="4" fill={tokens.yes} />
        </svg>
        <div className="relative text-center">
          <p
            className="italic"
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              fontSize: "1.1rem",
              color: "var(--text)",
              lineHeight: 1.2,
            }}
          >
            Eerst meer geschiedenis.
          </p>
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--text2)" }}
          >
            Sla nog één contract op om het verloop te zien.
          </p>
        </div>
      </div>
    </section>
  );
}
