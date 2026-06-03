"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore, useHasHydrated } from "@/lib/store";
import type { SceneRecord } from "@/types";

const TRAFFIC_EMOJI: Record<string, string> = { green: "🟢", amber: "🟡", red: "🔴" };

function intensityCounts(items: SceneRecord["items"]) {
  const counts = { zacht: 0, midden: 0, intens: 0 };
  for (const it of items) counts[it.intensity]++;
  return counts;
}

function SceneCard({ scene, onDelete }: { scene: SceneRecord; onDelete: () => void }) {
  const router = useRouter();
  const counts = intensityCounts(scene.items);
  const date = scene.aftercare
    ? new Date(scene.aftercare.completedAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })
    : scene.plannedDate
    ? (() => {
        const [year, month, day] = scene.plannedDate.split("-");
        return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
      })()
    : new Date(scene.updatedAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{scene.title}</p>
          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text2)" }}>{scene.profileAName} &amp; {scene.profileBName} · {date}</p>
        </div>
        {scene.aftercare && (
          <span className="text-lg flex-none">{TRAFFIC_EMOJI[scene.aftercare.trafficLight]}</span>
        )}
      </div>

      {/* Intensity pills */}
      {scene.items.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {counts.zacht > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--willing) 15%, transparent)", color: "var(--willing)" }}>{counts.zacht}× zacht</span>}
          {counts.midden > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--maybe) 15%, transparent)", color: "var(--maybe)" }}>{counts.midden}× midden</span>}
          {counts.intens > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--hard-no) 15%, transparent)", color: "var(--hard-no)" }}>{counts.intens}× intens</span>}
          <span className="text-[10px]" style={{ color: "var(--text2)" }}>{scene.items.length} activiteiten</span>
        </div>
      )}

      {/* Aftercare snippet */}
      {scene.aftercare?.wentWell && (
        <p className="text-xs italic line-clamp-1" style={{ color: "var(--text2)" }}>&quot;{scene.aftercare.wentWell}&quot;</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-1">
        <button
          onClick={() => router.push(`/scene?id=${scene.id}`)}
          className="flex-1 py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-90 focus-ring"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          ▶ Spelen
        </button>
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
  );
}

function EmptySection({ label }: { label: string }) {
  return (
    <p className="text-sm text-center py-6" style={{ color: "var(--text2)" }}>Nog geen {label.toLowerCase()}</p>
  );
}

export default function ScenesPage() {
  const { scenes, deleteScene } = useStore();
  const _hasHydrated = useHasHydrated();

  if (!_hasHydrated) return null;

  const planned   = scenes.filter((s) => s.status === "planned").sort((a, b) => (a.plannedDate ?? "").localeCompare(b.plannedDate ?? ""));
  const drafts    = scenes.filter((s) => s.status === "draft").sort((a, b) => b.updatedAt - a.updatedAt);
  const completed = scenes.filter((s) => s.status === "completed").sort((a, b) => (b.aftercare?.completedAt ?? 0) - (a.aftercare?.completedAt ?? 0));

  const sections: { key: string; label: string; items: SceneRecord[] }[] = [
    { key: "planned",   label: "Gepland",   items: planned },
    { key: "drafts",    label: "Concepten", items: drafts },
    { key: "completed", label: "Afgerond",  items: completed },
  ];

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-10 w-full">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="focus-ring text-sm transition-colors min-h-[44px] inline-flex items-center" style={{ color: "var(--text2)" }}>← Terug</Link>
        <h1 className="text-xl font-bold flex-1">Scènes</h1>
        <Link href="/compare" className="text-xs px-3 py-2 rounded-lg focus-ring" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>+ Nieuwe scène</Link>
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
                  <SceneCard key={scene.id} scene={scene} onDelete={() => deleteScene(scene.id)} />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
