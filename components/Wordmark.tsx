import type { CSSProperties } from "react";

export default function Wordmark({
  text = "KinkSync",
  className = "",
  style,
}: {
  text?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span className={`ks-wordmark ${className}`} style={style}>
      <span className="ks-wordmark__text">{text}</span>
      <span className="ks-cursor" aria-hidden="true">_</span>
    </span>
  );
}
