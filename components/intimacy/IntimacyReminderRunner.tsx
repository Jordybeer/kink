"use client";

import { useEffect } from "react";
import { useIntimacyHasHydrated, useIntimacyStore } from "@/lib/intimacyStore";
import { showDueIntimacyReminders } from "@/lib/intimacyReminder";

const CHECK_INTERVAL_MS = 60 * 60 * 1_000;

export default function IntimacyReminderRunner() {
  const entries = useIntimacyStore((state) => state.entries);
  const hydrated = useIntimacyHasHydrated();

  useEffect(() => {
    if (!hydrated) return;

    let cancelled = false;
    const check = () => {
      if (!cancelled) void showDueIntimacyReminders(entries);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") check();
    };

    check();
    const interval = window.setInterval(check, CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", check);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", check);
    };
  }, [entries, hydrated]);

  return null;
}
