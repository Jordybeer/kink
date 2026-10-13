"use client";

import { useMotionActivity } from "@/lib/useMotionActivity";

/** The existing lavender/salmon connection, still when nobody can see it. */
export default function RelationThread({ className = "" }: { className?: string }) {
  const { ref, active } = useMotionActivity<HTMLSpanElement>();
  return <span ref={ref} className={`ks-relation-thread ${className}`} aria-hidden="true" data-motion-paused={!active} />;
}
