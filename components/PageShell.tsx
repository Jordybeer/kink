"use client";
import { CSSProperties, ReactNode } from "react";

const WIDTH = {
  lg: "max-w-lg",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "5xl": "max-w-5xl",
} as const;

export default function PageShell({
  children,
  width = "2xl",
  loading = false,
  flush = false,
  className = "",
}: {
  children?: ReactNode;
  width?: keyof typeof WIDTH;
  loading?: boolean;
  flush?: boolean;
  className?: string;
}) {
  const w = WIDTH[width];
  const gutter = "px-[var(--page-gutter)]";
  const flushStyle = flush
    ? ({ "--page-bottom-clearance": "0px" } as CSSProperties)
    : undefined;

  if (loading) {
    return (
      <main
        data-page-shell
        data-page-shell-width={width}
        className={`${w} mx-auto ${gutter} pt-16 ${flush ? "" : "pb-[var(--page-bottom-clearance)]"} w-full flex items-start justify-center`}
        style={flushStyle}
      >
        <span className="ks-spinner" role="status" aria-label="Laden" />
      </main>
    );
  }
  return (
    <main
      data-page-shell
      data-page-shell-width={width}
      className={`${w} mx-auto ${gutter} ${flush ? "" : "pt-6 pb-[var(--page-bottom-clearance)]"} w-full ${className}`}
      style={flushStyle}
    >
      {children}
    </main>
  );
}