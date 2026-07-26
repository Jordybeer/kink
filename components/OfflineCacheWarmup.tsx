"use client";

import { useEffect, useMemo } from "react";
import { useHasHydrated, useStore } from "@/lib/store";
import {
  buildOfflineWarmupRoutes,
  warmOfflineRoutes,
} from "@/lib/offlineRoutes";

function idsFromKey(key: string): string[] {
  return key ? key.split("\u001f") : [];
}

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
  const profileIdsKey = useStore((state) =>
    state.profiles.map((profile) => profile.id).join("\u001f"),
  );
  const sceneIdsKey = useStore((state) =>
    state.scenes.map((scene) => scene.id).join("\u001f"),
  );

  const routes = useMemo(
    () =>
      buildOfflineWarmupRoutes(
        idsFromKey(profileIdsKey),
        idsFromKey(sceneIdsKey),
      ),
    [profileIdsKey, sceneIdsKey],
  );

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

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return;

      // Next Link asks for an RSC payload whose router-state and query headers
      // vary per click. Offline, use the warmed HTML document instead — this is
      // equally reliable in an installed PWA and an ordinary browser tab.
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.assign(url.href);
    };

    document.addEventListener("click", navigateFromCache, true);
    return () => document.removeEventListener("click", navigateFromCache, true);
  }, []);

  return null;
}
