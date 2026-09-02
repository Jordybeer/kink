interface Props {
  /** Top glow colour. Defaults to the lavender identity hue. */
  topColor?: string;
  /** Bottom glow colour. Defaults to the warm action hue. */
  bottomColor?: string;
  /** Top glow opacity (0–1). Default 0.10. */
  topOpacity?: number;
  /** Bottom glow opacity (0–1). Default 0.05. */
  bottomOpacity?: number;
}

export default function AmbientGlow({
  topColor = "var(--identity-a)",
  bottomColor = "var(--identity-b)",
  topOpacity = 0.10,
  bottomOpacity = 0.05,
}: Props) {
  return (
    <div aria-hidden="true" className="ks-ambient-glow pointer-events-none">
      <div
        className="fixed top-0 left-0 right-0 z-0"
        style={{
          height: 300,
          background: `radial-gradient(ellipse at 50% 0%, color-mix(in srgb, ${topColor} ${Math.round(topOpacity * 100)}%, transparent) 0%, transparent 70%)`,
        }}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-0"
        style={{
          height: 400,
          background: `radial-gradient(ellipse at 50% 100%, color-mix(in srgb, ${bottomColor} ${Math.round(bottomOpacity * 100)}%, transparent) 0%, transparent 70%)`,
        }}
      />
    </div>
  );
}
