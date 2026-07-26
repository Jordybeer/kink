import ProfileScreen from "@/components/profile/ProfileScreen";

interface Props {
  searchParams: Promise<{ id?: string | string[] }>;
}

export default function ProfileQueryPage({ searchParams }: Props) {
  const params = searchParams.then(({ id }) => ({
    id: Array.isArray(id) ? (id[0] ?? "") : (id ?? ""),
  }));

  return <ProfileScreen params={params} />;
}
