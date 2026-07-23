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

  return null;
}
