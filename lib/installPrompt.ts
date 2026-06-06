// Module-level capture for beforeinstallprompt.
// Must be module-level (not React state) because the event fires before hydration.

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let _deferred: BeforeInstallPromptEvent | null = null;

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return _deferred;
}

export function setInstallPrompt(e: BeforeInstallPromptEvent): void {
  _deferred = e;
}

export function clearInstallPrompt(): void {
  _deferred = null;
}
