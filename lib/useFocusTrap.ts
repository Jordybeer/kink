import { useEffect, type RefObject } from "react";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !ref.current) return;
    const el = ref.current;
    const focusable = () => Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const hadTabIndex = el.hasAttribute("tabindex");
    if (!hadTabIndex) el.setAttribute("tabindex", "-1");

    // Focus the dialog itself instead of its first action. A long, scrollable
    // sheet often has its first button at the bottom; iOS Safari would scroll
    // that button into view and open the sheet halfway down.
    el.focus({ preventScroll: true });

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const els = focusable();
      if (!els.length) return;
      const last = els[els.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === els[0] || document.activeElement === el) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        els[0].focus();
      }
    }

    el.addEventListener("keydown", onKeyDown);
    return () => {
      el.removeEventListener("keydown", onKeyDown);
      if (!hadTabIndex) el.removeAttribute("tabindex");
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [active, ref]);
}
