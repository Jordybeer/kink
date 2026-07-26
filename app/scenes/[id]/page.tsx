"use client";

import { useParams } from "next/navigation";
import SceneDetailScreen from "@/components/scenes/SceneDetailScreen";

export default function SceneDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <SceneDetailScreen id={id ?? ""} />;
}
