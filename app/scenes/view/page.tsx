"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import PageShell from "@/components/PageShell";
import SceneDetailScreen from "@/components/scenes/SceneDetailScreen";
import { sceneIdFromLocation } from "@/lib/localRoutes";

function LocalSceneDetailShell() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return <SceneDetailScreen id={sceneIdFromLocation(pathname, searchParams)} />;
}

export default function SceneDetailQueryPage() {
  return (
    <Suspense fallback={<PageShell loading width="2xl" />}>
      <LocalSceneDetailShell />
    </Suspense>
  );
}
