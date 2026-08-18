"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useHasHydrated, useStore } from "@/lib/store";

const PUBLIC_ROUTES = ["/", "/about", "/security", "/offline"] as const;

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((route) =>
    route === "/" ? pathname === route : pathname === route || pathname.startsWith(`${route}/`),
  );
}

export default function OnboardingRouteGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hasHydrated = useHasHydrated();
  const onboardingComplete = useStore((state) => state.onboardingComplete);
  const requiresOnboarding = !isPublicRoute(pathname);
  const blocked = requiresOnboarding && hasHydrated && !onboardingComplete;

  useEffect(() => {
    if (blocked) router.replace("/");
  }, [blocked, router]);

  // Fail closed on protected routes: never mount local profile/compare/contract
  // content until persisted onboarding state has been checked.
  if (requiresOnboarding && (!hasHydrated || !onboardingComplete)) return null;

  return children;
}
