"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useStore, useHasHydrated } from "@/lib/store";
import { parseLocalDate } from "@/lib/dates";
import AftercareSheet from "@/components/AftercareSheet";
import PageShell from "@/components/PageShell";
import type { SceneRecord } from "@/types";

const TRAFFIC = {
  green: { emoji: "🟢", label: "Geweldig",    color: "var(--yes)"     },
  amber: { emoji: "🟡", label: "Goed, maar…", color: "var(--maybe)"   },
  red:   { emoji: "🔴", label: "Zwaar",        color: "var(--hard-no)" },
};

function intensityCounts(items: SceneRecord["items"]) {
  const counts = { zacht: 0, midden: 0, intens: 0 };
  for (const it of items) counts[it.intensity]++;
  return counts;
}

function SceneCard({
  scene,
  onDelete,
  onAftercare,
}: {
  scene: SceneRecord;
  onDelete: () => void;
  onAftercare: (id: string) => void;
}) {
  const router = useRouter();
  const counts = intensityCounts(scene.items);
  const aftercare = scene.aftercare;
  const traffic = aftercare ? TRAFFIC[aftercare.trafficLight] : null;

  const date = aftercare
    ? new Date(aftercare.completedAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })
    : scene.plannedDate
    ? parseLocalDate(scene.plannedDate).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })
    : new Date(scene.updatedAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

      {/* Completed: traffic-light header strip */}
      {traffic && (
        <div
          className="flex items-center gap-2.5 px-4 py-2.5"
          style={{ background: `color-mix(in srgb, ${traffic.color} 8%, transparent)`, borderBottom: "1px solid var(--border)" }}
        >
          <span className="text-lg" aria-hidden="true">{traffic.emoji}</span>
          <span className="text-xs font-semibold" style={{ color: traffic.color }}>{traffic.label}</span>
          <span className="text-xs ml-auto" style={{ color: "var(--text2)" }}>{date}</span>
        </div>
      )}

      <div className="p-4 flex flex-col gap-2">
        {/* Title + meta */}
        <div>
          <p className="text-sm font-semibold">{scene.title}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text2)" }}>
            {scene.profileAName} &amp; {scene.profileBName}
            {!traffic && ` · ${date}`}
          </p>
        </div>

        {/* Intensity pills */}
        {scene.items.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {counts.zacht  > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--willing) 15%, transparent)", color: "var(--willing)" }}>{counts.zacht}× zacht</span>}
            {counts.midden > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--maybe) 15%, transparent)", color: "var(--maybe)" }}>{counts.midden}× midden</span>}
            {counts.intens > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--hard-no) 15%, transparent)", color: "var(--hard-no)" }}>{counts.intens}× intens</span>}
            <span className="text-[10px]" style={{ color: "var(--text2)" }}>{scene.items.length} activiteiten</span>
          </div>
        )}

        {/* Aftercare journal snippet (completed) */}
        {aftercare?.wentWell && (
          <p className="text-xs line-clamp-2" style={{ color: "var(--text2)", lineHeight: 1.5 }}>
            <span className="font-medium" style={{ color: "var(--text)" }}>Wat werkte goed: </span>
            {aftercare.wentWell}
          </p>
        )}
        {aftercare?.remember && (
          <p className="text-xs line-clamp-2" style={{ color: "var(--text2)", lineHeight: 1.5 }}>
            <span className="font-medium" style={{ color: "var(--text)" }}>Onthouden: </span>
            {aftercare.remember}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-1">
          {scene.status === "completed" ? (
            <button
              onClick={() => router.push(`/scenes/${scene.id}`)}
              className="flex-1 py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-90 focus-ring"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              Bekijken
            </button>
          ) : (
            <>
              <button
                onClick={() => router.push(`/scene?id=${scene.id}`)}
                className="flex-1 py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-90 focus-ring"
                style={{ background: "var(--accent)", color: "#000" }}
              >
                ▶ Spelen
              </button>
              <button
                onClick={() => onAftercare(scene.id)}
                className="flex-1 py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-90 focus-ring"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                Afronden
              </button>
            </>
          )}
          <button
            onClick={onDelete}
            className="px-3 py-2 rounded-lg text-xs transition-opacity hover:opacity-70 focus-ring"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}
            aria-label="Scène verwijderen"
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptySection({ label }: { label: string }) {
  return (
    <p className="text-sm text-center py-6" style={{ color: "var(--text2)" }}>Nog geen {label.toLowerCase()}</p>
  );
}

export default function ScenesPage() {
  const { scenes, deleteScene, completeScene } = useStore();
  const _hasHydrated = useHasHydrated();
  const [aftercareTarget, setAftercareTarget] = useState<string | null>(null);

  if (!_hasHydrated) return <PageShell loading />;

  const planned   = scenes.filter((s) => s.status === "planned").sort((a, b) => (a.plannedDate ?? "").localeCompare(b.plannedDate ?? ""));
  const drafts    = scenes.filter((s) => s.status === "draft").sort((a, b) => b.updatedAt - a.updatedAt);
  const completed = scenes.filter((s) => s.status === "completed").sort((a, b) => (b.aftercare?.completedAt ?? 0) - (a.aftercare?.completedAt ?? 0));

  const sections: { key: string; label: string; items: SceneRecord[] }[] = [
    { key: "planned",   label: "Gepland",   items: planned },
    { key: "drafts",    label: "Concepten", items: drafts },
    { key: "completed", label: "Afgerond",  items: completed },
  ];

  return (
    <PageShell width="2xl">
      <div className="flex items-center justify-end mb-4">
        <Link href="/scene" className="text-xs px-3 py-2 rounded-lg focus-ring" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>+ Nieuwe scène</Link>
      </div>

      <div className="flex flex-col gap-8">
        {sections.map(({ key, label, items }) => (
          <section key={key}>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text2)" }}>{label}</h2>
            {items.length === 0 ? (
              <EmptySection label={label} />
            ) : (
              <div className="flex flex-col gap-3">
                {items.map((scene) => (
                  <SceneCard
                    key={scene.id}
                    scene={scene}
                    onDelete={() => deleteScene(scene.id)}
                    onAftercare={(id) => setAftercareTarget(id)}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {aftercareTarget && (
        <AftercareSheet
          onSave={(entry) => {
            completeScene(aftercareTarget, entry);
            setAftercareTarget(null);
          }}
          onClose={() => setAftercareTarget(null)}
        />
      )}
    </PageShell>
  );
}
