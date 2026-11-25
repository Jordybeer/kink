import type { CSSProperties } from "react";
import styles from "./FollowUpEmphasis.module.css";

/** Keep all words in normal flow; only paint is animated. The caller supplies
 * the editorial phrase, never an inferred preference or consent meaning. */
export default function FollowUpEmphasis({ text, emphasis }: { text: string; emphasis: string }) {
  const start = text.indexOf(emphasis);
  if (!emphasis || start < 0) return <>{text}</>;
  const end = start + emphasis.length;
  let offset = 0;
  let word = 0;
  const wordCount = text.trim().split(/\s+/).length;
  return <>{text.split(/(\s+)/).map((part, index) => {
    const from = offset;
    offset += part.length;
    if (!part || /^\s+$/.test(part)) return part;
    const marked = from >= start && from < end && from + part.replace(/[.,!?;:]+$/, "").length <= end;
    const delay = Math.round(100 * word++ / Math.max(1, wordCount - 1));
    return (
      <span key={index} className={styles.word} data-follow-up-emphasis={marked || undefined}
        style={{ "--follow-up-delay": `${delay}ms` } as CSSProperties}>{part}</span>
    );
  })}</>;
}
