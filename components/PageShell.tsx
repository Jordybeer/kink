"use client";
import { ReactNode } from "react";
import Link from "next/link";

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
      <main className={`${w} mx-auto px-4 pt-24 ${flush ? "" : "pb-28"} w-full flex items-start justify-center`}>
        <span className="ks-spinner" role="status" aria-label="Laden" />
      </main>
    );
  }
  return (
    <main className={`${w} mx-auto px-4 ${flush ? "" : "pt-8 pb-28"} w-full ${className}`}>
      {children}
    </main>
  );
}

export function PageHeader({
  title,
  back = "/",
  action,
}: {
  title: ReactNode;
  back?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <Link
        href={back}
        className="focus-ring text-sm transition-colors min-h-[44px] inline-flex items-center pr-2"
        style={{ color: "var(--text2)" }}
      >
        ← Terug
      </Link>
      <h1 className="text-xl font-bold flex-1">{title}</h1>
      {action}
    </div>
  );
}
