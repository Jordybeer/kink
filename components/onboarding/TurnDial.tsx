"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useReducedMotion } from "framer-motion";
import { LockKey, LockKeyOpen } from "@phosphor-icons/react";

interface TurnDialProps {
  onComplete: () => void;
}

const END_ROTATION = 94;
const COMPLETE_AT = 78;
const DETENT_DEGREES = 15;
const MIN_GESTURE_MS = 320;
const MIN_TRAVEL_PX = 56;
const TRACK_RADIUS = 44;
const TRACK_CIRCUMFERENCE = 2 * Math.PI * TRACK_RADIUS;

function pointAngle(element: HTMLElement, clientX: number, clientY: number) {
  const bounds = element.getBoundingClientRect();
  const centerX = bounds.left + bounds.width / 2;
  const centerY = bounds.top + bounds.height / 2;
  return Math.atan2(clientY - centerY, clientX - centerX) * 180 / Math.PI;
}

function normalizedDelta(next: number, previous: number) {
  let delta = next - previous;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return Math.max(-12, Math.min(12, delta));
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(pattern);
  }
}

export default function TurnDial({ onComplete }: TurnDialProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [armed, setArmed] = useState(false);
  const [done, setDone] = useState(false);
  const rotationRef = useRef(0);
  const previousAngleRef = useRef<number | null>(null);
  const lastDetentRef = useRef(0);
  const startedAtRef = useRef(0);
  const travelRef = useRef(0);
  const previousPointRef = useRef<{ x: number; y: number } | null>(null);
  const completingRef = useRef(false);

  const progress = Math.min(rotation / END_ROTATION, 1);
  const progressOffset = TRACK_CIRCUMFERENCE * (1 - progress);

  function applyRotation(next: number, withFeedback = false) {
    rotationRef.current = next;
    setRotation(next);

    if (!withFeedback) return;
    const detent = Math.floor(next / DETENT_DEGREES);
    if (detent > lastDetentRef.current) {
      lastDetentRef.current = detent;
      vibrate(7);
    } else if (detent < lastDetentRef.current) {
      lastDetentRef.current = detent;
    }
  }

  function complete() {
    if (completingRef.current) return;
    completingRef.current = true;
    setArmed(true);
    setDone(true);
    applyRotation(END_ROTATION);
    vibrate([12, 18, 30]);
    window.setTimeout(onComplete, reduceMotion ? 0 : 360);
  }

  function resetGesture() {
    previousAngleRef.current = null;
    previousPointRef.current = null;
    travelRef.current = 0;
    startedAtRef.current = 0;
  }

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (done) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    setArmed(false);
    startedAtRef.current = performance.now();
    travelRef.current = 0;
    previousPointRef.current = { x: event.clientX, y: event.clientY };
    previousAngleRef.current = pointAngle(event.currentTarget, event.clientX, event.clientY);
    vibrate(4);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragging || done || previousAngleRef.current == null) return;
    event.preventDefault();

    const previousPoint = previousPointRef.current;
    if (previousPoint) {
      travelRef.current += Math.hypot(
        event.clientX - previousPoint.x,
        event.clientY - previousPoint.y,
      );
    }
    previousPointRef.current = { x: event.clientX, y: event.clientY };

    const angle = pointAngle(event.currentTarget, event.clientX, event.clientY);
    const delta = normalizedDelta(angle, previousAngleRef.current);
    previousAngleRef.current = angle;
    const next = Math.max(0, Math.min(END_ROTATION, rotationRef.current + delta));
    applyRotation(next, true);

    const longEnough = performance.now() - startedAtRef.current >= MIN_GESTURE_MS;
    const travelledEnough = travelRef.current >= MIN_TRAVEL_PX;
    setArmed(next >= COMPLETE_AT && longEnough && travelledEnough);
  }

  function finishPointer(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragging || done) return;
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const duration = performance.now() - startedAtRef.current;
    const shouldComplete = rotationRef.current >= COMPLETE_AT
      && duration >= MIN_GESTURE_MS
      && travelRef.current >= MIN_TRAVEL_PX;

    setDragging(false);
    resetGesture();

    if (shouldComplete) {
      complete();
      return;
    }

    setArmed(false);
    lastDetentRef.current = 0;
    applyRotation(0);
  }

  return (
    <div className="mx-auto mt-[clamp(0.75rem,2dvh,1rem)] flex w-full max-w-[19rem] flex-col items-center px-2 py-1">
      <button
        type="button"
        aria-label="Draai open en ga naar KinkSync"
        aria-describedby="onboarding-turn-dial-hint"
        data-testid="onboarding-turn-dial"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onClick={(event) => {
          // Keyboard and assistive-technology activation remain a deliberate fallback.
          if (event.detail === 0 && !done) complete();
        }}
        className="focus-ring relative flex h-[clamp(8.25rem,21dvh,9.5rem)] w-[clamp(8.25rem,21dvh,9.5rem)] touch-none select-none items-center justify-center rounded-full border"
        style={{
          background: "radial-gradient(circle at 36% 30%, var(--surface), var(--surface2) 54%, var(--surface3))",
          borderColor: armed || done ? "var(--accent)" : "var(--border-accent)",
          boxShadow: done
            ? "inset 0 1px 0 rgba(255,255,255,0.10), 0 0 0 1px color-mix(in srgb, var(--accent) 34%, transparent), 0 18px 44px color-mix(in srgb, var(--accent) 22%, transparent)"
            : armed
              ? "inset 0 1px 0 rgba(255,255,255,0.09), 0 14px 38px color-mix(in srgb, var(--accent) 16%, transparent)"
              : "inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 34px rgba(0,0,0,0.28)",
          cursor: dragging ? "grabbing" : "grab",
          transition: reduceMotion ? "none" : "border-color 180ms ease, box-shadow 220ms ease",
        }}
      >
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-1.5 h-[calc(100%-0.75rem)] w-[calc(100%-0.75rem)] -rotate-90"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r={TRACK_RADIUS}
            fill="none"
            strokeWidth="1.25"
            style={{ stroke: "color-mix(in srgb, var(--text2) 28%, transparent)" }}
          />
          <circle
            cx="50"
            cy="50"
            r={TRACK_RADIUS}
            fill="none"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeDasharray={TRACK_CIRCUMFERENCE}
            strokeDashoffset={progressOffset}
            style={{
              stroke: "var(--accent)",
              opacity: done ? 1 : armed ? 0.92 : 0.62,
              transition: dragging || reduceMotion ? "none" : "stroke-dashoffset 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease",
            }}
          />
        </svg>

        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1.5 h-2.5 w-1 -translate-x-1/2 rounded-full"
          style={{ background: "color-mix(in srgb, var(--text2) 62%, transparent)" }}
        />
        <span
          aria-hidden="true"
          className="absolute right-1.5 top-1/2 h-1 w-3 -translate-y-1/2 rounded-full"
          style={{
            background: "var(--accent)",
            boxShadow: armed || done ? "0 0 0 4px color-mix(in srgb, var(--accent) 14%, transparent)" : "none",
            transition: reduceMotion ? "none" : "box-shadow 180ms ease",
          }}
        />

        <span
          aria-hidden="true"
          className="absolute inset-[16%] flex items-start justify-center rounded-full pt-1.5"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: dragging || reduceMotion ? "none" : "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{
              background: armed || done ? "var(--accent)" : "var(--text2)",
              boxShadow: armed || done ? "0 0 0 5px color-mix(in srgb, var(--accent) 16%, transparent)" : "none",
              transition: reduceMotion ? "none" : "background 160ms ease, box-shadow 160ms ease",
            }}
          />
        </span>

        <span
          aria-hidden="true"
          className="relative z-10 flex h-[52%] w-[52%] items-center justify-center rounded-full"
          style={{
            background: done ? "var(--accent)" : "var(--surface)",
            color: done ? "var(--on-accent)" : armed ? "var(--accent)" : "var(--text)",
            border: `1px solid ${done ? "var(--accent)" : "var(--border)"}`,
            boxShadow: done
              ? "inset 0 -5px 14px color-mix(in srgb, black 16%, transparent), inset 0 1px 0 rgba(255,255,255,0.16)"
              : "inset 0 1px 0 rgba(255,255,255,0.06)",
            transform: !reduceMotion && done ? "scale(0.94)" : !reduceMotion && armed ? "scale(1.035)" : "scale(1)",
            transition: reduceMotion ? "none" : "background 180ms ease, color 180ms ease, border-color 180ms ease, transform 150ms ease, box-shadow 180ms ease",
          }}
        >
          {done
            ? <LockKeyOpen size={29} weight="duotone" />
            : <LockKey size={28} weight="duotone" />}
        </span>
      </button>

      <p
        id="onboarding-turn-dial-hint"
        className="mt-[clamp(0.75rem,1.8dvh,1rem)] min-h-5 text-center text-sm font-semibold"
        style={{ color: done || armed ? "var(--text)" : "var(--text2)" }}
      >
        {done ? "Open." : armed ? "Loslaten om te openen" : "Draai met de klok mee"}
      </p>
    </div>
  );
}
