"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import PageShell from "@/components/PageShell";
import ProfileRoute from "@/components/profile/ProfileRoute";
import { profileIdFromLocation } from "@/lib/localRoutes";

function LocalProfileShell() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const id = profileIdFromLocation(pathname, searchParams);

  return <ProfileRoute id={id} />;
}

export default function ProfileQueryPage() {
  return (
    <Suspense fallback={<PageShell loading width="2xl" />}>
      <LocalProfileShell />
    </Suspense>
  );
}
