"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import PageShell from "@/components/PageShell";
import ProfilePage from "./[id]/page";

function LocalProfileShell() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const params = useMemo(() => Promise.resolve({ id }), [id]);

  return <ProfilePage params={params} />;
}

export default function ProfileQueryPage() {
  return (
    <Suspense fallback={<PageShell loading width="2xl" />}>
      <LocalProfileShell />
    </Suspense>
  );
}
