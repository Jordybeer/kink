"use client";

import { useEffect, useMemo } from "react";
import { useHasHydrated } from "@/lib/store";
import {
  buildOfflineWarmupRoutes,
  warmOfflineRoutes,
} from "@/lib/offlineRoutes";
import {
  canonicalizeLocalUrl,
} from "@/lib/localRoutes";

function isPlainLeftClick(event: MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

export default function OfflineCacheWarmup() {
  const hydrated = useHasHydrated();

  // Background warming must never turn local record identifiers into origin
  // requests. Dynamic profile/scene routes use fixed offline shells; contract
  // details remain available offline after an explicit visit/runtime cache.
  const routes = useMemo(() => buildOfflineWarmupRoutes(), []);

  useEffect(() => {
    if (!hydrated || typeof navigator === "undefined") return;

    let cancelled = false;
    let inFlight = false;

    const warm = async () => {
      if (cancelled || inFlight || !navigator.onLine) return;
      inFlight = true;

      const cached = await warmOfflineRoutes(routes);
      if (!cancelled && cached) {
        document.documentElement.dataset.offlineCache = "ready";
      }
      inFlight = false;
    };

    void warm();
    const retry = window.setTimeout(() => void warm(), 2_000);
    window.addEventListener("online", warm);
    navigator.serviceWorker?.addEventListener("controllerchange", warm);

    return () => {
      cancelled = true;
      window.clearTimeout(retry);
      window.removeEventListener("online", warm);
      navigator.serviceWorker?.removeEventListener("controllerchange", warm);
    };
  }, [hydrated, routes]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const navigateFromCache = (event: MouseEvent) => {
      if (navigator.onLine || event.defaultPrevented || !isPlainLeftClick(event)) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const requestedUrl = new URL(anchor.href, window.location.href);
      if (requestedUrl.origin !== window.location.origin) return;
      const url = canonicalizeLocalUrl(requestedUrl);
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search &&
        url.hash
      ) {
        return;
      }

      // Next Link asks for an RSC payload whose router-state and query headers
      // vary per click. Offline, use a real cached HTML document. Legacy profile
      // and scene paths are first folded into their fixed local-first shells.
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.assign(url.href);
    };

    document.addEventListener("click", navigateFromCache, true);
    return () => document.removeEventListener("click", navigateFromCache, true);
  }, []);

  return null;
}
