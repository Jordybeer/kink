"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { FOLIO_HOME, profileForId } from "./fixtures";

const MODES = { folio: "Folio · WAAPI", gsap: "Folio · GSAP", aperture: "Opening", direct: "Direct" } as const;
type Mode = keyof typeof MODES;
type Part = "avatar" | "name" | "role" | "rule";
type Gsap = typeof import("gsap")["gsap"];
type Frame = Record<string, string | number>;
type Geometry = Partial<Record<Part, DOMRect>>;
type Journey = { id: string; destination: string; geometry: Geometry; started: number };
const PARTS: Part[] = ["avatar", "name", "role", "rule"];
const ARRIVAL_WINDOW = 220;

function anchors(root: HTMLElement, id: string) {
  return PARTS.map(part => ({
    part,
    element: root.querySelector<HTMLElement>(`[data-folio-${part}~="${CSS.escape(id)}"]`),
  }));
}

function visible(rect: DOMRect) {
  return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
}

const ArrivalContext = createContext<(screen: HTMLElement, id?: string) => void>(() => {});
export const useFolioArrival = () => useContext(ArrivalContext);

export default function FolioMotion({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("folio");
  const [slow, setSlow] = useState(false);
  const [interrupt, setInterrupt] = useState(0);
  const [late, setLate] = useState(false);
  const [still, setStill] = useState(false);
  const [report, setReport] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const host = useRef<HTMLDivElement>(null);
  const pending = useRef<Journey | null>(null);
  const effects = useRef(new Set<() => void>());
  const engine = useRef<Gsap | null>(null);
  const [engineState, setEngineState] = useState<"idle" | "loading" | "ready" | "failed">("idle");

  useEffect(() => {
    if (mode !== "gsap" || engine.current) return;
    let active = true;

    Promise.all([import("gsap"), import("gsap/CustomEase")]).then(([{ gsap }, { CustomEase }]) => {
      if (!active) return;
      gsap.registerPlugin(CustomEase);
      CustomEase.create("folio-arrival", ".22,.78,.18,1");
      engine.current = gsap;
      setEngineState("ready");
    }).catch(() => { if (active) setEngineState("failed"); });
    return () => { active = false; };
  }, [mode]);

  const clear = useCallback(() => {
    pending.current = null;
    clearTimeout(timer.current);
    for (const stop of effects.current) stop();
    effects.current.clear();
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    function capture(destination: string) {
      const screen = host.current?.querySelector<HTMLElement>("[data-folio-screen]");
      const origin = screen?.dataset.folioScreen;
      const next = destination === FOLIO_HOME ? "home" : destination.slice((FOLIO_HOME + "/").length);
      if (!screen || !origin || origin === next || (origin !== "home" && next !== "home")) {
        clear();
        return;
      }
      const id = origin === "home" ? next : origin;
      if (!profileForId(id)) { clear(); return; }
      const geometry: Geometry = {};
      for (const { part, element } of anchors(screen, id)) {
        const rect = element?.getBoundingClientRect();
        if (rect && visible(rect)) geometry[part] = rect;
      }
      // Sample while the previous motion is still live, preserving a halfway return.
      // Leave it running until the actual router commit, even if loading takes longer.
      pending.current = { id, destination: next, started: performance.now(), geometry };
    }
    function onClick(event: MouseEvent) {
      if (event.button || event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.origin !== location.origin || link.target || link.hasAttribute("download")) return;
      if (link.pathname === FOLIO_HOME || link.pathname.startsWith(FOLIO_HOME + "/")) capture(link.pathname);
      else clear();
    }
    const pop = () => capture(location.pathname);
    const theme = new MutationObserver(clear);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", pop, true);
    window.addEventListener("resize", clear);
    window.addEventListener("pagehide", clear);
    document.addEventListener("visibilitychange", clear);
    media.addEventListener("change", clear);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", pop, true);
      window.removeEventListener("resize", clear);
      window.removeEventListener("pagehide", clear);
      document.removeEventListener("visibilitychange", clear);
      media.removeEventListener("change", clear);
      theme.disconnect();
      clear();
    };
  }, [clear]);

  const arrive = useCallback((screen: HTMLElement, profileId?: string) => {
    const journey = pending.current;
    clear();
    if (!journey || journey.destination !== (profileId ?? "home")) return;
    const focus = profileId ? screen.querySelector<HTMLElement>("h1") : screen.querySelector<HTMLElement>(`[data-folio-open="${journey.id}"]`);
    focus?.focus({ preventScroll: true });
    const elapsed = Math.round(performance.now() - journey.started);
    if (mode === "direct" || late || elapsed > ARRIVAL_WINDOW || document.hidden || still ||
        matchMedia("(prefers-reduced-motion: reduce)").matches || typeof screen.animate !== "function") {
      setReport(`Direct geopend · route ${elapsed} ms`);
      return;
    }

    const measured = anchors(screen, journey.id).map(anchor => ({ ...anchor, to: anchor.element?.getBoundingClientRect() }));
    const duration = (mode === "aperture" ? 460 : 560) * (slow ? 4 : 1);
    setReport(`${MODES[mode]} · route ${elapsed} ms · beweging ${duration} ms`);
    if (profileId && interrupt) {
      timer.current = setTimeout(() => {
        // An explicit link activation samples the in-flight rects just like a manual return.
        host.current?.querySelector<HTMLAnchorElement>("[data-folio-return]")?.click();
      }, duration * interrupt / 100);
    }
    function play(element: HTMLElement, from: Frame, to: Frame) {
      if (mode === "gsap") {
        if (!engine.current) return;
        const tween = engine.current.fromTo(element, from, {
          ...to,
          duration: duration / 1000,
          ease: "folio-arrival",
          onComplete: () => { stop(); effects.current.delete(stop); },
        });
        const stop = () => { tween.revert(); };
        effects.current.add(stop);
      } else {
        const animation = element.animate([from, to], { duration, easing: "cubic-bezier(.22,.78,.18,1)" });
        const stop = () => animation.cancel();
        effects.current.add(stop);
        animation.onfinish = () => { effects.current.delete(stop); };
      }
    }
    for (const { part, element, to } of measured) {
      const from = journey.geometry[part];
      if (!element || !to || !from || !visible(to)) continue;
      const x = from.left - to.left, y = from.top - to.top;
      const sx = from.width / to.width;
      const sy = part === "rule" ? 1 : from.height / to.height;
      if (part !== "rule" && Math.abs(sx - sy) > 0.65) continue;
      play(element,
        { transform: `translate(${x}px, ${y}px) scale(${sx}, ${sy})` },
        { transform: "none" },
      );
    }
    if (profileId) {
      const body = screen.querySelector<HTMLElement>("[data-folio-body]");
      if (body && mode === "aperture") {
        play(body, { clipPath: "inset(44% 0 54% 0)" }, { clipPath: "inset(0)" });
      } else if (body) {
        play(body, { transform: "translateY(1.5rem)", opacity: .15 }, { transform: "none", opacity: 1 });
      }
    }
  }, [clear, mode, slow, late, still, interrupt]);

  return <ArrivalContext.Provider value={arrive}>
    <div ref={host} data-folio-mode={mode} data-folio-engine={engineState}>
      {children}
      <fieldset className="folio-modes">
        <legend>Overgang vergelijken</legend>
        {Object.entries(MODES).map(([key, label]) => (
          <label key={key}>
            <input type="radio" name="folio-treatment" value={key} checked={mode === key} onChange={() => { clear(); setMode(key as Mode); }} /> {label}
          </label>
        ))}
        {mode === "gsap" && engineState !== "ready" && <p role="status" className="text-xs">
          {engineState === "failed" ? "GSAP kon niet laden. De navigatie opent direct." : "GSAP wordt geladen…"}
        </p>}
        <details className="folio-review">
          <summary>Proefbediening</summary>
          <label><input type="checkbox" checked={slow} onChange={e => setSlow(e.target.checked)} /> 0,25× snelheid</label>
          <label><input type="checkbox" checked={still} onChange={e => setStill(e.target.checked)} /> Minder beweging</label>
          <label><input type="checkbox" checked={late} onChange={e => setLate(e.target.checked)} /> Simuleer late aankomst (direct openen)</label>
          <label>Automatisch terug <select value={interrupt} onChange={e => setInterrupt(Number(e.target.value))}>
            <option value={0}>Uit</option>{[25,50,75].map(value => <option key={value} value={value}>{value}%</option>)}
          </select></label>
          <output>{report}</output>
        </details>
        <Link data-folio-return href={FOLIO_HOME} className="focus-ring folio-return">Terug naar profielkeuze</Link>
      </fieldset>
    </div>
  </ArrivalContext.Provider>;
}
