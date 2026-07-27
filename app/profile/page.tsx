"use client";

import { Suspense, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import PageShell from "@/components/PageShell";
import ProfileScreen from "@/components/profile/ProfileScreen";
import { profileIdFromLocation } from "@/lib/localRoutes";

function LocalProfileShell() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const id = profileIdFromLocation(pathname, searchParams);
  const params = useMemo(() => Promise.resolve({ id }), [id]);

  return <ProfileScreen params={params} />;
}

export default function ProfileQueryPage() {
  return (
    <Suspense fallback={<PageShell loading width="2xl" />}>
      <LocalProfileShell />
    </Suspense>
  );
}
