"use client";

import Link from "next/link";
import { ArrowRight, PencilSimple, Sparkle, UsersThree } from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import SpaceLink from "@/components/space/SpaceLink";
import SpaceSwitcher from "@/components/space/SpaceSwitcher";
import { profileHref } from "@/lib/localRoutes";
import { usePartnerProfileId } from "@/lib/partnerPreference";
import { splitProfilesByOwnership } from "@/lib/profileType";
import { experienceLevelLabel } from "@/lib/roles";
import { useHasHydrated, useStore } from "@/lib/store";

export default function PersonalSpace() {
  const profiles = useStore((state) => state.profiles);
  const pinnedProfileId = useStore((state) => state.pinnedProfileId);
  const hydrated = useHasHydrated();
  const [partnerProfileId] = usePartnerProfileId();

  if (!hydrated) return <PageShell loading width="2xl" />;

  const mine = splitProfilesByOwnership(profiles, pinnedProfileId).mine;
  const profile = mine.find((candidate) => candidate.id === pinnedProfileId) ?? mine[0];

  if (!profile) {
    return (
      <PageShell width="2xl">
        <section className="mx-auto max-w-lg py-10 text-center">
          <h1 className="serif-safe text-3xl italic" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}>
            Eerst jij.
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6" style={{ color: "var(--text2)" }}>
            Maak een profiel om je interesses, grenzen en context op één plek te verzamelen.
          </p>
          <Link
            href="/?profiles=1"
            prefetch={false}
            className="focus-ring mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl px-5 text-sm font-semibold"
            style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
          >
            Profiel maken <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>
      </PageShell>
    );
  }

  const publicEntries = Object.values(profile.entries).filter((entry) => entry.status && entry.privateResponse !== true);
  const answered = Object.values(profile.entries).filter((entry) => entry.status).length;
  const hardLimits = publicEntries.filter((entry) => entry.status === "hard_no").length;
  const privateAnswers = Object.values(profile.entries).filter((entry) => entry.status && entry.privateResponse === true).length;
  const partner = partnerProfileId ? profiles.find((candidate) => candidate.id === partnerProfileId) : undefined;

  return (
    <PageShell width="2xl" className="lg:max-w-3xl">
      <SpaceSwitcher />
      <section className="relative overflow-hidden rounded-[28px] px-5 py-6 sm:px-7 sm:py-7" style={{
        background: "linear-gradient(145deg, color-mix(in srgb, var(--accent) 7%, var(--surface)), color-mix(in srgb, var(--identity-a) 4%, var(--surface2)))",
        border: "1px solid color-mix(in srgb, var(--border-accent) 70%, var(--border))",
      }}>
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full" style={{
          background: "color-mix(in srgb, var(--accent) 11%, transparent)",
          filter: "blur(28px)",
        }} aria-hidden="true" />

        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text2)" }}>Mijn ruimte</p>
          <h1 className="serif-safe mt-2 break-words text-[clamp(2.35rem,11vw,3.5rem)] leading-[0.98] italic" style={{
            fontFamily: "var(--font-display, Georgia, serif)",
            fontWeight: 500,
            letterSpacing: "-0.035em",
          }}>
            {profile.name}
          </h1>
          <p className="mt-3 text-sm leading-6" style={{ color: "var(--text2)" }}>
            {[profile.role || "Perspectief nog niet gekozen", experienceLevelLabel(profile.experienceLevel), profile.relationshipStatus].filter(Boolean).join(" · ")}
          </p>

          <p className="mt-5 text-sm leading-6" style={{ color: "var(--text2)" }}>
            {answered > 0
              ? <>{answered} antwoorden{hardLimits > 0 ? <> · <span style={{ color: "var(--hard-no-text)" }}>{hardLimits} harde {hardLimits === 1 ? "grens" : "grenzen"}</span></> : null}{privateAnswers > 0 ? <> · {privateAnswers} privé</> : null}</>
              : "Je profiel is klaar om verder te ontdekken."}
          </p>

          <Link
            href={`/profile/${encodeURIComponent(profile.id)}/questions`}
            prefetch={false}
            className="focus-ring mt-6 flex min-h-[58px] w-full items-center gap-3 rounded-2xl px-4 text-left transition-opacity hover:opacity-95"
            style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
          >
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full" style={{ background: "color-mix(in srgb, white 16%, transparent)" }}>
              <Sparkle size={18} weight="duotone" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">Verder ontdekken</span>
              <span className="mt-0.5 block text-xs opacity-80">Beantwoord wat nu relevant voelt</span>
            </span>
            <ArrowRight size={16} weight="bold" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        <SpaceLink
          href={profileHref(profile.id)}
          prefetch={false}
          title="Bekijk mijn profiel"
          detail="Lees terug wat je hebt aangegeven"
          icon={<PencilSimple size={18} />}
        />
        <SpaceLink
          href={partner ? `/together?a=${encodeURIComponent(profile.id)}&b=${encodeURIComponent(partner.id)}` : "/together"}
          prefetch={false}
          title={partner ? `Samen met ${partner.name}` : "Samen kijken"}
          detail="Vergelijk, bespreek en maak afspraken"
          icon={<UsersThree size={19} />}
        />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4" style={{ borderColor: "color-mix(in srgb, var(--border) 72%, transparent)" }}>
        <p className="text-xs leading-5" style={{ color: "var(--text2)" }}>
          Profielen en import blijven apart beheerbaar.
        </p>
        <Link
          href="/?profiles=1"
          prefetch={false}
          className="focus-ring flex min-h-11 flex-none items-center rounded-xl px-3 text-sm font-semibold"
          style={{ color: "var(--accent-text)" }}
        >
          Beheer
        </Link>
      </div>
    </PageShell>
  );
}
