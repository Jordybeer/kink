"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import type { KinkStatus } from "@/types";
import { STATUS_LABEL, STATUS_VAR } from "@/lib/statusLabels";
import { useMotionSafe } from "@/lib/motion";
import StatusGlyph from "@/components/StatusGlyph";

interface Props {
  status: KinkStatus;
  privateResponse?: boolean;
  concealed?: boolean;
  subject: string;
  onReveal?: () => void;
  onConceal?: () => void;
  compact?: boolean;
  readable?: boolean;
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
}: Props) {
  const t = useMotionSafe();
  const sizeClass = readable
    ? "text-[14px] px-2 py-1"
    : compact
      ? "text-[11px] px-1.5 py-0.5"
      : "text-xs px-1.5 py-0.5 min-w-[5.5rem]";
  const sharedClass = `focus-ring rounded-full border whitespace-nowrap inline-flex items-center justify-center gap-1 ${sizeClass}`;

  if (!status) {
    return <span className={readable ? "text-[14px]" : "text-xs"} style={{ color: "var(--text2)" }}>—</span>;
  }

  const colour = STATUS_VAR[status];
  const statusStyle = {
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

  return (
    <span className="inline-grid flex-none">
      <AnimatePresence initial={false} mode="wait">
        {concealed ? (
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
            <EyeSlash size={readable ? 13 : compact ? 9 : 10} aria-hidden="true" />
            Privé
          </motion.button>
        ) : (
          <motion.button
            key="revealed"
            type="button"
            onClick={onConceal}
            aria-label={`Privéantwoord voor ${subject} opnieuw verbergen`}
            className={`${sharedClass} col-start-1 row-start-1`}
            style={statusStyle}
            initial={{ opacity: 0, filter: "blur(4px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(4px)" }}
            transition={t.fast}
          >
            <Eye size={readable ? 13 : compact ? 9 : 10} aria-hidden="true" />
            <StatusGlyph status={status} />
            {STATUS_LABEL[status]}
          </motion.button>
        )}
      </AnimatePresence>
    </span>
  );
}
