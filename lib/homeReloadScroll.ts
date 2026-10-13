export function resetHomeScrollOnReload(): (() => void) | undefined {
  const navigation = window.performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (navigation?.type !== "reload" || window.location.pathname !== "/" || window.location.hash) return;

  const reset = () => {
    if (window.location.pathname === "/" && !window.location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  };
  let frame: number | undefined;
  // Hydration may finish before or after the browser restores the old offset.
  // A bfcache return keeps its scroll position; only a full reload starts at Home.
  const onPageShow = (event: PageTransitionEvent) => {
    if (!event.persisted) frame = window.requestAnimationFrame(reset);
  };
  reset();
  window.addEventListener("pageshow", onPageShow, { once: true });
  return () => {
    window.removeEventListener("pageshow", onPageShow);
    if (frame !== undefined) window.cancelAnimationFrame(frame);
  };
}
