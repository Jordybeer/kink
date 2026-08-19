"use client";

import { use } from "react";
import ProfileRoute from "@/components/profile/ProfileRoute";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProfilePage({ params }: Props) {
  const { id } = use(params);
  return <ProfileRoute id={id} />;
}
