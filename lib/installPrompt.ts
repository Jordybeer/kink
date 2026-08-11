// Module-level singleton for the beforeinstallprompt event.
// Populated by the inline <script> in app/layout.tsx before any JS module runs,
// which is the only way to reliably capture the event on fast devices.

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export type IosInstallBrowser = "safari" | "chrome" | "other" | null;

/**
 * Classify the iOS browser without touching browser globals so the decision can
 * be tested independently from hydration. iPadOS can identify itself as a Mac;
 * touch points distinguish that case from desktop Safari.
 */
export function detectIosInstallBrowser(
  userAgent: string,
  platform = "",
  maxTouchPoints = 0,
): IosInstallBrowser {
  const isIos = /iP(hone|ad|od)/i.test(userAgent)
    || (platform === "MacIntel" && maxTouchPoints > 1);

  if (!isIos) return null;
  if (/CriOS/i.test(userAgent)) return "chrome";
  if (/(FxiOS|EdgiOS|OPiOS)/i.test(userAgent)) return "other";
  return "safari";
}

let _deferred: BeforeInstallPromptEvent | null = null;

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
}

export function clearInstallPrompt(): void {
  _deferred = null;
  delete (window as Window & { __installPrompt?: BeforeInstallPromptEvent }).__installPrompt;
}
