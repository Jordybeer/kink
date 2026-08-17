"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { MagnifyingGlassMinus, Play } from "@phosphor-icons/react";
import { useStore, useHasHydrated } from "@/lib/store";
import { parseLocalDate } from "@/lib/dates";
import AftercareSheet from "@/components/AftercareSheet";
import EmptyState from "@/components/EmptyState";
import PageShell from "@/components/PageShell";
import SafewordRibbon from "@/components/SafewordRibbon";
import ConsentLedgerPanel from "@/components/ConsentLedgerPanel";

const TRAFFIC = {
  green: { label: "Geweldig", color: "var(--yes)" },
  amber: { label: "Goed, maar…", color: "var(--maybe)" },
  red: { label: "Zwaar", color: "var(--hard-no)" },
};

function intensityColor(v: "zacht" | "midden" | "intens") {
  return v === "zacht"
    ? "var(--willing)"
    : v === "midden"
      ? "var(--maybe)"
      : "var(--hard-no)";
}

export default function SceneDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const hasHydrated = useHasHydrated();
  const { scenes, profiles, completeScene, updateAftercare, deleteScene } = useStore();
  const [showAftercare, setShowAftercare] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!hasHydrated) return <PageShell loading width="2xl" />;

  const scene = scenes.find((s) => s.id === id);

  if (!scene) {
    return (
      <PageShell width="2xl">
        <EmptyState
          icon={MagnifyingGlassMinus}
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

  async function handleExportPdf() {
    const { exportScenePdf } = await import("@/lib/scenePdf");
    await exportScenePdf(scene!);
  }

  const date = aftercare
    ? new Date(aftercare.completedAt).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : scene.plannedDate
      ? parseLocalDate(scene.plannedDate).toLocaleDateString("nl-NL", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : new Date(scene.updatedAt).toLocaleDateString("nl-NL", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });

  const counts = scene.items.reduce(
    (acc, it) => {
      acc[it.intensity]++;
      return acc;
    },
    { zacht: 0, midden: 0, intens: 0 },
  );

  return (
    <PageShell width="2xl">
      {/* Header */}
      <h1
        className="text-3xl mb-1"
        style={{
          fontFamily: "var(--font-display, Georgia, serif)",
          fontStyle: "italic",
        }}
      >
        {scene.title}
      </h1>
      <p
        className="text-xs uppercase tracking-[0.15em] mb-0.5"
        style={{ color: "var(--text2)" }}
      >
        {scene.profileAName} — {scene.profileBName}
      </p>
      <p className="text-sm mb-4" style={{ color: "var(--text2)" }}>
        {date}
        {scene.plannedTime ? ` · ${scene.plannedTime}` : ""}
      </p>

      <SafewordRibbon safeword={scene.safeword} />

      <ConsentLedgerPanel scene={scene} profiles={profiles} />

      {/* Aftercare block */}
      {aftercare && traffic ? (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2
              className="text-sm"
              style={{
                fontFamily: "var(--font-display, Georgia, serif)",
                fontStyle: "italic",
                fontWeight: 400,
                color: "var(--text2)",
              }}
            >
              Aftercare
            </h2>
            <button
              onClick={() => setShowAftercare(true)}
              className="text-xs focus-ring rounded-lg px-3 py-1"
              style={{
                color: "var(--accent)",
                border: "1px solid var(--border-accent)",
                minHeight: 32,
              }}
            >
              ✎ Bewerken
            </button>
          </div>

          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            {/* Traffic light header */}
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{
                background: `color-mix(in srgb, ${traffic.color} 8%, transparent)`,
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: traffic.color }}
                >
                  {traffic.label}
                </p>
                <p className="text-xs" style={{ color: "var(--text2)" }}>
                  {new Date(aftercare.completedAt).toLocaleDateString("nl-NL", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            {/* Journal fields */}
            <div
              className="flex flex-col divide-y"
              style={{ borderColor: "var(--border)" }}
            >
              {aftercare.wentWell ? (
                <div className="px-4 py-3">
                  <p
                    className="text-xs font-semibold mb-1"
                    style={{ color: "var(--text2)" }}
                  >
                    Wat werkte goed
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "var(--text)", lineHeight: 1.6 }}
                  >
                    {aftercare.wentWell}
                  </p>
                </div>
              ) : (
                <div className="px-4 py-3">
                  <p className="text-sm" style={{ color: "var(--text2)" }}>
                    Wat werkte goed: <em>niet ingevuld</em>
                  </p>
                </div>
              )}

              {aftercare.remember ? (
                <div className="px-4 py-3">
                  <p
                    className="text-xs font-semibold mb-1"
                    style={{ color: "var(--text2)" }}
                  >
                    Onthouden voor volgende keer
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "var(--text)", lineHeight: 1.6 }}
                  >
                    {aftercare.remember}
                  </p>
                </div>
              ) : (
                <div className="px-4 py-3">
                  <p className="text-sm" style={{ color: "var(--text2)" }}>
                    Onthouden voor volgende keer: <em>niet ingevuld</em>
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="mb-6">
          <h2
            className="text-sm mb-3"
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              fontStyle: "italic",
              fontWeight: 400,
              color: "var(--text2)",
            }}
          >
            Aftercare
          </h2>
          <div
            className="rounded-xl p-5 flex flex-col items-center gap-4"
            style={{
              background: "var(--surface)",
              border: "1px dashed var(--border)",
            }}
          >
            <p
              className="text-sm text-center"
              style={{ color: "var(--text2)" }}
            >
              {scene.status === "completed"
                ? "Aftercare is niet ingevuld."
                : "Vul aftercare in na de scène."}
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
          <h2
            className="text-sm mb-1"
            style={{
              fontFamily: "var(--font-display, Georgia, serif)",
              fontStyle: "italic",
              fontWeight: 400,
              color: "var(--text2)",
            }}
          >
            Setlist
          </h2>
          {(() => {
            const total = scene.items.length;
            const parts: string[] = [];
            if (counts.zacht > 0) parts.push(`${counts.zacht} zacht`);
            if (counts.midden > 0) parts.push(`${counts.midden} midden`);
            if (counts.intens > 0) parts.push(`${counts.intens} intens`);
            return (
              <p
                className="text-xs italic mb-3"
                style={{ color: "var(--text2)" }}
              >
                {parts.join(" · ")}, {total} in totaal
              </p>
            );
          })()}
          <div className="flex flex-col gap-1.5">
            {scene.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg overflow-hidden"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    width: 3,
                    alignSelf: "stretch",
                    borderRadius: 999,
                    background: intensityColor(item.intensity),
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm block">{item.name}</span>
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] px-1.5 py-0.5 rounded-full border"
                          style={{
                            borderColor: "var(--border)",
                            color: "var(--text2)",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {item.duration && (
                  <span
                    className="text-xs flex-none"
                    style={{ color: "var(--text2)" }}
                  >
                    {item.duration}
                  </span>
                )}
                <span
                  className="text-xs flex-none"
                  style={{ color: "var(--text2)" }}
                >
                  {item.intensity}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-4 mt-2">
        {scene.status !== "completed" && (
          <Link
            href={`/scene?id=${scene.id}`}
            prefetch={false}
            className="btn-accent focus-ring w-full text-center inline-flex items-center justify-center gap-1.5"
          >
            <Play size={13} weight="fill" aria-hidden="true" /> Spelen
          </Link>
        )}

        <div
          className="flex items-center gap-4 text-sm"
          style={{ color: "var(--accent)" }}
        >
          {scene.status === "completed" && (
            <button
              onClick={handleExportPdf}
              className="focus-ring rounded-lg px-2 py-1"
            >
              Exporteer PDF
            </button>
          )}
          <Link
            href={`/scene?id=${scene.id}`}
            prefetch={false}
            className="focus-ring rounded-lg px-2 py-1"
            style={{ color: "var(--accent)" }}
          >
            {scene.consentLockedAt ? "Bekijk afspraken" : "Bewerken"}
          </Link>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="focus-ring rounded-lg ml-auto px-2 py-1"
              style={{ color: "var(--text2)" }}
            >
              Verwijderen
            </button>
          ) : (
            <div className="ml-auto flex items-center gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="focus-ring rounded-lg text-xs px-2 py-1"
                style={{ color: "var(--text2)" }}
              >
                Annuleren
              </button>
              <button
                onClick={() => {
                  deleteScene(scene.id);
                  router.push("/scenes");
                }}
                className="focus-ring rounded-lg text-xs font-bold px-2 py-1"
                style={{ color: "var(--hard-no)" }}
              >
                Definitief verwijderen
              </button>
            </div>
          )}
        </div>
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
