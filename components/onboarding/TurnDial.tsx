'use client';

import { useCallback, useRef, useState } from 'react';

interface TurnDialProps {
  onComplete: () => void;
}

const END_ROTATION = 94;
const COMPLETE_AT = 80;
const DETENT_DEGREES = 15;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeDelta(value: number) {
  if (value > 180) return value - 360;
  if (value < -180) return value + 360;
  return value;
}

function pointerAngle(element: HTMLElement, x: number, y: number) {
  const rect = element.getBoundingClientRect();
  return Math.atan2(y - (rect.top + rect.height / 2), x - (rect.left + rect.width / 2)) * (180 / Math.PI);
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern);
  }
}

export default function TurnDial({ onComplete }: TurnDialProps) {
  const rotationRef = useRef(0);
  const lastAngleRef = useRef<number | null>(null);
  const lastDetentRef = useRef(0);
  const doneRef = useRef(false);
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState(false);

  const applyRotation = useCallback((value: number, emitDetent = false) => {
    rotationRef.current = value;
    setRotation(value);

    if (!emitDetent) return;
    const detent = Math.floor(value / DETENT_DEGREES);
    if (detent > 0 && detent !== lastDetentRef.current) {
      lastDetentRef.current = detent;
      vibrate(7);
    }
  }, []);

  const complete = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(true);
    setDragging(false);
    vibrate([16, 20, 28]);
    applyRotation(END_ROTATION);
    window.setTimeout(onComplete, 320);
  }, [applyRotation, onComplete]);

  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (doneRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    lastAngleRef.current = pointerAngle(event.currentTarget, event.clientX, event.clientY);
    lastDetentRef.current = Math.floor(rotationRef.current / DETENT_DEGREES);
    setDragging(true);
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragging || doneRef.current || lastAngleRef.current === null) return;

    const nextAngle = pointerAngle(event.currentTarget, event.clientX, event.clientY);
    const delta = clamp(normalizeDelta(nextAngle - lastAngleRef.current), -18, 18);
    lastAngleRef.current = nextAngle;

    const next = clamp(rotationRef.current + delta, 0, END_ROTATION);
    applyRotation(next, true);
    if (next >= COMPLETE_AT) complete();
  }

  function finishPointer(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    lastAngleRef.current = null;
    setDragging(false);

    if (!doneRef.current && rotationRef.current < COMPLETE_AT) {
      lastDetentRef.current = 0;
      applyRotation(0);
    }
  }

  function onClick(event: React.MouseEvent<HTMLButtonElement>) {
    // Pointer taps must never bypass the turn gesture. A synthetic click with
    // detail 0 keeps keyboard and assistive-tech activation available.
    if (event.detail === 0) complete();
  }

  return (
    <div className="rounded-3xl border px-5 py-6 text-center" style={{ background: 'var(--surface)', borderColor: done ? 'var(--border-accent)' : 'var(--border)' }}>
      <div className="relative mx-auto h-44 w-44" aria-hidden="true">
        {Array.from({ length: 24 }, (_, index) => (
          <span key={index} className="absolute left-1/2 top-1/2 h-2 w-px rounded-full" style={{ background: index % 6 === 0 ? 'var(--text2)' : 'var(--border)', transform: `translate(-50%, -50%) rotate(${index * 15}deg) translateY(-82px)` }} />
        ))}
        <span className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full" style={{ background: 'var(--accent)', boxShadow: '0 0 18px var(--accent-glow)' }} />
      </div>
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onClick={onClick}
        disabled={done}
        aria-label={done ? 'Geopend' : 'Draai open, naar KinkSync'}
        className="focus-ring relative mx-auto -mt-40 flex h-36 w-36 touch-none select-none items-center justify-center rounded-full border disabled:cursor-default"
        style={{
          background: 'radial-gradient(circle at 35% 30%, var(--surface2), var(--surface3))',
          borderColor: done ? 'var(--border-accent)' : 'var(--border)',
          boxShadow: done ? '0 0 0 1px var(--border-accent), 0 14px 40px var(--accent-glow)' : '0 12px 32px rgba(0, 0, 0, 0.16)',
          transform: `rotate(${rotation}deg)`,
          transition: dragging ? 'none' : 'transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1), border-color 200ms ease, box-shadow 200ms ease',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span aria-hidden="true" className="absolute left-1/2 top-3 h-7 w-1.5 -translate-x-1/2 rounded-full" style={{ background: 'var(--accent)' }} />
        <span aria-hidden="true" className="absolute inset-[29%] rounded-full border" style={{ borderColor: 'var(--border)' }} />
        <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ background: 'var(--text)', opacity: done ? 0.9 : 0.65 }} />
      </button>
      <p className="mt-6 text-sm font-semibold" style={{ color: done ? 'var(--accent)' : 'var(--text)' }}>{done ? 'Open' : 'Draai tot de stip'}</p>
      <span className="sr-only" aria-live="polite">{done ? 'Geopend.' : 'Draai de knop met de klok mee. Met toetsenbord kan Enter of spatie worden gebruikt.'}</span>
    </div>
  );
}
