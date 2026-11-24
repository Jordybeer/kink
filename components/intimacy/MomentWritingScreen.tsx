"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { TWEEN_SHEET, useReducedMotionPreference } from "@/lib/motion";
import journal from "./MomentJournal.module.css";

/** Move the shared title and date together. The form and viewport geometry are never animated. */
export function carryMomentIdentity(element: HTMLElement | null | undefined, source: DOMRect | null) {
  if (!element || !source || source.bottom <= 0 || source.top >= window.innerHeight) return;
  const target = element.getBoundingClientRect();
  if (!target.height || target.bottom <= 0 || target.top >= window.innerHeight) return;
  const x = source.left - target.left;
  const y = source.top - target.top;
  if (Math.abs(x) + Math.abs(y) < 3) return;

  const scale = Math.max(0.75, Math.min(1.25, source.height / target.height));
  const timing = TWEEN_SHEET;
  return element.animate(
    [
      { transform: `translate(${x}px, ${y}px) scale(${scale})`, transformOrigin: "top left" },
      { transform: "none", transformOrigin: "top left" },
    ],
    { duration: timing.duration * 1000, easing: `cubic-bezier(${timing.ease.join(",")})` },
  );
}

export default function MomentWritingScreen({
  name, title, context, origin, details, onDetailsChange, onDismiss, onSave, saveLabel, children,
}: {
  name: string;
  title: string;
  context: string;
  origin: DOMRect | null;
  details: boolean;
  onDetailsChange: (details: boolean) => void;
  onDismiss: (origin: DOMRect | null) => void;
  onSave: (origin: DOMRect | null) => void;
  saveLabel: string;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const subject = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotionPreference();

  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    heading.current?.focus({ preventScroll: true });
    return () => element.close();
  }, []);

  useLayoutEffect(() => {
    if (reduced) return;
    const animation = carryMomentIdentity(subject.current, origin);
    return () => animation?.cancel();
  }, [origin, reduced]);

  useLayoutEffect(() => {
    if (body.current) body.current.scrollTop = 0;
  }, [details]);

  function identityPosition() {
    return subject.current?.getBoundingClientRect() ?? null;
  }

  return (
    <dialog ref={dialog} aria-label={name} data-moment-writing className={journal.writingScreen}
      onCancel={(event) => {
        event.preventDefault();
        if (details) onDetailsChange(false);
        else onDismiss(identityPosition());
      }}>
      <form className={journal.writingForm} noValidate onSubmit={(event) => {
        event.preventDefault();
        onSave(identityPosition());
      }}>
        <header className={journal.writingBar}>
          <button type="button" className="focus-ring" aria-label="Terug naar agenda"
            onClick={() => onDismiss(identityPosition())}>
            <ArrowLeft size={18} aria-hidden="true" /> Agenda
          </button>
          <button type="button" className="focus-ring" aria-controls="moment-writing-body"
            aria-expanded={details} onClick={() => onDetailsChange(!details)}>
            {details ? "Naar notitie" : "Details"}
          </button>
        </header>
        <div ref={body} className={journal.writingBody} id="moment-writing-body">
          <div ref={subject} className={journal.writingSubject}>
            <h2 ref={heading} tabIndex={-1} className={journal.writingTitle}>{title}</h2>
            <p>{context}</p>
          </div>
          {children}
        </div>
        <footer className={journal.writingFooter}>
          <button type="submit" className={`focus-ring ks-motion-choice ${journal.save}`}>{saveLabel}</button>
        </footer>
      </form>
    </dialog>
  );
}
