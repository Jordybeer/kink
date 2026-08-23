"use client";
import { ReactNode } from "react";

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
  if (loading) {
    return (
      <main className={`${w} mx-auto px-4 pt-16 ${flush ? "" : "pb-[var(--page-bottom-clearance)]"} w-full flex items-start justify-center`}>
        <span className="ks-spinner" role="status" aria-label="Laden" />
      </main>
    );
  }
  return (
    <main className={`${w} mx-auto px-4 ${flush ? "" : "pt-6 pb-[var(--page-bottom-clearance)]"} w-full ${className}`}>
      {children}
    </main>
  );
}
