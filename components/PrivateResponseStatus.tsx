"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import type { KinkStatus } from "@/types";
import { STATUS_LABEL, STATUS_VAR } from "@/lib/statusLabels";
import { useMotionSafe } from "@/lib/motion";
import StatusGlyph from "@/components/StatusGlyph";
import styles from "./PrivateResponseStatus.module.css";

interface Props {
  status: KinkStatus;
  privateResponse?: boolean;
  concealed?: boolean;
  subject: string;
  onReveal?: () => void;
  onConceal?: () => void;
  compact?: boolean;
  readable?: boolean;
  plain?: boolean;
}

export default function PrivateResponseStatus({
  status,
  privateResponse = false,
  concealed = false,
  subject,
  onReveal,
  onConceal,
  compact = false,
  readable = false,
  plain = false,
}: Props) {
  const t = useMotionSafe();
  const [playCompactReveal, setPlayCompactReveal] = useState(false);
  // A preference change can cancel an effect, but only a new reveal starts one.
  if (playCompactReveal && (concealed || t.reduced)) setPlayCompactReveal(false);
  const sizeClass = readable
    ? "text-sm px-2 py-1"
    : compact
      ? "text-sm px-1.5 py-0.5"
      : "text-sm px-1.5 py-0.5 w-[var(--status-pill-width)]";
  const sharedClass = plain
    ? "focus-ring inline-flex min-h-11 min-w-11 max-w-full flex-wrap items-center justify-center gap-1.5 whitespace-normal text-center text-sm font-medium [overflow-wrap:anywhere]"
    : `focus-ring rounded-full border inline-flex items-center justify-center gap-1 ${readable ? "min-w-0 max-w-full whitespace-normal [overflow-wrap:anywhere] text-center" : "whitespace-nowrap"} ${sizeClass}`;

  if (!status) {
    return <span className="text-sm" style={{ color: "var(--text2)" }}>—</span>;
  }

  const colour = STATUS_VAR[status];
  const statusStyle = plain
    ? { color: colour }
    : {
        color: colour,
        borderColor: `color-mix(in srgb, ${colour} 35%, transparent)`,
        background: `color-mix(in srgb, ${colour} 15%, transparent)`,
        borderStyle: status === "hard_no" ? "dashed" : "solid",
      } as const;

  if (!privateResponse) {
    return (
      <span className={sharedClass} style={statusStyle}>
        <StatusGlyph status={status} />
        {STATUS_LABEL[status]}
      </span>
    );
  }

  if (plain) {
    return (
      <button
        type="button"
        onClick={() => {
          if (concealed) {
            setPlayCompactReveal(!t.reduced);
            onReveal?.();
          } else {
            setPlayCompactReveal(false);
            onConceal?.();
          }
        }}
        aria-label={concealed ? `Privéantwoord voor ${subject} tonen` : `Privéantwoord voor ${subject}, ${STATUS_LABEL[status]}, opnieuw verbergen`}
        className={`focus-ring flex min-h-11 min-w-11 max-w-full items-center justify-end rounded-lg text-right text-sm font-medium ${styles.compactControl}`}
        style={concealed ? { color: "var(--text2)" } : statusStyle}
      >
        {concealed ? (
          <span className={styles.compactLabel} aria-hidden="true">
            <EyeSlash size={13} className="shrink-0" />
            Privé
          </span>
        ) : (
          <span
            className={playCompactReveal ? `${styles.compactLabel} ${styles.reveal}` : styles.compactLabel}
            aria-hidden="true"
            onAnimationEnd={() => setPlayCompactReveal(false)}
          >
            <Eye size={13} className="shrink-0" />
            <StatusGlyph status={status} />
            <span className="min-w-0 [overflow-wrap:anywhere]">{STATUS_LABEL[status]}</span>
          </span>
        )}
      </button>
    );
  }

  const control = concealed ? (
    <motion.button
      key="concealed"
      type="button"
      onClick={onReveal}
      aria-label={`Privéantwoord voor ${subject} tonen`}
      className={`${sharedClass} col-start-1 row-start-1`}
      style={{ color: "var(--text2)", borderColor: "var(--border)", background: "var(--tag-muted)" }}
      initial={{ opacity: 0, filter: "blur(4px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, filter: "blur(4px)" }}
      transition={t.fast}
    >
      <EyeSlash size={readable ? 13 : compact ? 10 : 10} aria-hidden="true" />
      Privé
    </motion.button>
  ) : (
    <motion.button
      key="revealed"
      type="button"
      onClick={onConceal}
      aria-label={`Privéantwoord voor ${subject}, ${STATUS_LABEL[status]}, opnieuw verbergen`}
      className={`${sharedClass} col-start-1 row-start-1`}
      style={statusStyle}
      initial={{ opacity: 0, filter: "blur(4px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, filter: "blur(4px)" }}
      transition={t.fast}
    >
      <Eye size={readable ? 13 : compact ? 10 : 10} aria-hidden="true" />
      <StatusGlyph status={status} />
      <span>{STATUS_LABEL[status]}</span>
    </motion.button>
  );

  return (
    <span className="inline-grid flex-none">
      <AnimatePresence initial={false} mode="wait">{control}</AnimatePresence>
    </span>
  );
}
