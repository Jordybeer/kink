"use client";

interface Props {
  profileName: string;
  onDone: () => void;
}

export default function CheckIn({ profileName: _profileName, onDone }: Props) {
  const moods: { emoji: string; label: string }[] = [
    { emoji: "😌", label: "Rustig" },
    { emoji: "🤔", label: "Onzeker" },
    { emoji: "😰", label: "Zenuwachtig" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, var(--bg) 0%, var(--surface2) 50%, var(--bg) 100%)" }}
    >
      <div className="max-w-xs mx-auto text-center px-6">
        {/* Pulse ring */}
        <div
          className="rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 text-4xl"
          style={{ boxShadow: "0 0 40px color-mix(in srgb, var(--accent) 30%, transparent)" }}
        >
          🖤
        </div>

        <h2 className="text-xl font-semibold text-white mb-2">Hoe voel je je nu?</h2>
        <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>
          Neem je tijd — er is geen haast.
        </p>

        <div className="flex gap-4 justify-center">
          {moods.map(({ emoji, label }) => (
            <button
              key={label}
              onClick={onDone}
              aria-label={label}
              className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-2xl transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.3)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)";
              }}
            >
              <span>{emoji}</span>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                {label}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={onDone}
          className="mt-6 text-xs underline underline-offset-2"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          Doorgaan →
        </button>
      </div>
    </div>
  );
}
