"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useMotionSafe } from "@/lib/motion";

type Props = Omit<ComponentPropsWithoutRef<"div">, "children" | "id" | "aria-hidden" | "inert"> & {
  open: boolean;
  id: string;
  children: ReactNode;
  contentClassName?: string;
};

/** Persistent, reversible disclosure. Keep padding inside the clipped grid child. */
export default function DisclosureBody({
  open, id, children, className = "", contentClassName = "", style, ...attributes
}: Props) {
  const t = useMotionSafe();
  return (
    <div
      {...attributes}
      id={id}
      className={`ks-disclosure-body ${className}`}
      aria-hidden={!open}
      inert={open ? undefined : true}
      style={{
        ...style,
        display: "grid",
        gridTemplateRows: open ? "1fr" : "0fr",
        opacity: open ? 1 : 0,
        transition: t.reduced
          ? "none"
          : "grid-template-rows var(--motion-disclosure) var(--motion-ease), opacity var(--motion-state) var(--motion-ease)",
      }}
    >
      <div className="min-h-0 overflow-hidden">
        <div className={contentClassName}>{children}</div>
      </div>
    </div>
  );
}
