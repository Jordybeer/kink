"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ProfileScreen from "@/components/profile/ProfileScreen";
import PageShell from "@/components/PageShell";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProfilePage({ params }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusQuestions = searchParams.get("focus") === "questionnaire";

  useEffect(() => {
    if (!focusQuestions) return;
    router.replace(`${pathname}/questions`);
  }, [focusQuestions, pathname, router]);

  if (focusQuestions) return <PageShell loading width="2xl" />;
  return <ProfileScreen params={params} />;
}
