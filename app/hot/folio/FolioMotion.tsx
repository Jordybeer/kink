"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { FOLIO_HOME, profileForId } from "./fixtures";
import { createInk, dressInk, measureAnchors, pose, type Flight } from "./identityFlight";

const MODES = { folio: "Folio · WAAPI", gsap: "Folio · GSAP", aperture: "Opening", direct: "Direct" } as const;
type Mode = keyof typeof MODES;
type Gsap = typeof import("gsap")["gsap"];
type Frame = Record<string, string | number>;
const TRAVEL = "cubic-bezier(.45,0,.18,1)";
const REDUCE = "(prefers-reduced-motion: reduce)";
const BLOCKER = '[aria-modal="true"], dialog[open], [role="status"].fixed.inset-0';

type Journey = {
  id: string; destination: string; started: number; mode: Mode; pace: number; interrupt: number;
  flights: Flight[]; covered: HTMLElement[]; stops: (() => void)[];
  phase: "waiting" | "measuring" | "playing";
};

const ArrivalContext = createContext<(screen: HTMLElement, id?: string) => void>(() => {});
export const useFolioArrival = () => useContext(ArrivalContext);

function screenForPath(path: string) {
  return path === FOLIO_HOME ? "home" : path.startsWith(FOLIO_HOME + "/") ? path.slice(FOLIO_HOME.length + 1) : "";
}

export default function FolioMotion({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("folio");
  const [slow, setSlow] = useState(false);
  const [interrupt, setInterrupt] = useState(0);
  const [late, setLate] = useState(false);
  const [still, setStill] = useState(false);
  const [report, setReport] = useState("");
  const host = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const currentScreen = useRef<HTMLElement | null>(null);
  const active = useRef<Journey | null>(null);
  const engine = useRef<Gsap | null>(null);
  const [engineState, setEngineState] = useState<"idle" | "ready" | "failed">("idle");

  useEffect(() => {
    if (mode !== "gsap" || engine.current) return;
    let mounted = true;
    Promise.all([import("gsap"), import("gsap/CustomEase")]).then(([{ gsap }, { CustomEase }]) => {
      if (!mounted) return;
      gsap.registerPlugin(CustomEase);
      CustomEase.create("folio-travel", ".45,0,.18,1");
      engine.current = gsap;
      setEngineState("ready");
    }).catch(() => { if (mounted) setEngineState("failed"); });
    return () => { mounted = false; };
  }, [mode]);

  const clear = useCallback(() => {
    const journey = active.current;
    if (!journey) return;
    active.current = null;
    for (const stop of journey.stops) stop();
    for (const element of journey.covered) element.removeAttribute("data-folio-covered");
    for (const { ink } of journey.flights) ink.remove();
  }, []);

  useLayoutEffect(() => {
    const media = matchMedia(REDUCE);
    const capture = (path: string, nativeGesture = false) => {
      const screen = currentScreen.current;
      const origin = screen?.dataset.folioScreen;
      const next = screenForPath(path);
      const profile = profileForId(origin === "home" ? next : origin ?? "");
      if (!screen?.isConnected || !origin || !next || origin === next || !profile || (origin !== "home" && next !== "home")) {
        clear();
        return;
      }
      const animate = layer.current && mode !== "direct" && !(mode === "gsap" && !engine.current) &&
        !still && !late && !nativeGesture && !media.matches && !document.hidden && navigator.onLine &&
        typeof screen.animate === "function" && !document.querySelector(BLOCKER);
      const source = animate ? measureAnchors(screen, profile.id) : [];
      // Read the visible ink before cancelling the last journey. The actual hero/row
      // already has its final hit geometry, even during a halfway reversal.
      const previous = active.current?.id === profile.id ? active.current.flights : [];
      const starts = source.map(anchor => previous.find(item => item.part === anchor.part)?.ink.getBoundingClientRect() ?? anchor.rect);
      clear();
      const journey: Journey = { id: profile.id, destination: next, started: performance.now(), mode,
        pace: slow ? 4 : 1, interrupt, flights: [], covered: [], stops: [], phase: "waiting" };
      active.current = journey;
      source.forEach((anchor, index) => {
        const ink = createInk(anchor.part, profile);
        dressInk(ink, anchor);
        ink.style.transform = pose(starts[index], anchor.rect, anchor.part);
        layer.current!.append(ink);
        anchor.element.dataset.folioCovered = "";
        journey.flights.push({ part: anchor.part, ink, origin: anchor.rect });
        journey.covered.push(anchor.element);
      });
      if (journey.flights.length) {
        // If the router aborts or replaces the source with an error/loading shell,
        // leave the real UI in charge. A mounted but slow route can still hand off.
        const observer = new MutationObserver(() => {
          if (document.querySelector(BLOCKER) || (journey.phase === "waiting" && !screen.isConnected)) clear();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        journey.stops.push(() => observer.disconnect());
      }
      const expiry = setTimeout(() => {
        if (active.current !== journey || journey.phase !== "waiting") return;
        clear();
        // A failed or very slow response must release the source, but focus should
        // still reach the real heading or return link if that destination arrives.
        active.current = { ...journey, flights: [], covered: [], stops: [] };
      }, 160);
      journey.stops.push(() => clearTimeout(expiry));
    };
    const onClick = (event: MouseEvent) => {
      if (event.button || event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.origin !== location.origin || link.target || link.hash || link.hasAttribute("download")) return;
      capture(link.pathname);
    };
    // Let the OS own interactive edge-swipes. Ordinary history Back/Forward can
    // share the same measured endpoints without intercepting or rewriting history.
    let edgeX: number | null = null;
    let edgeTravel = 0;
    const touchStart = (event: TouchEvent) => {
      const x = event.touches[0]?.clientX;
      edgeX = x !== undefined && (x < 24 || x > innerWidth - 24) ? x : null;
      edgeTravel = 0;
    };
    const touchMove = (event: TouchEvent) => {
      if (edgeX !== null && Math.abs(event.touches[0].clientX - edgeX) > 28) { edgeTravel = performance.now(); clear(); }
    };
    const traverse = (path: string) => {
      const destination = screenForPath(path);
      // Some browsers deliver popstate after the App Router has already committed.
      if (destination && (currentScreen.current?.dataset.folioScreen === destination || active.current?.destination === destination)) return;
      capture(path, edgeTravel > 0 && performance.now() - edgeTravel < 1000);
    };
    const pop = () => traverse(location.pathname);
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    const beforeTraversal = (event: Event) => {
      const { navigationType, destination } = event as Event & {
        navigationType: string; destination: { sameDocument: boolean; url: string };
      };
      if (navigationType === "traverse" && destination.sameDocument) traverse(new URL(destination.url).pathname);
    };
    const scroll = () => { if (active.current?.phase !== "measuring") clear(); };
    const theme = new MutationObserver(clear);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const events = new AbortController();
    const options = { capture: true, passive: true, signal: events.signal };
    document.addEventListener("click", onClick, options);
    window.addEventListener("touchstart", touchStart, options);
    window.addEventListener("touchmove", touchMove, options);
    navigation?.addEventListener("navigate", beforeTraversal, options);
    window.addEventListener("popstate", pop, options);
    window.addEventListener("resize", clear, options);
    window.addEventListener("scroll", scroll, { passive: true, signal: events.signal });
    window.addEventListener("pagehide", clear, options);
    document.addEventListener("visibilitychange", clear, options);
    media.addEventListener("change", clear);
    return () => { events.abort(); media.removeEventListener("change", clear); theme.disconnect(); clear(); };
  }, [clear, mode, slow, interrupt, still, late]);

  const arrive = useCallback((screen: HTMLElement, profileId?: string) => {
    const previous = currentScreen.current?.dataset.folioScreen;
    currentScreen.current = screen;
    const journey = active.current;
    if (!journey) {
      // On a post-commit traversal there is no source left to measure.
      // Restore the actual row for keyboard users even on that direct path.
      if (!profileId && previous && profileForId(previous)) {
        screen.querySelector<HTMLElement>(`[data-folio-open="${previous}"]`)?.focus({ preventScroll: true });
      }
      return;
    }
    if (journey.phase !== "waiting") return;
    if (journey.destination !== (profileId ?? "home")) { clear(); return; }
    journey.phase = "measuring";
    const elapsed = Math.round(performance.now() - journey.started);
    const focus = profileId ? screen.querySelector<HTMLElement>("h1") : screen.querySelector<HTMLElement>(`[data-folio-open="${journey.id}"]`);
    focus?.focus({ preventScroll: true });
    const direct = () => { clear(); setReport(`Direct geopend · route ${elapsed} ms`); };
    if (!journey.flights.length || document.hidden || matchMedia(REDUCE).matches) { direct(); return; }
    // Mask only the destination ink immediately, including if scroll restoration
    // hasn't finished yet. The links, heading and their focus rings stay live.
    for (const { part } of journey.flights) {
      const element = screen.querySelector<HTMLElement>(`[data-folio-${part}~="${journey.id}"]`);
      if (element) { element.dataset.folioCovered = ""; journey.covered.push(element); }
    }
    // The destination can paint before rAF runs. Give background content its
    // entrance pose in the commit, while the persistent identity stays visible.
    const paper = profileId ? screen.querySelector<HTMLElement>(journey.mode === "aperture" ? "#studio-interests" : "[data-folio-body]") :
      journey.mode === "aperture" ? screen.querySelector<HTMLElement>("[data-folio-home-heading]") : screen;
    if (paper) {
      paper.dataset.folioArrival = journey.mode === "aperture" ? "aperture" : profileId ? "detail" : "home";
      journey.stops.push(() => paper.removeAttribute("data-folio-arrival"));
    }
    const frame = requestAnimationFrame(() => {
      if (active.current !== journey) return;
      const targets = measureAnchors(screen, journey.id);
      const starts = journey.flights.map(({ ink }) => ink.getBoundingClientRect());
      const portraitIndex = journey.flights.findIndex(item => item.part === "avatar");
      const portraitTarget = targets.find(item => item.part === "avatar")?.rect;
      let fraction = 1;
      if (portraitIndex !== -1 && portraitTarget) {
        // A reversal near its row has very little distance left to cover.
        const distance = (rect: DOMRect) => Math.hypot(rect.left - portraitTarget.left, rect.top - portraitTarget.top, rect.width - portraitTarget.width);
        const full = distance(journey.flights[portraitIndex].origin);
        if (full > 1) fraction = Math.max(.35, Math.min(1, Math.sqrt(distance(starts[portraitIndex]) / full)));
      }
      const duration = Math.round((profileId ? 560 : 400) * journey.pace * fraction);
      journey.phase = "playing";
      const play = (element: HTMLElement, from: Frame, to: Frame, ms: number) => {
        if (journey.mode === "gsap" && engine.current) {
          const tween = engine.current.fromTo(element, from, { ...to, duration: ms / 1000, ease: "folio-travel" });
          journey.stops.push(() => tween.revert());
          return new Promise<void>(resolve => { tween.eventCallback("onComplete", resolve); });
        }
        const animation = element.animate([from, to], { duration: ms, easing: TRAVEL, fill: "both" });
        journey.stops.push(() => animation.cancel());
        return animation.finished;
      };
      const animations: Promise<unknown>[] = [];
      try {
        journey.flights.forEach(({ part, ink }, index) => {
          const target = targets.find(anchor => anchor.part === part);
          const start = starts[index];
          const incompatible = target && part === "name" && Math.abs(start.width / target.rect.width - start.height / target.rect.height) > .4;
          if (!target || incompatible) {
            ink.remove();
            screen.querySelector(`[data-folio-${part}~="${journey.id}"]`)?.removeAttribute("data-folio-covered");
            return;
          }
          dressInk(ink, target);
          animations.push(play(ink, { transform: pose(start, target.rect, part) }, { transform: pose(target.rect, target.rect, part) }, duration));
        });
        if (!animations.length) { direct(); return; }
        if (paper) {
          const opening = journey.mode === "aperture";
          animations.push(play(paper,
            opening ? { clipPath: "inset(0 0 94% 0)" } : profileId ? { opacity: .32, transform: "translateY(12px)" } : { opacity: .48 },
            opening ? { clipPath: "inset(0)" } : profileId ? { opacity: 1, transform: "translateY(0)" } : { opacity: 1 }, duration * .83));
          paper.removeAttribute("data-folio-arrival");
        }
        setReport(`${MODES[journey.mode]} · route ${elapsed} ms · beweging ${duration} ms`);
        if (profileId && journey.interrupt) {
          const timer = setTimeout(() => {
            if (active.current === journey) host.current?.querySelector<HTMLAnchorElement>("[data-folio-return]")?.click();
          }, duration * journey.interrupt / 100);
          journey.stops.push(() => clearTimeout(timer));
        }
        Promise.all(animations).then(() => { if (active.current === journey) clear(); }, () => { if (active.current === journey) direct(); });
      } catch { direct(); }
    });
    journey.stops.push(() => cancelAnimationFrame(frame));
  }, [clear]);

  return <ArrivalContext.Provider value={arrive}>
    <div ref={host} data-folio-mode={mode} data-folio-engine={engineState}>
      {children}
      <div ref={layer} className="folio-flight-layer" aria-hidden="true" inert />
      <details className="folio-bench">
        <summary>Overgang vergelijken</summary>
        <fieldset className="folio-modes">
          <legend className="sr-only">Bewegingstechniek</legend>
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
        </fieldset>
      </details>
      <Link data-folio-return href={FOLIO_HOME} className="focus-ring folio-return">Terug naar profielkeuze</Link>
    </div>
  </ArrivalContext.Provider>;
}
