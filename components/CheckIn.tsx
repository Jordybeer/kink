"use client";

import { ArrowRight, HeartStraight, Smiley, SmileyMeh, SmileyNervous } from "@phosphor-icons/react";

interface Props {
  profileName: string;
  onDone: (mood?: string) => void;
}

const MOODS = [
  { icon: Smiley, label: "Rustig" },
  { icon: SmileyMeh, label: "Onzeker" },
  { icon: SmileyNervous, label: "Zenuwachtig" },
] as const;

export default function CheckIn({ profileName, onDone }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, var(--bg) 0%, var(--surface2) 50%, var(--bg) 100%)" }}
    >
      <div className="max-w-xs mx-auto text-center px-6">
        <div
          className="rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6"
          style={{ boxShadow: "0 0 40px color-mix(in srgb, var(--accent) 30%, transparent)", color: "var(--accent)" }}
        >
          <HeartStraight size={40} weight="fill" aria-hidden="true" />
        </div>

        <h2 className="text-xl font-semibold text-white mb-2">
          {profileName ? `Hoe voel je je nu, ${profileName}?` : "Hoe voel je je nu?"}
        </h2>
        <p className="text-sm mb-8" style={{ color: "var(--text2)" }}>
          Neem je tijd, er is geen haast.
        </p>

        <div className="flex gap-4 justify-center">
          {MOODS.map(({ icon: MoodIcon, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => onDone(label)}
              aria-label={label}
              className="focus-ring w-20 h-20 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-colors"
              style={{ border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <MoodIcon size={28} aria-hidden="true" />
              <span className="text-sm" style={{ color: "var(--text2)" }}>
                {label}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onDone()}
          className="focus-ring mt-6 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm underline-offset-2 hover:underline"
          style={{ color: "var(--text2)" }}
        >
          Doorgaan
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
