"use client";

import QuestionsScreen from "@/components/profile/QuestionsScreen";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProfileQuestionsPage({ params }: Props) {
  return <QuestionsScreen params={params} />;
}
