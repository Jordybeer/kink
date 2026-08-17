"use client";

import { useReducer } from "react";
import AppLock from "@/components/AppLock";
import { useHasHydrated, useStore } from "@/lib/store";

function sessionIsUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem("app_unlocked") === "1";
  } catch {
    return false;
  }
}

export default function AppLockGate({ children }: { children: React.ReactNode }) {
  const hydrated = useHasHydrated();
  const appLockEnabled = useStore((state) => state.appLockEnabled);
  const appLockPin = useStore((state) => state.appLockPin);
  const biometricEnabled = useStore((state) => state.biometricEnabled);
  const biometricCredentialId = useStore((state) => state.biometricCredentialId);
  const [, refresh] = useReducer((value: number) => value + 1, 0);

  if (!hydrated) {
    return <div className="min-h-dvh" style={{ background: "var(--bg)" }} aria-busy="true" />;
  }

  if (appLockEnabled && !sessionIsUnlocked()) {
    return (
      <AppLock
        storedHash={appLockPin}
        biometricCredentialId={biometricEnabled ? biometricCredentialId : null}
        onUnlock={() => {
          window.sessionStorage.setItem("app_unlocked", "1");
          refresh();
        }}
      />
    );
  }

  return children;
}
