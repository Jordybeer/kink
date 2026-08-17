"use client";
import { type ReactNode } from "react";

export interface TabItem<T extends string> {
  value: T;
  label: string;
  icon: ReactNode;
}

interface Props<T extends string> {
  tabs: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
}

export default function TabBar<T extends string>({ tabs, value, onChange }: Props<T>) {
  return (
    <nav
      className="flex justify-between rounded-[28px] px-3 py-2"
      style={{
        background: "rgba(20,20,20,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
      aria-label="Main navigation"
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className="flex flex-1 flex-col items-center gap-1 py-2 transition-[color,transform] duration-150 active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none"
            style={{
              background: "transparent",
              border: "none",
              color: active ? "white" : "var(--text2)",
            }}
          >
            <span
              aria-hidden="true"
              className={`flex transition-transform duration-200 motion-reduce:transform-none motion-reduce:transition-none ${active ? "-translate-y-0.5 scale-[1.06]" : ""}`}
            >
              {tab.icon}
            </span>

            <span className="text-[11px] font-semibold leading-none">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
