// Module-level singleton for the beforeinstallprompt event.
// Populated by the inline <script> in app/layout.tsx before any JS module runs,
// which is the only way to reliably capture the event on fast devices.

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
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
