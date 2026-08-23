"use client";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import type { ContractSnapshot } from "@/types";

interface Props {
  contracts: ContractSnapshot[];
}

const ROWS = [
  { key: "matchCount",      label: "matches",        color: "var(--yes)" },
  { key: "discussCount",    label: "te bespreken",   color: "var(--willing)" },
  { key: "softLimitCount",  label: "zachte grenzen", color: "var(--maybe)" },
  { key: "hardLimitCount",  label: "harde grenzen",  color: "var(--hard-no)" },
] as const;

export function CompatibilityTimeline({ contracts }: Props) {
  if (contracts.length === 0) return null;

  const sorted = [...contracts].sort((a, b) => b.date - a.date);

  return (
    <ol className="flex flex-col">
      {sorted.map((c, i) => {
        const date = new Date(c.date).toLocaleDateString("nl-NL", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        return (
          <li
            key={c.id}
            className="py-4 first:pt-0 last:pb-0"
            style={
              i < sorted.length - 1
                ? { borderBottom: "1px solid var(--border)" }
                : undefined
            }
          >
            <div className="flex items-center justify-between mb-2.5">
              <p
                className="text-xs uppercase tracking-widest"
                style={{ color: "var(--text2)" }}
              >
                {date}
              </p>
              {c.profileAId && c.profileBId && (
                <Link
                  href={`/contract?a=${c.profileAId}&b=${c.profileBId}`}
                  prefetch={false}
                  className="focus-ring inline-flex items-center gap-1 text-xs transition-colors"
                  style={{ color: "var(--accent)" }}
                >
                  Bekijk <ArrowRight size={12} aria-hidden="true" />
                </Link>
              )}
            </div>
            <div className="flex flex-col gap-1">
              {ROWS.map(({ key, label, color }) => {
                const count = c[key];
                if (!count) return null;
                return (
                  <div key={key} className="flex items-baseline gap-2">
                    <span
                      className="font-mono text-xs w-5 shrink-0 text-right"
                      style={{ color, fontVariantNumeric: "tabular-nums" }}
                    >
                      {count}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text2)" }}>
                      {label}
                    </span>
                  </div>
                );
              })}
              {c.safeword && (
                <p className="text-sm mt-1" style={{ color: "var(--text2)" }}>
                  safeword:{" "}
                  <span className="font-semibold" style={{ color: "var(--text)" }}>{c.safeword}</span>
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
