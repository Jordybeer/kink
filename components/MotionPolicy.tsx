"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Site-wide reduced-motion safety net for Framer Motion.
 *
 * The root policy makes Motion respect the operating-system preference for
 * transform/layout animation. Interaction semantics stay explicit: components
 * that should remove tactile press scaling use `useMotionSafe().tap`, so a
 * reduced-motion user never depends on MotionConfig target behavior alone.
 */
export default function MotionPolicy({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
