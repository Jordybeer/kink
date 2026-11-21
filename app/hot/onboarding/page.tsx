"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { KinkStatus } from "@/types";
import StatusOptionRows from "@/components/StatusOptionRows";
import Onboarding from "@/components/Onboarding";

function ExampleAnswer() {
  const [example, setExample] = useState<KinkStatus>(null);
  return <div className="mt-3">
    <p className="mb-2 text-sm text-[var(--text2)]">Probeer een antwoord. Dit voorbeeld wordt niet bewaard.</p>
    <StatusOptionRows current={example} onSelect={setExample} presentation="list" />
  </div>;
}

export default function OnboardingStudy() {
  const router = useRouter();
  const rehearsal = useMemo(() => ({ vocabulary: <ExampleAnswer /> }), []);
  return <Onboarding rehearsal={rehearsal} onComplete={() => router.replace("/hot")} />;
}
