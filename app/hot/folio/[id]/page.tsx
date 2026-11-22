import { notFound } from "next/navigation";
import { perspectives, profileForId } from "../fixtures";
import type { KinkEntry } from "@/types";
import { ProfileInterests } from "../../profile-study/ProfileStudy";
import FolioScreen from "../FolioScreen";

export function generateStaticParams() {
  return perspectives.map(({ id }) => ({ id }));
}

export default async function FolioProfile({ params }: { params: Promise<{ id: string }> }) {
  const profile = profileForId((await params).id);
  if (!profile) notFound();
  const seed = Object.fromEntries(profile.topics.map((id, index) => [
    id, { status: index === 0 ? "yes" : "maybe", comment: "" } satisfies KinkEntry,
  ]));
  return <FolioScreen profile={profile}>
    <ProfileInterests key={profile.id} profileId={profile.id} seed={seed} />
  </FolioScreen>;
}
