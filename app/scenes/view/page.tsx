"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PageShell from "@/components/PageShell";
import SceneDetailScreen from "@/components/scenes/SceneDetailScreen";

function LocalSceneDetailShell() {
  const searchParams = useSearchParams();
  return <SceneDetailScreen id={searchParams.get("id") ?? ""} />;
}

export default function SceneDetailQueryPage() {
  return (
    <Suspense fallback={<PageShell loading width="2xl" />}>
      <LocalSceneDetailShell />
    </Suspense>
  );
}
