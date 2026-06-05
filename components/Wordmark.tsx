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
      {text}
    </span>
  );
}
