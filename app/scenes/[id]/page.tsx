"use client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { SearchX } from "lucide-react";
import { useStore, useHasHydrated } from "@/lib/store";
import { parseLocalDate } from "@/lib/dates";
import AftercareSheet from "@/components/AftercareSheet";
import EmptyState from "@/components/EmptyState";
import PageShell from "@/components/PageShell";

const TRAFFIC = {
  green: { emoji: "🟢", label: "Geweldig",    color: "var(--yes)"     },
  amber: { emoji: "🟡", label: "Goed, maar…", color: "var(--maybe)"   },
  red:   { emoji: "🔴", label: "Zwaar",        color: "var(--hard-no)" },
};

function intensityColor(v: "zacht" | "midden" | "intens") {
  return v === "zacht" ? "var(--willing)" : v === "midden" ? "var(--maybe)" : "var(--hard-no)";
}

export default function SceneDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const hasHydrated = useHasHydrated();
  const { scenes, completeScene, updateAftercare, deleteScene } = useStore();
  const [showAftercare, setShowAftercare] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!hasHydrated) return <PageShell loading width="2xl" />;

  const scene = scenes.find((s) => s.id === id);

  if (!scene) {
    return (
      <PageShell width="2xl">
        <EmptyState
          icon={SearchX}
          title="Scène niet gevonden"
          message="Hij is misschien gewist of de link is verlopen."
          ctaHref="/scenes"
          ctaLabel="Terug naar scènes"
        />
      </PageShell>
    );
  }

  const aftercare = scene.aftercare;
  const traffic = aftercare ? TRAFFIC[aftercare.trafficLight] : null;

  const date = aftercare
    ? new Date(aftercare.completedAt).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })
    : scene.plannedDate
    ? parseLocalDate(scene.plannedDate).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })
    : new Date(scene.updatedAt).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });

  const counts = scene.items.reduce(
    (acc, it) => { acc[it.intensity]++; return acc; },
    { zacht: 0, midden: 0, intens: 0 }
  );

  return (
    <PageShell width="2xl">

      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-lg font-bold flex-1 truncate">{scene.title}</h1>
        {scene.status !== "completed" && (
          <Link
            href={`/scene?id=${scene.id}`}
            className="text-xs px-3 py-2 rounded-lg focus-ring flex-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", minHeight: 44, display: "flex", alignItems: "center" }}
          >
            ✎ Bewerken
          </Link>
        )}
      </div>

      <p className="text-sm mb-3" style={{ color: "var(--text2)" }}>
        {scene.profileAName} &amp; {scene.profileBName} · {date}{scene.plannedTime ? ` · ${scene.plannedTime}` : ""}
      </p>

      {scene.safeword && (
        <div className="flex items-center gap-2 mb-5 px-3 py-2 rounded-lg" style={{ background: "color-mix(in srgb, var(--hard-no) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--hard-no) 30%, transparent)" }}>
          <span className="text-xs font-bold uppercase tracking-widest flex-none" style={{ color: "var(--hard-no)" }}>Safeword</span>
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{scene.safeword}</span>
        </div>
      )}

      {/* Aftercare block */}
      {aftercare && traffic ? (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text2)" }}>Aftercare</h2>
            <button
              onClick={() => setShowAftercare(true)}
              className="text-xs focus-ring rounded-lg px-3 py-1"
              style={{ color: "var(--accent)", border: "1px solid var(--border-accent)", minHeight: 32 }}
            >
              ✎ Bewerken
            </button>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            {/* Traffic light header */}
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{ background: `color-mix(in srgb, ${traffic.color} 8%, transparent)`, borderBottom: "1px solid var(--border)" }}
            >
              <span className="text-2xl" aria-hidden="true">{traffic.emoji}</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: traffic.color }}>{traffic.label}</p>
                <p className="text-xs" style={{ color: "var(--text2)" }}>
                  {new Date(aftercare.completedAt).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>

            {/* Journal fields */}
            <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
              {aftercare.wentWell ? (
                <div className="px-4 py-3">
                  <p className="text-xs font-semibold mb-1" style={{ color: "var(--text2)" }}>Wat werkte goed</p>
                  <p className="text-sm" style={{ color: "var(--text)", lineHeight: 1.6 }}>{aftercare.wentWell}</p>
                </div>
              ) : (
                <div className="px-4 py-3">
                  <p className="text-xs" style={{ color: "var(--text2)" }}>Wat werkte goed — <em>niet ingevuld</em></p>
                </div>
              )}

              {aftercare.remember ? (
                <div className="px-4 py-3">
                  <p className="text-xs font-semibold mb-1" style={{ color: "var(--text2)" }}>Onthouden voor volgende keer</p>
                  <p className="text-sm" style={{ color: "var(--text)", lineHeight: 1.6 }}>{aftercare.remember}</p>
                </div>
              ) : (
                <div className="px-4 py-3">
                  <p className="text-xs" style={{ color: "var(--text2)" }}>Onthouden voor volgende keer — <em>niet ingevuld</em></p>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text2)" }}>Aftercare</h2>
          <div
            className="rounded-xl p-5 flex flex-col items-center gap-4"
            style={{ background: "var(--surface)", border: "1px dashed var(--border)" }}
          >
            <p className="text-sm text-center" style={{ color: "var(--text2)" }}>
              {scene.status === "completed" ? "Aftercare is niet ingevuld." : "Vul aftercare in na de scène."}
            </p>
            <button
              onClick={() => setShowAftercare(true)}
              className="btn-accent focus-ring"
              style={{ minWidth: 180 }}
            >
              Aftercare invullen
            </button>
          </div>
        </section>
      )}

      {/* Activiteiten */}
      {scene.items.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text2)" }}>Activiteiten</h2>
            <div className="flex gap-1.5">
              {counts.zacht > 0  && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--willing) 15%, transparent)", color: "var(--willing)" }}>{counts.zacht}× zacht</span>}
              {counts.midden > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--maybe) 15%, transparent)", color: "var(--maybe)" }}>{counts.midden}× midden</span>}
              {counts.intens > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--hard-no) 15%, transparent)", color: "var(--hard-no)" }}>{counts.intens}× intens</span>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {scene.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg overflow-hidden"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div
                  style={{ width: 3, alignSelf: "stretch", borderRadius: 999, background: intensityColor(item.intensity), flexShrink: 0 }}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm block">{item.name}</span>
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 rounded-full border"
                          style={{ borderColor: "var(--border)", color: "var(--text2)" }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {item.duration && <span className="text-xs flex-none" style={{ color: "var(--text2)" }}>{item.duration}</span>}
                <span className="text-xs flex-none" style={{ color: "var(--text2)" }}>{item.intensity}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {scene.status !== "completed" && (
          <Link
            href={`/scene?id=${scene.id}`}
            className="btn-accent focus-ring w-full text-center"
          >
            ▶ Spelen
          </Link>
        )}
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full py-3 rounded-xl text-sm focus-ring"
            style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text2)" }}
          >
            Verwijderen
          </button>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--hard-no)" }}>
            <p className="text-xs text-center py-2 px-4" style={{ color: "var(--text2)", background: "color-mix(in srgb, var(--hard-no) 8%, transparent)" }}>
              Scène definitief verwijderen?
            </p>
            <div className="flex">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-3 text-sm focus-ring"
                style={{ color: "var(--text2)", borderRight: "1px solid var(--border)" }}
              >
                Annuleren
              </button>
              <button
                onClick={() => { deleteScene(scene.id); router.push("/scenes"); }}
                className="flex-1 py-3 text-sm font-bold focus-ring"
                style={{ color: "var(--hard-no)" }}
              >
                Verwijderen
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Aftercare sheet */}
      {showAftercare && (
        <AftercareSheet
          existing={aftercare}
          onSave={(entry) => {
            if (scene.status === "completed") {
              updateAftercare(scene.id, entry);
            } else {
              completeScene(scene.id, entry);
            }
            setShowAftercare(false);
          }}
          onClose={() => setShowAftercare(false)}
        />
      )}
    </PageShell>
  );
}
