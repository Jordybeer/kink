"use client";

import { useState, useId, type CSSProperties, type ReactNode } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import DisclosureBody from "@/components/ui/DisclosureBody";
import { useMotionSafe } from "@/lib/motion";

interface Props {
  trigger: ReactNode | ((open: boolean) => ReactNode);
  icon?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  triggerClassName?: string;
  triggerStyle?: CSSProperties;
  contentClassName?: string;
}

/** Flat disclosure: its caller owns the surface and content spacing. */
export default function Accordion({
  trigger, icon, children, defaultOpen = false, open: controlledOpen, onOpenChange,
  className = "", triggerClassName = "", triggerStyle, contentClassName,
}: Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const id = useId();
  const bodyId = `acc-body-${id}`;
  const t = useMotionSafe();

  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => {
          const next = !open;
          if (controlledOpen === undefined) setUncontrolledOpen(next);
          onOpenChange?.(next);
        }}
        className={`focus-ring ks-motion-choice flex min-h-11 w-full items-center gap-3 text-left text-sm ${triggerClassName}`}
        style={triggerStyle}
      >
        {icon && <span className="flex flex-none items-center" aria-hidden="true">{icon}</span>}
        <span className="min-w-0 flex-1">{typeof trigger === "function" ? trigger(open) : trigger}</span>
        <motion.span
          initial={false}
          animate={{ rotate: open ? 180 : 0 }}
          transition={t.fast}
          className="flex flex-none items-center justify-center"
          style={{ color: "var(--text2)" }}
          aria-hidden="true"
        >
          <CaretDown size={16} weight="bold" aria-hidden="true" />
        </motion.span>
      </button>
      <DisclosureBody open={open} id={bodyId} contentClassName={contentClassName}>
        {children}
      </DisclosureBody>
    </div>
  );
}
