"use client";

import ProfileScreen from "@/components/profile/ProfileScreen";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProfilePage({ params }: Props) {
  return <ProfileScreen params={params} />;
}
