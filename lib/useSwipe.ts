"use client";
import { useRef, useCallback } from "react";

interface SwipeOptions {
  threshold?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** Called each frame with raw delta (negative = left) */
  onMove?: (delta: number) => void;
}

export function useSwipe({
  threshold = 60,
  onSwipeLeft,
  onSwipeRight,
  onMove,
}: SwipeOptions = {}) {
  const startX = useRef<number | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (startX.current === null || !onMove) return;
      onMove(e.touches[0].clientX - startX.current);
    },
    [onMove]
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (startX.current === null) return;
      const delta = e.changedTouches[0].clientX - startX.current;
      if (delta < -threshold) onSwipeLeft?.();
      else if (delta > threshold) onSwipeRight?.();
      startX.current = null;
    },
    [threshold, onSwipeLeft, onSwipeRight]
  );

  return { onTouchStart, onTouchMove, onTouchEnd };
}
