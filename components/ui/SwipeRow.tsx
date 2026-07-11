"use client";
import { useState, useCallback, type ReactNode } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useSwipe } from "@/lib/useSwipe";

const ACTION_W = 70;
const SPRING = { type: "spring", stiffness: 400, damping: 40 } as const;

export interface SwipeAction {
  label: string;
  icon?: ReactNode;
  /** Background colour — use a CSS var or hex. Defaults to var(--surface2). */
  color?: string;
  textColor?: string;
  onClick?: () => void;
}

interface Props {
  children: ReactNode;
  actions: SwipeAction[];
}

export default function SwipeRow({ children, actions }: Props) {
  const [revealed, setRevealed] = useState(false);
  const revealWidth = actions.length * ACTION_W;
  const x = useMotionValue(0);

  /* Clamp raw drag delta and pipe it into the motion value */
  const handleMove = useCallback(
    (delta: number) => {
      const base = revealed ? -revealWidth : 0;
      const clamped = Math.min(0, Math.max(-revealWidth, base + delta));
      x.set(clamped);
    },
    [revealed, revealWidth, x]
  );

  const open = useCallback(() => {
    animate(x, -revealWidth, SPRING);
    setRevealed(true);
  }, [x, revealWidth]);

  const close = useCallback(() => {
    animate(x, 0, SPRING);
    setRevealed(false);
  }, [x]);

  const { onTouchStart, onTouchMove, onTouchEnd } = useSwipe({
    threshold: 40,
    onSwipeLeft: open,
    onSwipeRight: close,
    onMove: handleMove,
  });

  /* Snap on finger lift */
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      onTouchEnd(e);
      /* If finger ended mid-drag, snap to nearest state */
      const current = x.get();
      if (current < -revealWidth / 2) open();
      else close();
    },
    [onTouchEnd, x, revealWidth, open, close]
  );

  /* Action button opacity fades in as row slides */
  const actionsOpacity = useTransform(x, [0, -revealWidth * 0.5], [0, 1]);

  return (
    <div
      className="relative overflow-hidden rounded-[20px]"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {/* Revealed actions */}
      <motion.div
        aria-hidden={!revealed}
        className="absolute right-0 top-0 bottom-0 flex"
        style={{ opacity: actionsOpacity }}
      >
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={() => { action.onClick?.(); close(); }}
            className="flex flex-col items-center justify-center gap-1 text-xs font-medium active:scale-[0.97] transition-transform duration-150"
            style={{
              width: ACTION_W,
              background: action.color ?? "var(--surface2)",
              color: action.textColor ?? "var(--text)",
              border: "none",
            }}
            aria-label={action.label}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </motion.div>

      {/* Swipeable content */}
      <motion.div
        className="relative z-10 cursor-grab active:cursor-grabbing"
        style={{ x, touchAction: "pan-y" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => revealed && close()}
      >
        {children}
      </motion.div>
    </div>
  );
}
