import type { CSSProperties } from "react";

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
  const glowStyle = {
    "--ambient-top-color": topColor,
    "--ambient-bottom-color": bottomColor,
    "--ambient-top-opacity": `${Math.round(topOpacity * 100)}%`,
    "--ambient-bottom-opacity": `${Math.round(bottomOpacity * 100)}%`,
  } as CSSProperties;

  return (
    <div aria-hidden="true" className="ks-ambient-glow pointer-events-none" style={glowStyle}>
      <div className="ks-ambient-orb ks-ambient-orb-top" />
      <div className="ks-ambient-orb ks-ambient-orb-bottom" />
    </div>
  );
}
