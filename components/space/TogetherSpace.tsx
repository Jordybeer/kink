"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowsLeftRight, FileText, UsersThree } from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import SpaceLink from "@/components/space/SpaceLink";
import SpaceSwitcher from "@/components/space/SpaceSwitcher";
import { buildCompareModel } from "@/lib/compareV2";
import { usePartnerProfileId } from "@/lib/partnerPreference";
import { splitProfilesByOwnership } from "@/lib/profileType";
import { useHasHydrated, useStore } from "@/lib/store";
import type { Profile } from "@/types";

function personKey(profile: Profile): string {
  return profile.personGroupId ?? profile.id;
}

function selectClassName() {
  return "focus-ring min-h-12 w-full rounded-xl px-3 text-sm font-semibold";
}

export default function TogetherSpace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const profiles = useStore((state) => state.profiles);
  const pinnedProfileId = useStore((state) => state.pinnedProfileId);
  const hydrated = useHasHydrated();
  const [partnerProfileId] = usePartnerProfileId();

  if (!hydrated) return <PageShell loading width="2xl" />;

  const ownership = splitProfilesByOwnership(profiles, pinnedProfileId);
  const queryA = searchParams.get("a");
  const queryB = searchParams.get("b");
  const fallbackA = ownership.mine.find((profile) => profile.id === pinnedProfileId) ?? ownership.mine[0] ?? profiles[0];
  const profileA = profiles.find((profile) => profile.id === queryA) ?? fallbackA;
  const preferredB = profiles.find((profile) => profile.id === partnerProfileId);
  const bCandidates = profileA ? profiles.filter((profile) => personKey(profile) !== personKey(profileA)) : [];
  const profileB = bCandidates.find((profile) => profile.id === queryB)
    ?? bCandidates.find((profile) => profile.id === preferredB?.id)
    ?? bCandidates[0];

  const replacePair = (aId: string | undefined, bId: string | undefined) => {
    const params = new URLSearchParams();
    if (aId) params.set("a", aId);
    if (bId) params.set("b", bId);
    router.replace(`/together?${params.toString()}`, { scroll: false });
  };

  const model = profileA && profileB ? buildCompareModel(profileA, profileB) : null;
  const matchCount = model ? model.summary.shared + model.summary.complementary : 0;
  const hardCount = model ? model.summary.conflict + model.summary.limit : 0;

  return (
    <PageShell width="2xl" className="lg:max-w-3xl">
      <SpaceSwitcher />
      <section className="rounded-[28px] px-5 py-6 sm:px-7" style={{
        background: "color-mix(in srgb, var(--surface2) 78%, transparent)",
        border: "1px solid var(--border)",
      }}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "color-mix(in srgb, var(--identity-a) 12%, var(--surface2))", color: "var(--identity-a)" }}>
            <UsersThree size={20} weight="duotone" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text2)" }}>Samen</p>
            <h1 className="serif-safe mt-1 text-2xl italic" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}>
              Twee stemmen naast elkaar
            </h1>
          </div>
        </div>
        <p className="mt-4 max-w-xl text-sm leading-6" style={{ color: "var(--text2)" }}>
          Kies expliciet wie je naast elkaar wilt leggen. KinkSync trekt geen conclusie voor jullie; het maakt overeenkomsten, bespreekpunten en grenzen leesbaar.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-semibold" style={{ color: "var(--text2)" }}>
            Eerste profiel
            <select
              value={profileA?.id ?? ""}
              onChange={(event) => {
                const nextA = profiles.find((profile) => profile.id === event.target.value);
                const keepB = nextA && profileB && personKey(nextA) !== personKey(profileB) ? profileB.id : undefined;
                replacePair(nextA?.id, keepB);
              }}
              className={selectClassName()}
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name} · {profile.role}</option>)}
            </select>
          </label>

          <label className="grid gap-1.5 text-xs font-semibold" style={{ color: "var(--text2)" }}>
            Tweede profiel
            <select
              value={profileB?.id ?? ""}
              onChange={(event) => replacePair(profileA?.id, event.target.value || undefined)}
              className={selectClassName()}
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              disabled={!profileA || bCandidates.length === 0}
            >
              {bCandidates.length === 0 && <option value="">Nog geen ander persoon</option>}
              {bCandidates.map((profile) => <option key={profile.id} value={profile.id}>{profile.name} · {profile.role}</option>)}
            </select>
          </label>
        </div>

        {model && profileA && profileB ? (
          <div className="mt-5 border-t pt-4" style={{ borderColor: "color-mix(in srgb, var(--border) 72%, transparent)" }}>
            <p className="text-sm font-semibold">{profileA.name} × {profileB.name}</p>
            <p className="mt-1 text-sm leading-6" style={{ color: "var(--text2)" }}>
              {matchCount} {matchCount === 1 ? "overeenkomst" : "overeenkomsten"} · {model.summary.discuss} te bespreken
              {hardCount > 0 ? <> · <span style={{ color: "var(--hard-no-text)" }}>{hardCount} harde {hardCount === 1 ? "grens" : "grenzen"}</span></> : null}
            </p>
          </div>
        ) : (
          <p className="mt-5 border-t pt-4 text-sm leading-6" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
            Voeg of importeer een profiel van een andere persoon om samen te kunnen kijken.
          </p>
        )}
      </section>

      {profileA && profileB && model ? (
        <div className="mt-5 grid gap-2.5">
          <SpaceLink
            href={`/compare?a=${encodeURIComponent(profileA.id)}&b=${encodeURIComponent(profileB.id)}`}
            prefetch={false}
            title="Interesses naast elkaar"
            detail="Bekijk waar jullie gelijk lopen en waar gesprek nodig is"
            icon={<ArrowsLeftRight size={19} />}
          />
          <SpaceLink
            href={`/contract?a=${encodeURIComponent(profileA.id)}&b=${encodeURIComponent(profileB.id)}`}
            prefetch={false}
            title="Maak afspraken"
            detail="Zet besproken keuzes om in een gezamenlijk concept"
            icon={<FileText size={18} />}
          />
        </div>
      ) : null}

      <div className="mt-5 flex justify-end">
        <Link href="/?profiles=1" prefetch={false} className="focus-ring min-h-11 rounded-xl px-3 py-3 text-sm font-semibold" style={{ color: "var(--accent-text)" }}>
          Profielen beheren
        </Link>
      </div>
    </PageShell>
  );
}
