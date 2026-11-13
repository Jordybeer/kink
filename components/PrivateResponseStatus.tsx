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

  const control = concealed ? (
    <motion.button
      key={plain ? undefined : "concealed"}
      type="button"
      onClick={onReveal}
      aria-label={`Privéantwoord voor ${subject} tonen`}
      className={`${sharedClass} col-start-1 row-start-1`}
      style={plain
        ? { color: "var(--text2)" }
        : { color: "var(--text2)", borderColor: "var(--border)", background: "var(--tag-muted)" }}
      initial={plain ? false : { opacity: 0, filter: "blur(4px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, filter: "blur(4px)" }}
      transition={t.fast}
    >
      <EyeSlash size={readable ? 13 : compact ? 10 : 10} aria-hidden="true" />
      Privé
    </motion.button>
  ) : (
    <motion.button
      key={plain ? undefined : "revealed"}
      type="button"
      onClick={onConceal}
      aria-label={`Privéantwoord voor ${subject}, ${STATUS_LABEL[status]}, opnieuw verbergen`}
      className={`${sharedClass} col-start-1 row-start-1`}
      style={statusStyle}
      initial={plain ? false : { opacity: 0, filter: "blur(4px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, filter: "blur(4px)" }}
      transition={t.fast}
    >
      <Eye size={readable ? 13 : compact ? 10 : 10} aria-hidden="true" />
      <StatusGlyph status={status} />
      <span className={plain ? "min-w-0" : undefined}>{STATUS_LABEL[status]}</span>
    </motion.button>
  );

  return (
    <span className={plain ? "inline-grid min-w-0 max-w-full" : "inline-grid flex-none"}>
      {plain ? control : <AnimatePresence initial={false} mode="wait">{control}</AnimatePresence>}
    </span>
  );
}
