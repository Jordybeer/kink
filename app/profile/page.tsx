"use client";

import { Suspense, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import PageShell from "@/components/PageShell";
import ProfileRoute from "@/components/profile/ProfileRoute";
import QuestionsScreen from "@/components/profile/QuestionsScreen";
import { profileIdFromLocation } from "@/lib/localRoutes";

function LocalProfileShell() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const id = profileIdFromLocation(pathname, searchParams);
  const params = useMemo(() => Promise.resolve({ id }), [id]);
  const questionsRoute = /^\/profile\/[^/]+\/questions$/.test(pathname);

  return questionsRoute ? <QuestionsScreen params={params} /> : <ProfileRoute id={id} />;
}

export default function ProfileQueryPage() {
  return (
    <Suspense fallback={<PageShell loading width="2xl" />}>
      <LocalProfileShell />
    </Suspense>
  );
}
