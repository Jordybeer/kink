import { notFound } from "next/navigation";
import { profileForId } from "../fixtures";
import FolioScreen from "../FolioScreen";

export default async function FolioProfile({ params }: { params: Promise<{ id: string }> }) {
  const profile = profileForId((await params).id);
  if (!profile) notFound();
  return <FolioScreen profile={profile} />;
}
