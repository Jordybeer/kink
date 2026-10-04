"use client";

import Link from "next/link";
import { CalendarDots, FileText, FilmSlate, Plus } from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import SpaceLink from "@/components/space/SpaceLink";
import SpaceSwitcher from "@/components/space/SpaceSwitcher";
import { sceneDetailHref } from "@/lib/localRoutes";
import { useHasHydrated, useStore } from "@/lib/store";

function sceneHref(id: string, completed: boolean) {
  return completed ? sceneDetailHref(id) : `/scene?id=${encodeURIComponent(id)}`;
}

export default function MomentsSpace() {
  const scenes = useStore((state) => state.scenes);
  const hydrated = useHasHydrated();

  if (!hydrated) return <PageShell loading width="2xl" />;

  const planned = scenes.filter((scene) => scene.status === "planned").length;
  const drafts = scenes.filter((scene) => scene.status === "draft").length;
  const completed = scenes.filter((scene) => scene.status === "completed").length;
  const recent = [...scenes].sort((left, right) => right.updatedAt - left.updatedAt).slice(0, 3);

  return (
    <PageShell width="2xl" className="lg:max-w-3xl">
      <SpaceSwitcher />
      <section className="rounded-[28px] px-5 py-6 sm:px-7" style={{
        background: "linear-gradient(145deg, color-mix(in srgb, var(--identity-a) 5%, var(--surface)), color-mix(in srgb, var(--accent) 4%, var(--surface2)))",
        border: "1px solid var(--border)",
      }}>
        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text2)" }}>Momenten</p>
        <h1 className="serif-safe mt-2 text-3xl italic leading-tight" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}>
          Van idee naar afspraak
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6" style={{ color: "var(--text2)" }}>
          Hier komen concrete plannen terecht. Niet je hele profiel opnieuw, maar wat jullie daadwerkelijk willen voorbereiden, spelen of onthouden.
        </p>

        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm" style={{ color: "var(--text2)" }}>
          <span><strong style={{ color: "var(--text)" }}>{planned}</strong> gepland</span>
          <span><strong style={{ color: "var(--text)" }}>{drafts}</strong> concept</span>
          <span><strong style={{ color: "var(--text)" }}>{completed}</strong> afgerond</span>
        </div>

        <Link
          href="/scene"
          className="focus-ring mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-sm font-semibold"
          style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
        >
          <Plus size={17} weight="bold" aria-hidden="true" /> Nieuw moment
        </Link>
      </section>

      {recent.length > 0 && (
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text2)" }}>Recent</h2>
            <Link href="/scenes" className="focus-ring min-h-11 rounded-lg px-2 py-3 text-sm font-semibold" style={{ color: "var(--accent-text)" }}>
              Alles bekijken
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {recent.map((scene) => (
              <Link
                key={scene.id}
                href={sceneHref(scene.id, scene.status === "completed")}
                prefetch={false}
                className="focus-ring flex min-h-[66px] items-center gap-3 py-2.5"
              >
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full" style={{ background: "var(--surface2)", color: "var(--identity-a)" }}>
                  <CalendarDots size={17} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{scene.title || "Naamloos moment"}</span>
                  <span className="mt-0.5 block truncate text-xs" style={{ color: "var(--text2)" }}>
                    {scene.profileAName} × {scene.profileBName} · {scene.status === "planned" ? "Gepland" : scene.status === "completed" ? "Afgerond" : "Concept"}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
        <SpaceLink href="/scenes" title="Scènes" detail="Alle concepten, plannen en aftercare" icon={<FilmSlate size={18} />} />
        <SpaceLink href="/contracts" title="Afspraken" detail="Gezamenlijke afspraken en hun verloop" icon={<FileText size={18} />} />
      </div>
    </PageShell>
  );
}
