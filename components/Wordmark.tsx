import type { CSSProperties } from "react";

export default function Wordmark({
  text = "KinkSync",
  className = "",
  breakAt,
  style,
}: {
  text?: string;
  className?: string;
  breakAt?: number;
  style?: CSSProperties;
}) {
  return (
    <span className={`ks-wordmark ${className}`} style={style}>
      {breakAt ? <>{text.slice(0, breakAt)}<wbr />{text.slice(breakAt)}</> : text}
    </span>
  );
}
