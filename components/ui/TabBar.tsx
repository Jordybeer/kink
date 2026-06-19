"use client";
import { type ReactNode } from "react";
import { motion } from "framer-motion";

const SPRING = { type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.2 } as const;

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
      className="flex justify-between px-3 py-2 rounded-[28px]"
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
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className="flex-1 flex flex-col items-center gap-1 py-2 transition-colors duration-200 active:scale-[0.97]"
            style={{
              background: "transparent",
              border: "none",
              color: active ? "white" : "var(--text2)",
            }}
          >
            {tab.icon}

            <span className="text-[10px] font-semibold leading-none">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
