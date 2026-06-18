interface Props {
  safeword?: string;
}

export default function SafewordRibbon({ safeword }: Props) {
  if (!safeword) return null;
  return (
    <div
      className="-mx-4 px-4 flex items-center mb-5"
      style={{
        background: "color-mix(in srgb, var(--hard-no) 10%, transparent)",
        height: 32,
      }}
    >
      <span className="text-xs font-bold uppercase tracking-widest flex-none mr-3" style={{ color: "var(--hard-no)" }}>
        Safeword
      </span>
      <span className="text-sm font-semibold" style={{ color: "var(--hard-no)" }}>{safeword}</span>
    </div>
  );
}
