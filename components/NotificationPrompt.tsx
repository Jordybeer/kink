"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/Toast";

/**
 * One-time, post-onboarding nudge for existing users to enable notifications.
 * Renders nothing — it only fires an effect. iOS-in-the-browser can't be
 * collared into permissions outside Settings, so we silently skip there.
 */
export default function NotificationPrompt() {
  const { showToast } = useToast();
  const onboardingComplete = useStore((s) => s.onboardingComplete);
  const asked = useStore((s) => s.notificationPermissionAsked);
  const setAsked = useStore((s) => s.setNotificationPermissionAsked);

  useEffect(() => {
    if (!onboardingComplete || asked) return;
    if (typeof Notification === "undefined") return;

    const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);
    const isStandalone =
      (navigator as Navigator & { standalone?: boolean }).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;

    // iOS in a browser tab can't request permission — mark asked, stay quiet.
    if (isIOS && !isStandalone) {
      setAsked();
      return;
    }

    // Permission already granted or hard-denied — nothing to nudge.
    if (Notification.permission !== "default") {
      setAsked();
      return;
    }

    // Mark immediately so a reload mid-toast never re-prompts.
    setAsked();
    showToast({
      message: "Wil je meldingen ontvangen?",
      action: {
        label: "Inschakelen",
        onClick: () => {
          void Notification.requestPermission();
        },
      },
    });
  }, [onboardingComplete, asked, setAsked, showToast]);

  return null;
}
