"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Check, LockKey, LockKeyOpen } from "@phosphor-icons/react";
import { useMotionSafe } from "@/lib/motion";

interface TurnDialProps {
  onComplete: () => void;
}

const END_ROTATION = 92;
const COMPLETE_AT = 78;
const DETENT_DEGREES = 15;
const MIN_GESTURE_MS = 320;
const MIN_TRAVEL_PX = 52;

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
  const t = useMotionSafe();
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

  function applyRotation(next: number, withFeedback = false) {
    rotationRef.current = next;
    setRotation(next);

    if (!withFeedback) return;
    const detent = Math.floor(next / DETENT_DEGREES);
    if (detent > lastDetentRef.current) {
      lastDetentRef.current = detent;
      vibrate(6);
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
    vibrate([14, 18, 26]);
    window.setTimeout(onComplete, t.reduced ? 0 : 360);
  }

  function resetGesture() {
    previousAngleRef.current = null;
    previousPointRef.current = null;
    travelRef.current = 0;
    startedAtRef.current = 0;
  }

  function returnToStart() {
    setDragging(false);
    setArmed(false);
    lastDetentRef.current = 0;
    resetGesture();
    applyRotation(0);
  }

  function releaseCapture(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
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
    releaseCapture(event);

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

  function cancelPointer(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragging || done) return;
    event.preventDefault();
    releaseCapture(event);
    returnToStart();
  }

  const progress = Math.min(rotation / END_ROTATION, 1);
  const hint = done ? "Open." : armed ? "Loslaten om te openen" : "Draai met de klok mee";

  return (
    <div className="mx-auto flex w-full max-w-[19rem] flex-col items-center py-1">
      <button
        type="button"
        aria-label="Draai open en ga naar KinkSync"
        aria-describedby="onboarding-turn-dial-hint"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={cancelPointer}
        onClick={(event) => {
          // Keyboard and assistive-technology activation remain a deliberate fallback.
          if (event.detail === 0 && !done) complete();
        }}
        className="focus-ring relative flex touch-none select-none items-center justify-center rounded-full"
        style={{
          width: "clamp(9rem, 23dvh, 11rem)",
          height: "clamp(9rem, 23dvh, 11rem)",
          background: "radial-gradient(circle at 36% 30%, var(--surface), var(--surface2) 55%, var(--surface3))",
          border: `1px solid ${armed || done ? "var(--accent)" : "var(--border-accent)"}`,
          boxShadow: armed || done
            ? "inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 48px color-mix(in srgb, var(--accent) 22%, transparent)"
            : "inset 0 1px 0 rgba(255,255,255,0.08), 0 16px 40px rgba(0,0,0,0.24)",
          cursor: dragging ? "grabbing" : "grab",
          transition: t.reduced ? "none" : "border-color 180ms ease, box-shadow 220ms ease",
        }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-2 rounded-full"
          style={{
            border: `1px solid ${armed || done ? "color-mix(in srgb, var(--accent) 34%, transparent)" : "color-mix(in srgb, var(--border-accent) 45%, transparent)"}`,
            transition: t.reduced ? "none" : "border-color 180ms ease",
          }}
        />

        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 200 200">
          <path
            d="M 100 20 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="var(--border-accent)"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.55"
          />
          <path
            d="M 100 20 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="3"
            strokeLinecap="round"
            pathLength="1"
            strokeDasharray={`${progress} 1`}
            style={{ transition: dragging || t.reduced ? "none" : "stroke-dasharray 280ms cubic-bezier(0.22, 1, 0.36, 1)" }}
          />
          <circle cx="100" cy="20" r="3.5" fill="var(--text2)" opacity="0.7" />
          <circle
            cx="180"
            cy="100"
            r="8"
            fill="none"
            stroke={armed || done ? "var(--accent)" : "var(--text2)"}
            strokeWidth="1.5"
            opacity={armed || done ? 0.9 : 0.45}
          />
          <circle cx="180" cy="100" r="3.5" fill={armed || done ? "var(--accent)" : "var(--text2)"} />
        </svg>

        <span
          aria-hidden="true"
          className="pointer-events-none absolute flex items-start justify-center rounded-full"
          style={{
            inset: "10%",
            transform: `rotate(${rotation}deg)`,
            transition: dragging || t.reduced ? "none" : "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <span
            className="h-2.5 w-2.5 -translate-y-1/2 rounded-full"
            style={{
              background: armed || done ? "var(--accent)" : "var(--text)",
              boxShadow: armed || done
                ? "0 0 0 5px color-mix(in srgb, var(--accent) 16%, transparent)"
                : "0 0 0 3px color-mix(in srgb, var(--surface) 82%, transparent)",
            }}
          />
        </span>

        <span
          aria-hidden="true"
          className="relative z-10 flex items-center justify-center rounded-full"
          style={{
            width: "46%",
            height: "46%",
            background: done ? "var(--accent)" : "var(--surface)",
            color: done ? "var(--on-accent)" : armed ? "var(--accent)" : "var(--text)",
            border: `1px solid ${armed || done ? "var(--border-accent)" : "var(--border)"}`,
            boxShadow: armed || done
              ? "inset 0 1px 0 rgba(255,255,255,0.1), 0 0 0 7px color-mix(in srgb, var(--accent) 8%, transparent)"
              : "inset 0 1px 0 rgba(255,255,255,0.07)",
            transform: done ? "scale(0.97)" : armed ? "scale(1.03)" : "scale(1)",
            transition: t.reduced ? "none" : "background 180ms ease, color 180ms ease, border-color 180ms ease, box-shadow 220ms ease, transform 160ms ease",
          }}
        >
          {done
            ? <Check size={30} weight="bold" />
            : armed
              ? <LockKeyOpen size={30} weight="duotone" />
              : <LockKey size={29} weight="duotone" />}
        </span>
      </button>

      <p
        id="onboarding-turn-dial-hint"
        aria-live="polite"
        className="mt-4 min-h-5 text-center text-sm font-semibold"
        style={{ color: done || armed ? "var(--accent)" : "var(--text)" }}
      >
        {hint}
      </p>
    </div>
  );
}
