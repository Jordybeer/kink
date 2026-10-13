"use client";

import { useCallback, useEffect, useState } from "react";

const PARTNER_PROFILE_KEY = "kinksync-my-partner-profile";
const PARTNER_PROFILE_EVENT = "kinksync:my-partner-profile";

export function readPartnerProfileId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PARTNER_PROFILE_KEY);
}

export function writePartnerProfileId(profileId: string | null): void {
  if (typeof window === "undefined") return;
  if (profileId) window.localStorage.setItem(PARTNER_PROFILE_KEY, profileId);
  else window.localStorage.removeItem(PARTNER_PROFILE_KEY);
  window.dispatchEvent(new CustomEvent(PARTNER_PROFILE_EVENT, { detail: profileId }));
}

export function usePartnerProfileId(): readonly [string | null, (profileId: string | null) => void] {
  const [partnerProfileId, setPartnerProfileIdState] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setPartnerProfileIdState(readPartnerProfileId());
    const handleCustom = (event: Event) => {
      const detail = (event as CustomEvent<string | null>).detail;
      setPartnerProfileIdState(detail ?? null);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === PARTNER_PROFILE_KEY) setPartnerProfileIdState(event.newValue);
    };

    sync();
    window.addEventListener(PARTNER_PROFILE_EVENT, handleCustom);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(PARTNER_PROFILE_EVENT, handleCustom);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const setPartnerProfileId = useCallback((profileId: string | null) => {
    writePartnerProfileId(profileId);
    setPartnerProfileIdState(profileId);
  }, []);

  return [partnerProfileId, setPartnerProfileId] as const;
}
