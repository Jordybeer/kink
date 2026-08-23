"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowClockwise, LockKey, LockKeyOpen } from "@phosphor-icons/react";

interface TurnDialProps {
  onComplete: () => void;
}

const END_ROTATION = 236;
const COMPLETE_AT = 224;
const ALMOST_AT = 168;
const DETENT_DEGREES = 15;
const MIN_GESTURE_MS = 320;
const MIN_TRAVEL_PX = 56;
const UNLOCK_SETTLE_MS = 650;

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
  const [hasInteracted, setHasInteracted] = useState(false);
  const rotationRef = useRef(0);
  const previousAngleRef = useRef<number | null>(null);
  const lastDetentRef = useRef(0);
  const startedAtRef = useRef(0);
  const travelRef = useRef(0);
  const previousPointRef = useRef<{ x: number; y: number } | null>(null);
  const completingRef = useRef(false);

  const progressDegrees = Math.max(0, Math.min(rotation, END_ROTATION));
  const hint = done
    ? "Open."
    : armed
      ? "Loslaten om te openen"
      : rotation >= ALMOST_AT
        ? "Bijna…"
        : rotation > 0
          ? "Blijf draaien…"
          : "Draai de kluisschijf naar rechts";

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
    window.setTimeout(onComplete, reduceMotion ? 0 : UNLOCK_SETTLE_MS);
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
    setHasInteracted(true);
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

    // Een kluisschijf springt niet terug naar nul zodra je je hand verplaatst.
    // Bewaar de opgebouwde draaihoek, zodat een telefoonduim comfortabel kan
    // regrippen zonder dat de privacy-metafoor in vingergymnastiek verandert.
    setArmed(false);
  }

  function cancelPointer(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragging || done) return;
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setDragging(false);
    setArmed(false);
    resetGesture();
  }

  return (
    <div className="mx-auto flex w-full max-w-[19rem] flex-col items-center px-2 py-1">
      <motion.button
        type="button"
        aria-label="Draai de kluisschijf naar rechts om KinkSync te openen"
        aria-describedby="onboarding-turn-dial-hint"
        data-testid="onboarding-turn-dial"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={cancelPointer}
        onClick={(event) => {
          // Keyboard and assistive-technology activation remain a deliberate fallback.
          if (event.detail === 0 && !done) complete();
        }}
        animate={done && !reduceMotion
          ? { scale: [1, 1.035, 1.015], y: [0, -2, 0] }
          : { scale: 1, y: 0 }}
        transition={done && !reduceMotion
          ? { duration: 0.52, times: [0, 0.46, 1], ease: "easeOut" }
          : { duration: 0 }}
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
        {done && !reduceMotion && (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-1 rounded-full border"
            style={{ borderColor: "var(--accent)" }}
            initial={{ opacity: 0.52, scale: 0.9 }}
            animate={{ opacity: 0, scale: 1.18 }}
            transition={{ duration: 0.58, ease: "easeOut" }}
          />
        )}

        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-1.5 rounded-full"
          style={{
            background: `conic-gradient(var(--accent) 0deg ${progressDegrees}deg, color-mix(in srgb, var(--text2) 28%, transparent) ${progressDegrees}deg 360deg)`,
            WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 0)",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 0)",
            opacity: done ? 1 : armed ? 0.92 : 0.62,
            transition: reduceMotion ? "none" : "opacity 180ms ease",
          }}
        />

        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1.5 h-2.5 w-1 -translate-x-1/2 rounded-full"
          style={{ background: "color-mix(in srgb, var(--text2) 62%, transparent)" }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-1.5"
          style={{ transform: `rotate(${END_ROTATION}deg)` }}
        >
          <span
            className="absolute left-1/2 top-0 h-3 w-1 -translate-x-1/2 rounded-full"
            style={{
              background: "var(--accent)",
              boxShadow: armed || done ? "0 0 0 4px color-mix(in srgb, var(--accent) 14%, transparent)" : "none",
              transition: reduceMotion ? "none" : "box-shadow 180ms ease",
            }}
          />
        </span>

        <motion.span
          aria-hidden="true"
          className="absolute inset-[16%] flex items-start justify-center rounded-full pt-1.5"
          animate={!hasInteracted && !reduceMotion
            ? { rotate: [0, 12, 0] }
            : { rotate: rotation }}
          transition={!hasInteracted && !reduceMotion
            ? { duration: 0.68, delay: 0.7, ease: "easeInOut" }
            : dragging || reduceMotion
              ? { duration: 0 }
              : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{
              background: armed || done ? "var(--accent)" : "var(--text2)",
              boxShadow: armed || done ? "0 0 0 5px color-mix(in srgb, var(--accent) 16%, transparent)" : "none",
              transition: reduceMotion ? "none" : "background 160ms ease, box-shadow 160ms ease",
            }}
          />
        </motion.span>

        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute right-[12%] top-[10%] flex h-8 w-8 items-center justify-center rounded-full"
          initial={false}
          animate={{ opacity: hasInteracted || done ? 0 : 1, scale: hasInteracted || done ? 0.92 : 1 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
          style={{
            color: "var(--accent)",
            background: "color-mix(in srgb, var(--surface) 84%, transparent)",
            border: "1px solid color-mix(in srgb, var(--accent) 28%, var(--border))",
          }}
        >
          <ArrowClockwise size={19} weight="bold" />
        </motion.span>

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
          {done ? (
            <motion.span
              initial={reduceMotion ? false : { opacity: 0, scale: 0.68, rotate: -16 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.28, ease: "easeOut" }}
            >
              <LockKeyOpen size={29} weight="duotone" />
            </motion.span>
          ) : (
            <LockKey size={28} weight="duotone" />
          )}
        </span>
      </motion.button>

      <p
        id="onboarding-turn-dial-hint"
        className="mt-[clamp(0.75rem,1.8dvh,1rem)] flex min-h-6 items-center justify-center text-center text-sm font-semibold leading-5"
        style={{ color: done || armed ? "var(--text)" : "var(--text2)" }}
      >
        {hint}
      </p>
    </div>
  );
}
