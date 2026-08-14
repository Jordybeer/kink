"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Site-wide motion accessibility safety net.
 *
 * `reducedMotion="user"` makes Framer Motion respect the operating-system
 * preference everywhere, including older/direct motion consumers that do not
 * call `useMotionSafe()` themselves. Component-level motion helpers still own
 * timing and presentation details; this provider is the final guardrail.
 */
export default function MotionPolicy({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
