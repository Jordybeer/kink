"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageShell from "@/components/PageShell";
import { useContractStore } from "@/lib/contractStore";
import { useLegacyContractMigration } from "@/hooks/useLegacyContractMigration";

function TimelineBridge() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const series = useContractStore((state) => state.series);
  const contractsReady = useLegacyContractMigration();
  const aId = searchParams.get("a");
  const bId = searchParams.get("b");

  const target = useMemo(() => {
    if (!aId || !bId || aId === bId) return "/contracts";

    const match = [...series]
      .filter((item) => {
        const participantIds = item.participants.map((participant) => participant.profileId);
        return participantIds.includes(aId) && participantIds.includes(bId);
      })
      .sort((left, right) => right.updatedAt - left.updatedAt)[0];

    return match
      ? `/contracts/${encodeURIComponent(match.id)}/history`
      : "/contracts";
  }, [aId, bId, series]);

  useEffect(() => {
    if (!contractsReady) return;
    router.replace(navigator.onLine ? target : "/contracts");
  }, [contractsReady, router, target]);

  return <PageShell loading width="2xl" />;
}

export default function TimelinePage() {
  return (
    <Suspense fallback={<PageShell loading width="2xl" />}>
      <TimelineBridge />
    </Suspense>
  );
}
