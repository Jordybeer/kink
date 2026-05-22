"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore, useHasHydrated } from "@/lib/store";
import { KINKS, LEVEL_MAX } from "@/lib/kinks";
import type { ExperienceLevel, Profile } from "@/types";
import Onboarding from "@/components/Onboarding";

const TOTAL_KINKS = KINKS.length;

const ROLES = [
  "Switch", "Dominant", "Submissive", "Top", "Bottom",
  "Rope top", "Rope bottom", "Sadist", "Masochist", "Other",
];

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string; sub: string }[] = [
  { value: "beginner",  label: "Beginner",   sub: "kort" },
  { value: "gevorderd", label: "Gevorderd",  sub: "normaal" },
  { value: "ervaren",   label: "Ervaren",    sub: "lang" },
  { value: "diepgaand", label: "Diepgaand",  sub: "alles" },
];

export default function Home() {
  const router = useRouter();
  const { profiles, createProfile, deleteProfile, renameProfile, importProfiles, onboardingComplete, completeOnboarding } = useStore();
  const _hasHydrated = useHasHydrated();

  const [name, setName] = useState("");
  const [role, setRole] = useState("Switch");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("beginner");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editLevel, setEditLevel] = useState<ExperienceLevel>("beginner");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const id = createProfile(name.trim(), role, experienceLevel);
    setName("");
    router.push(`/profile/${id}`);
  }

  function startEdit(p: { id: string; name: string; role: string; experienceLevel: ExperienceLevel }) {
    setEditId(p.id);
    setEditName(p.name);
    setEditRole(p.role);
    setEditLevel(p.experienceLevel ?? "beginner");
  }

  function saveEdit() {
    if (!editId || !editName.trim()) return;
    renameProfile(editId, editName.trim(), editRole, editLevel);
    setEditId(null);
  }

  function promptDelete(id: string) {
    setDeleteTarget(id);
    setSheetOpen(true);
  }

  function confirmDelete() {
    if (deleteTarget) deleteProfile(deleteTarget);
    setSheetOpen(false);
    setTimeout(() => setDeleteTarget(null), 300);
  }

  function cancelDelete() {
    setSheetOpen(false);
    setTimeout(() => setDeleteTarget(null), 300);
  }

  function exportProfiles() {
    const data = JSON.stringify({ version: 1, profiles }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `kinksync-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    setImportError(null);
    setImportSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!parsed.profiles || !Array.isArray(parsed.profiles)) {
          setImportError("Ongeldig bestand — geen geldige profielen gevonden.");
          return;
        }
        const incoming = parsed.profiles as Profile[];
        const existing = new Set(profiles.map((p: Profile) => p.id));
        const newOnes = incoming.filter((p: Profile) => !existing.has(p.id));
        if (!newOnes.length) {
          setImportError("Alle profielen in dit bestand bestaan al.");
          return;
        }
        importProfiles(newOnes);
        setImportSuccess(`${newOnes.length} profiel(en) toegevoegd.`);
      } catch {
        setImportError("Bestand kon niet worden gelezen.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  if (!_hasHydrated) return null;

  if (!onboardingComplete) {
    return <Onboarding onComplete={completeOnboarding} />;
  }

  const compareProfiles = profiles.slice(0, 2).map((p) => p.id);
  const deleteTargetProfile = profiles.find((p) => p.id === deleteTarget);

  // Group profiles by name for multi-role display
  const grouped = profiles.reduce<Map<string, typeof profiles>>((map, p) => {
    const key = p.name.toLowerCase().trim();
    map.set(key, [...(map.get(key) ?? []), p]);
    return map;
  }, new Map());
  const profileGroups = Array.from(grouped.values());

  return (
    <>
      <main className="max-w-2xl mx-auto px-4 py-10 w-full">
        {/* Hero */}
        <div className="mb-8 text-center relative">
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Instellingen openen"
            className="focus-ring absolute top-0 right-0 p-1 text-xl leading-none"
            style={{ color: "var(--text2)" }}
          >
            ⚙
          </button>
          <h1
            className="text-3xl font-bold"
            style={{
              background: "linear-gradient(90deg, var(--accent), var(--accent2))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            KinkSync
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
            Verken grenzen. Samen. — <span className="opacity-50 text-xs">kinksync.be</span>
          </p>
        </div>

        {/* Create profile form */}
        <form
          onSubmit={handleCreate}
          className="rounded-xl p-5 mb-8"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h2 className="font-semibold text-xs uppercase tracking-widest mb-4" style={{ color: "var(--text2)" }}>
            Nieuw profiel
          </h2>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Naam of alias…"
            className="focus-ring w-full rounded-lg px-3 py-2.5 text-sm mb-3 focus:outline-none placeholder-[color:var(--text2)]"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
          />

          <p className="text-xs mb-1.5 font-medium" style={{ color: "var(--text2)" }}>Rol</p>
          <div className="flex flex-wrap gap-1.5 mb-4" role="group" aria-label="Rol">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                aria-pressed={role === r}
                className="focus-ring px-3 py-1 rounded-full text-xs font-medium transition-colors border"
                style={
                  role === r
                    ? { background: "var(--accent)", color: "#000", borderColor: "var(--accent)" }
                    : { color: "var(--text2)", borderColor: "var(--border)" }
                }
              >
                {r}
              </button>
            ))}
          </div>

          <p className="text-xs mb-1.5 font-medium" style={{ color: "var(--text2)" }}>Ervaringsniveau</p>
          <div className="grid grid-cols-4 gap-1.5 mb-4" role="group" aria-label="Ervaringsniveau">
            {EXPERIENCE_LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setExperienceLevel(l.value)}
                aria-pressed={experienceLevel === l.value}
                className="focus-ring flex flex-col items-center py-2 rounded-lg text-xs font-medium transition-colors border"
                style={
                  experienceLevel === l.value
                    ? { background: "var(--accent)", color: "#000", borderColor: "var(--accent)" }
                    : { color: "var(--text2)", borderColor: "var(--border)" }
                }
              >
                <span className="font-semibold">{l.label}</span>
                <span className="text-[10px] opacity-70">{l.sub}</span>
              </button>
            ))}
          </div>

          <button
            type="submit"
            className="focus-ring w-full py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            Sla jezelf vast →
          </button>
        </form>

        {/* Profile list */}
        {profiles.length === 0 ? (
          <p className="text-center text-sm py-12" style={{ color: "var(--text2)" }}>
            Nog geen profielen. Wie ben jij in de speelkamer?
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-4 mb-6">
              {profileGroups.map((group) => {
                const groupName = group[0].name;
                const isMulti = group.length > 1;
                return (
                  <div key={groupName.toLowerCase().trim()}>
                    {isMulti && (
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black flex-none"
                          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                          aria-hidden="true"
                        >
                          {groupName[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold">{groupName}</span>
                        <span className="text-xs" style={{ color: "var(--text2)" }}>{group.length} rollen</span>
                        {group.length === 2 && (
                          <Link
                            href={`/compare?a=${group[0].id}&b=${group[1].id}`}
                            className="focus-ring ml-auto text-xs px-2.5 py-1 rounded-full border transition-colors"
                            style={{ color: "var(--accent)", borderColor: "var(--accent)" }}
                          >
                            Vergelijk rollen
                          </Link>
                        )}
                      </div>
                    )}
                    <div className="flex flex-col gap-3">
                      {group.map((p) => {
                        const rated = Object.values(p.entries).filter((e) => e.status).length;
                        const maxKinks = KINKS.filter((k) => k.level <= LEVEL_MAX[p.experienceLevel ?? "beginner"]).length;
                        const progress = maxKinks > 0 ? (rated / maxKinks) * 100 : 0;
                        const initial = p.name[0].toUpperCase();
                        const lvl = EXPERIENCE_LEVELS.find((l) => l.value === (p.experienceLevel ?? "beginner"));

                        return (
                          <div
                            key={p.id}
                            className="rounded-xl overflow-hidden"
                            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                          >
                            {editId === p.id ? (
                              <div className="p-4">
                                <input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="focus-ring w-full rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none"
                                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                                />
                                <p className="text-xs mb-1.5" style={{ color: "var(--text2)" }}>Rol</p>
                                <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label="Rol">
                                  {ROLES.map((r) => (
                                    <button
                                      key={r}
                                      type="button"
                                      onClick={() => setEditRole(r)}
                                      aria-pressed={editRole === r}
                                      className="focus-ring px-3 py-1 rounded-full text-xs font-medium border transition-colors"
                                      style={
                                        editRole === r
                                          ? { background: "var(--accent)", color: "#000", borderColor: "var(--accent)" }
                                          : { color: "var(--text2)", borderColor: "var(--border)" }
                                      }
                                    >
                                      {r}
                                    </button>
                                  ))}
                                </div>
                                <p className="text-xs mb-1.5" style={{ color: "var(--text2)" }}>Ervaringsniveau</p>
                                <div className="grid grid-cols-4 gap-1.5 mb-4" role="group" aria-label="Ervaringsniveau">
                                  {EXPERIENCE_LEVELS.map((l) => (
                                    <button
                                      key={l.value}
                                      type="button"
                                      onClick={() => setEditLevel(l.value)}
                                      aria-pressed={editLevel === l.value}
                                      className="focus-ring flex flex-col items-center py-2 rounded-lg text-xs font-medium transition-colors border"
                                      style={
                                        editLevel === l.value
                                          ? { background: "var(--accent)", color: "#000", borderColor: "var(--accent)" }
                                          : { color: "var(--text2)", borderColor: "var(--border)" }
                                      }
                                    >
                                      <span className="font-semibold">{l.label}</span>
                                      <span className="text-[10px] opacity-70">{l.sub}</span>
                                    </button>
                                  ))}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={saveEdit}
                                    className="focus-ring flex-1 py-2 rounded-lg text-sm font-medium"
                                    style={{ background: "var(--accent)", color: "#000" }}
                                  >
                                    Opslaan
                                  </button>
                                  <button
                                    onClick={() => setEditId(null)}
                                    className="focus-ring px-4 py-2 rounded-lg border text-sm"
                                    style={{ borderColor: "var(--border)", color: "var(--text2)" }}
                                  >
                                    Annuleer
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-3 p-4 pb-3">
                                  {!isMulti && (
                                    <div
                                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-black flex-none"
                                      style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                                      aria-hidden="true"
                                    >
                                      {initial}
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {!isMulti && <span className="font-semibold truncate">{p.name}</span>}
                                      <span
                                        className="text-xs px-2 py-0.5 rounded-full"
                                        style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}
                                      >
                                        {p.role}
                                      </span>
                                      {lvl && (
                                        <span
                                          className="text-xs px-2 py-0.5 rounded-full"
                                          style={{ background: "var(--surface2)", color: "var(--accent)", border: "1px solid var(--border)" }}
                                        >
                                          {lvl.label}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs mt-0.5 tabular-nums" style={{ color: "var(--text2)" }}>
                                      {rated} / {maxKinks} beoordeeld
                                    </div>
                                  </div>
                                  <Link
                                    href={`/profile/${p.id}`}
                                    className="focus-ring px-3 py-1.5 rounded-lg text-sm transition-colors flex-none"
                                    style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                                  >
                                    Open →
                                  </Link>
                                  <button
                                    onClick={() => startEdit(p)}
                                    aria-label={`Profiel ${p.name} bewerken`}
                                    title="Bewerken"
                                    className="focus-ring p-2 rounded-lg transition-colors"
                                    style={{ color: "var(--text2)" }}
                                  >
                                    ✎
                                  </button>
                                  <button
                                    onClick={() => promptDelete(p.id)}
                                    aria-label={`Profiel ${p.name} verwijderen`}
                                    title="Verwijderen"
                                    className="focus-ring p-2 rounded-lg transition-colors"
                                    style={{ color: "var(--text2)" }}
                                  >
                                    🗑
                                  </button>
                                </div>
                                <div className="h-1 mx-4 mb-4 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                                  <div
                                    className="h-full rounded-full transition-[width] duration-500 ease-out"
                                    style={{
                                      width: `${progress}%`,
                                      background: "linear-gradient(90deg, var(--accent), var(--accent2))",
                                    }}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Compare CTA */}
            {profiles.length >= 2 ? (
              <Link
                href={`/compare?a=${compareProfiles[0]}&b=${compareProfiles[1]}`}
                className="focus-ring block rounded-xl p-5 text-center transition-opacity hover:opacity-90"
                style={{ background: "var(--surface)", border: "1px solid var(--border-accent)" }}
              >
                <div className="text-base font-semibold" style={{ color: "var(--accent)" }}>
                  ⚡ Vergelijk profielen
                </div>
                <div className="text-sm mt-1" style={{ color: "var(--text2)" }}>
                  Ontdek waar jullie grenzen — en verlangens — overlappen.
                </div>
              </Link>
            ) : (
              <div
                className="rounded-xl p-5 text-center opacity-40"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                aria-hidden="true"
              >
                <div className="text-base font-semibold" style={{ color: "var(--text2)" }}>
                  ⚡ Vergelijk profielen
                </div>
                <div className="text-sm mt-1" style={{ color: "var(--text2)" }}>
                  Voeg een tweede profiel toe om te vergelijken.
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Settings bottom sheet */}
      <div className={`sheet-overlay ${settingsOpen ? "open" : ""}`} onClick={() => setSettingsOpen(false)} aria-hidden="true" />
      <div className={`sheet-panel ${settingsOpen ? "open" : ""}`} role="dialog" aria-modal="true" aria-label="Instellingen">
        <div
          className="rounded-t-2xl p-6"
          style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)" }}
        >
          <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: "var(--border)" }} />
          <h2 className="text-lg font-bold text-center mb-5">Instellingen</h2>
          <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: "var(--text2)" }}>
            Back-up &amp; herstel
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={exportProfiles}
              className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              ⬇ Maak backup (JSON)
            </button>
            <label className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors text-center cursor-pointer"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              ⬆ Herstel backup
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="sr-only"
              />
            </label>
            {importError && (
              <p className="text-xs text-center" style={{ color: "var(--hard-no)" }}>{importError}</p>
            )}
            {importSuccess && (
              <p className="text-xs text-center" style={{ color: "var(--accent)" }}>{importSuccess}</p>
            )}
            <button
              onClick={() => setSettingsOpen(false)}
              className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors mt-1"
              style={{ borderColor: "var(--border)", color: "var(--text2)" }}
            >
              Sluit
            </button>
          </div>
        </div>
      </div>

      {/* Delete bottom sheet */}
      <div className={`sheet-overlay ${sheetOpen ? "open" : ""}`} onClick={cancelDelete} aria-hidden="true" />
      <div className={`sheet-panel ${sheetOpen ? "open" : ""}`} role="dialog" aria-modal="true" aria-label="Profiel verwijderen">
        <div
          className="rounded-t-2xl p-6"
          style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)" }}
        >
          <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: "var(--border)" }} />
          <h2 className="text-lg font-bold text-center mb-1">Profiel verwijderen?</h2>
          {deleteTargetProfile && (
            <p className="text-center text-sm mb-6" style={{ color: "var(--text2)" }}>
              <span style={{ color: "var(--text)" }}>{deleteTargetProfile.name}</span> wordt permanent gewist.
              Dit kan niet ongedaan worden gemaakt.
            </p>
          )}
          <div className="flex flex-col gap-3">
            <button
              onClick={confirmDelete}
              className="focus-ring w-full py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
              style={{ background: "#7f1d1d", border: "1px solid var(--hard-no)", color: "#fca5a5" }}
            >
              Verwijder voor altijd
            </button>
            <button
              onClick={cancelDelete}
              className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text2)" }}
            >
              Annuleer
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
