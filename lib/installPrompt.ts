import { detectClientPlatform } from "@/lib/clientPlatform";

// Module-level singleton for the beforeinstallprompt event.
// Populated by the inline <script> in app/layout.tsx before any JS module runs,
// which is the only way to reliably capture the event on fast devices.

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export type IosInstallBrowser = "safari" | "chrome" | "other" | null;

/**
 * Classify the iOS browser with browser globals kept outside the ropes, so tests
 * can probe the decision without getting hydration tangled in the leash.
 */
export function detectIosInstallBrowser(
  userAgent: string,
  platform = "",
  maxTouchPoints = 0,
): IosInstallBrowser {
  if (detectClientPlatform(userAgent, platform, maxTouchPoints) !== "ios") return null;
  if (/CriOS/i.test(userAgent)) return "chrome";
  if (/(FxiOS|EdgiOS|OPiOS)/i.test(userAgent)) return "other";
  return "safari";
}

export const INSTALL_PROMPT_SNOOZE_MS = 5 * 24 * 60 * 60 * 1000;
export const INSTALL_PROMPT_CHANGE_EVENT = "kinksync:installpromptchange";

export interface InstallPromptPolicy {
  dismissals: number;
  snoozedUntil: number;
  neverAsk: boolean;
}

export const DEFAULT_INSTALL_PROMPT_POLICY: InstallPromptPolicy = {
  dismissals: 0,
  snoozedUntil: 0,
  neverAsk: false,
};

export function shouldAutoShowInstallPrompt(
  policy: InstallPromptPolicy,
  meaningfulUse: boolean,
  now = Date.now(),
): boolean {
  if (!meaningfulUse || policy.neverAsk || policy.dismissals >= 2) return false;
  return now >= policy.snoozedUntil;
}

export function snoozeInstallPrompt(
  policy: InstallPromptPolicy,
  now = Date.now(),
): InstallPromptPolicy {
  const dismissals = Math.min(2, policy.dismissals + 1);
  return {
    ...policy,
    dismissals,
    snoozedUntil: dismissals >= 2 ? 0 : now + INSTALL_PROMPT_SNOOZE_MS,
  };
}

export function disableAutomaticInstallPrompt(policy: InstallPromptPolicy): InstallPromptPolicy {
  return { ...policy, neverAsk: true, snoozedUntil: 0 };
}

export function enableAutomaticInstallPrompt(): InstallPromptPolicy {
  return { ...DEFAULT_INSTALL_PROMPT_POLICY };
}

let _deferred: BeforeInstallPromptEvent | null = null;

function emitInstallPromptChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(INSTALL_PROMPT_CHANGE_EVENT));
  }
}

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  // The inline script stores the raw Event on window; cast it here.
  if (!_deferred && typeof window !== "undefined") {
    const raw = (window as Window & { __installPrompt?: BeforeInstallPromptEvent }).__installPrompt;
    if (raw) _deferred = raw;
  }
  return _deferred;
}

export function setInstallPrompt(e: BeforeInstallPromptEvent): void {
  _deferred = e;
  (window as Window & { __installPrompt?: BeforeInstallPromptEvent }).__installPrompt = e;
  emitInstallPromptChange();
}

export function clearInstallPrompt(): void {
  _deferred = null;
  if (typeof window !== "undefined") {
    delete (window as Window & { __installPrompt?: BeforeInstallPromptEvent }).__installPrompt;
  }
  emitInstallPromptChange();
}
