"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useHasHydrated, useStore } from "@/lib/store";
import {
  buildOfflineWarmupRoutes,
  warmOfflineRoutes,
} from "@/lib/offlineRoutes";
import {
  canonicalizeLocalUrl,
  findSingleAddedId,
  profileHref,
  waitForPersistedProfile,
} from "@/lib/localRoutes";

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
  const profileIds = useMemo(() => idsFromKey(profileIdsKey), [profileIdsKey]);
  const latestProfileIds = useRef(profileIds);
  const profileCreateBaseline = useRef<string[] | null>(null);
  latestProfileIds.current = profileIds;

  const routes = useMemo(
    () =>
      buildOfflineWarmupRoutes(
        profileIds,
        idsFromKey(sceneIdsKey),
      ),
    [profileIds, sceneIdsKey],
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

  // The create form still calls router.push(`/profile/${id}`). While offline,
  // remember the ids that existed at submit time. Zustand updates React state
  // before its persist middleware is guaranteed to have finished localStorage;
  // a hard document navigation before that write completes hydrates an empty
  // shell. Wait until the exact newborn id is visibly persisted first.
  useLayoutEffect(() => {
    const baseline = profileCreateBaseline.current;
    if (!hydrated || !baseline || navigator.onLine) return;

    const addedId = findSingleAddedId(baseline, profileIds);
    if (!addedId) return;

    profileCreateBaseline.current = null;
    void waitForPersistedProfile(addedId).then((persisted) => {
      if (!persisted || navigator.onLine) return;
      window.location.assign(profileHref(addedId));
    });
  }, [hydrated, profileIds]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const markOfflineProfileCreate = (event: SubmitEvent) => {
      if (navigator.onLine || window.location.pathname !== "/") return;
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      if (!submit?.textContent?.includes("Sla jezelf vast")) return;
      profileCreateBaseline.current = [...latestProfileIds.current];
    };

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

    document.addEventListener("submit", markOfflineProfileCreate, true);
    document.addEventListener("click", navigateFromCache, true);
    return () => {
      document.removeEventListener("submit", markOfflineProfileCreate, true);
      document.removeEventListener("click", navigateFromCache, true);
    };
  }, []);

  return null;
}
