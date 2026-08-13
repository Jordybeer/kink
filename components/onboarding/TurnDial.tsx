"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Check, LockKeyOpen } from "@phosphor-icons/react";

interface TurnDialProps {
  onComplete: () => void;
}

const END_ROTATION = 94;
const COMPLETE_AT = 84;
const DETENT_DEGREES = 15;
const MIN_GESTURE_MS = 420;
const MIN_TRAVEL_PX = 72;

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
    vibrate([16, 20, 28]);
    window.setTimeout(onComplete, 320);
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
    <div
      className="mx-auto mt-5 flex w-full max-w-[18rem] flex-col items-center rounded-[1.75rem] px-5 py-5"
      style={{
        background: "color-mix(in srgb, var(--accent) 7%, var(--surface2))",
        border: `1px solid ${armed || done ? "var(--accent)" : "var(--border-accent)"}`,
        boxShadow: armed || done
          ? "0 18px 54px color-mix(in srgb, var(--accent) 20%, transparent)"
          : "0 18px 54px rgba(0,0,0,0.16)",
        transition: "border-color 180ms ease, box-shadow 180ms ease",
      }}
    >
      <button
        type="button"
        aria-label="Draai open en ga naar KinkSync"
        aria-describedby="onboarding-turn-dial-hint"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onClick={(event) => {
          // Keyboard and assistive-technology activation remain a deliberate fallback.
          if (event.detail === 0 && !done) complete();
        }}
        className="focus-ring relative flex h-36 w-36 touch-none select-none items-center justify-center rounded-full"
        style={{
          background: "radial-gradient(circle at 36% 30%, var(--surface), var(--surface2) 54%, var(--surface3))",
          border: "1px solid var(--border-accent)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 34px rgba(0,0,0,0.28)",
          cursor: dragging ? "grabbing" : "grab",
        }}
      >
        <span
          aria-hidden="true"
          className="absolute inset-2 rounded-full"
          style={{ border: "1px dashed color-mix(in srgb, var(--text2) 42%, transparent)" }}
        />
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-2.5 h-3 w-1 -translate-x-1/2 rounded-full"
          style={{ background: "var(--accent)" }}
        />
        <span
          aria-hidden="true"
          className="absolute flex h-[6.25rem] w-[6.25rem] items-start justify-center rounded-full pt-2.5"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: dragging ? "none" : "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{
              background: armed || done ? "var(--accent)" : "var(--text2)",
              boxShadow: armed || done ? "0 0 0 5px color-mix(in srgb, var(--accent) 16%, transparent)" : "none",
            }}
          />
        </span>
        <span
          aria-hidden="true"
          className="relative z-10 flex h-[4.6rem] w-[4.6rem] items-center justify-center rounded-full"
          style={{
            background: done ? "var(--accent)" : "var(--surface)",
            color: done ? "var(--on-accent)" : "var(--text)",
            border: "1px solid var(--border)",
          }}
        >
          {done
            ? <Check size={28} weight="bold" />
            : <LockKeyOpen size={27} weight="duotone" />}
        </span>
      </button>

      <p id="onboarding-turn-dial-hint" className="mt-3 text-center text-sm font-semibold" style={{ color: "var(--text)" }}>
        {done ? "Open." : armed ? "Loslaten om te openen" : "Draai tot de stip"}
      </p>
      <p className="mt-1 text-center text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
        Draai een kwartslag met de klok mee.
      </p>
    </div>
  );
}
