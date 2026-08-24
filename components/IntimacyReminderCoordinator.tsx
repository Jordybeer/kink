"use client";

import { useCallback, useEffect } from "react";
import { useIntimacyHasHydrated, useIntimacyStore } from "@/lib/intimacyStore";
import {
  intimacyReminderFingerprint,
  shouldSendIntimacyReminder,
} from "@/lib/intimacyReminder";

const RECEIPT_KEY = "kinksync-intimacy-reminder-receipts";
const MAX_RECEIPTS = 300;

function readReceipts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(RECEIPT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .filter(([, value]) => typeof value === "number" && Number.isFinite(value)),
    );
  } catch {
    return {};
  }
}

function markReceipt(fingerprint: string, sentAt: number) {
  try {
    const receipts = readReceipts();
    receipts[fingerprint] = sentAt;
    const newest = Object.entries(receipts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_RECEIPTS);
    localStorage.setItem(RECEIPT_KEY, JSON.stringify(Object.fromEntries(newest)));
  } catch {
    // A notification receipt is best-effort metadata. Never block the app when
    // storage is unavailable; duplicate protection simply falls back to the
    // browser's notification tag for that session.
  }
}

async function showReminder(entryId: string) {
  const title = "Privé moment komt dichterbij";
  const options: NotificationOptions = {
    body: "Er staat binnenkort een privé moment gepland.",
    icon: "/icon-192.png",
    tag: `intimacy-reminder-${entryId}`,
  };

  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.showNotification(title, options);
      return;
    }
  }

  new Notification(title, options);
}

export default function IntimacyReminderCoordinator() {
  const hydrated = useIntimacyHasHydrated();
  const entries = useIntimacyStore((state) => state.entries);

  const checkReminders = useCallback(async () => {
    if (!hydrated || typeof Notification === "undefined" || Notification.permission !== "granted") return;

    const now = new Date();
    const receipts = readReceipts();

    for (const entry of entries) {
      if (!shouldSendIntimacyReminder(entry, now)) continue;
      const fingerprint = intimacyReminderFingerprint(entry);
      if (!fingerprint || receipts[fingerprint]) continue;

      try {
        await showReminder(entry.id);
        markReceipt(fingerprint, Date.now());
        receipts[fingerprint] = Date.now();
      } catch {
        // Browsers may revoke notification permission or suspend service worker
        // access between checks. Leave the reminder unsent so a later foreground
        // check can try again if permission becomes available.
      }
    }
  }, [entries, hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    void checkReminders();
    const interval = window.setInterval(() => void checkReminders(), 60_000);
    const onFocus = () => void checkReminders();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void checkReminders();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [checkReminders, hydrated]);

  return null;
}
