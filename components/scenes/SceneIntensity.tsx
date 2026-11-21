import type { SceneItem } from "@/types";

export function SceneArcBar({ items }: { items: SceneItem[] }) {
  if (items.length === 0) return null;
  const counts = { zacht: 0, midden: 0, intens: 0 };
  for (const it of items) counts[it.intensity]++;
  const total = items.length;
  const segments = [
    { key: "zacht" as const, color: "var(--willing)", flex: counts.zacht / total },
    { key: "midden" as const, color: "var(--maybe)", flex: counts.midden / total },
    { key: "intens" as const, color: "var(--hard-no)", flex: counts.intens / total },
  ].filter((s) => s.flex > 0);

  return (
    <div
      className="flex rounded-full overflow-hidden"
      style={{ height: 4, gap: 2 }}
      role="img"
      aria-label={`Energie-arc: ${counts.zacht} zacht, ${counts.midden} midden, ${counts.intens} intens`}
    >
      {segments.map((s) => (
        <div
          key={s.key}
          className="scene-arc-segment rounded-full"
          style={{ flex: s.flex, background: s.color, opacity: 0.75 }}
        />
      ))}
    </div>
  );
}

export function intensityColor(v: SceneItem["intensity"]) {
  return v === "zacht" ? "var(--willing)" : v === "midden" ? "var(--maybe)" : "var(--hard-no)";
}

interface IntensityOptionsProps {
  value: SceneItem["intensity"];
  onChange: (value: SceneItem["intensity"]) => void;
  disabled?: boolean;
}

export function SceneIntensityOptions({ value, onChange, disabled = false }: IntensityOptionsProps) {
  return (["zacht", "midden", "intens"] as const).map((v) => {
    const active = value === v;
    const c = intensityColor(v);
    return (
      <button type="button"
        key={v}
        onClick={() => onChange(v)}
        disabled={disabled}
        aria-pressed={active}
        className="focus-ring ks-motion-choice rounded-full border px-3 text-xs disabled:opacity-60"
        style={{
          minHeight: 44,
          background: active ? `color-mix(in srgb, ${c} 20%, transparent)` : "transparent",
          borderColor: active ? c : "var(--border)",
          color: active ? c : "var(--text2)",
        }}
      >
        {v === "zacht" ? "Zacht" : v === "midden" ? "Midden" : "Intens"}
      </button>
    );
  });
}
