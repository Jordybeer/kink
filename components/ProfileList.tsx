"use client";
import { useState } from "react";
import Link from "next/link";
import { Pin, PinOff, Pencil, Zap, FileText, Clapperboard, Anchor, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { STAGGER_CHILDREN, fadeUp } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { KINKS, LEVEL_MAX } from "@/lib/kinks";
import { ROLE_GROUPS, EXPERIENCE_LEVELS, RELATIONSHIP_STATUSES } from "@/lib/roles";
import RolePill from "@/components/RolePill";
import { getProfileType } from "@/lib/profileType";
import type { ExperienceLevel } from "@/types";

interface ProfileListProps {
  onPromptDelete: (id: string) => void;
}

export default function ProfileList({ onPromptDelete }: ProfileListProps) {
  const { profiles, pinnedProfileId, pinProfile, unpinProfile, renameProfile } = useStore();

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNameError, setEditNameError] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editLevel, setEditLevel] = useState<ExperienceLevel>("beginner");
  const [editRelationshipStatus, setEditRelationshipStatus] = useState("");

  function startEdit(p: { id: string; name: string; role: string; experienceLevel: ExperienceLevel; relationshipStatus?: string }) {
    setEditId(p.id);
    setEditName(p.name);
    setEditRole(p.role);
    setEditLevel(p.experienceLevel ?? "beginner");
    setEditRelationshipStatus(p.relationshipStatus ?? "");
    setEditNameError(null);
  }

  function saveEdit() {
    if (!editId || !editName.trim()) return;
    const duplicate = profiles.some(
      (p) => p.id !== editId && p.name.trim().toLowerCase() === editName.trim().toLowerCase()
    );
    if (duplicate) { setEditNameError("Er bestaat al een profiel met deze naam."); return; }
    setEditNameError(null);
    const existing = profiles.find((p) => p.id === editId);
    renameProfile(editId, editName.trim(), editRole, editLevel, editRelationshipStatus || undefined, existing?.fetLifeUsername);
    setEditId(null);
  }

  // Derived
  const grouped = profiles.reduce<Map<string, typeof profiles>>((map, p) => {
    const key = p.name.toLowerCase().trim();
    map.set(key, [...(map.get(key) ?? []), p]);
    return map;
  }, new Map());
  const profileGroups = Array.from(grouped.values()).sort((a, b) =>
    a.some((p) => p.id === pinnedProfileId) ? -1 : b.some((p) => p.id === pinnedProfileId) ? 1 : 0
  );
  const pinnedProfile = profiles.find((p) => p.id === pinnedProfileId);
  const compareProfiles = (pinnedProfile
    ? [pinnedProfile.id, profiles.find((p) => p.id !== pinnedProfileId)?.id]
    : profiles.slice(0, 2).map((p) => p.id)
  ).filter((id): id is string => Boolean(id));
  const canCompare = compareProfiles.length >= 2;

  return (
    <>
      <motion.div
        className="flex flex-col gap-3 mb-6"
        initial="hidden"
        animate="show"
        variants={STAGGER_CHILDREN}
      >
        {profileGroups.map((group) => {
          const groupName = group[0].name;
          const isMulti = group.length > 1;
          return (
            <motion.div key={groupName.toLowerCase().trim()} variants={fadeUp(10)}>
              {isMulti && (
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className="w-6 h-6 rounded-full flex-none overflow-hidden" aria-hidden="true">
                    {group[0].avatarDataUrl ? (
                      <img src={group[0].avatarDataUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-black" style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}>
                        {groupName[0].toUpperCase()}
                      </div>
                    )}
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
              <div className="flex flex-col gap-1.5">
                {group.map((p) => {
                  const rated = Object.values(p.entries ?? {}).filter((e) => e.status).length;
                  const maxKinks = KINKS.filter((k) => k.level <= LEVEL_MAX[p.experienceLevel ?? "beginner"]).length;
                  const initial = p.name[0].toUpperCase();
                  const lvl = EXPERIENCE_LEVELS.find((l) => l.value === (p.experienceLevel ?? "beginner"));

                  return (
                    <div
                      key={p.id}
                      className="relative rounded-xl"
                      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                    >
                      {editId === p.id ? (
                        <div className="p-4">
                          <div className="mb-3">
                            <input
                              value={editName}
                              onChange={(e) => { setEditName(e.target.value); setEditNameError(null); }}
                              className="focus-ring w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                              style={{ background: "var(--surface2)", border: `1px solid ${editNameError ? "var(--hard-no)" : "var(--border)"}`, color: "var(--text)" }}
                            />
                            {editNameError && (
                              <p className="text-xs mt-1" style={{ color: "var(--hard-no)" }}>{editNameError}</p>
                            )}
                          </div>
                          <p className="text-xs mb-1.5" style={{ color: "var(--text2)" }}>Rol</p>
                          <div className="flex flex-col gap-2 mb-3" role="group" aria-label="Rol">
                            {ROLE_GROUPS.map((g) => (
                              <div key={g.label}>
                                <p className="text-[10px] uppercase tracking-widest mb-1 opacity-50" style={{ color: "var(--text2)" }}>{g.label}</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {g.roles.map((r) => (
                                    <button
                                      key={r}
                                      type="button"
                                      onClick={() => setEditRole(r)}
                                      aria-pressed={editRole === r}
                                      className="focus-ring px-3 py-1 rounded-full text-xs font-medium transition-colors border"
                                      style={
                                        editRole === r
                                          ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "var(--accent)" }
                                          : { color: "var(--text2)", borderColor: "var(--border)" }
                                      }
                                    >
                                      {r}
                                    </button>
                                  ))}
                                </div>
                              </div>
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
                                    ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "var(--accent)" }
                                    : { color: "var(--text2)", borderColor: "var(--border)" }
                                }
                              >
                                <span className="font-semibold">{l.label}</span>
                                <span className="text-[10px] opacity-70">{l.sub}</span>
                              </button>
                            ))}
                          </div>
                          <p className="text-xs mb-1.5" style={{ color: "var(--text2)" }}>Relatiestatus <span className="opacity-60">(optioneel)</span></p>
                          <div className="flex flex-wrap gap-1.5 mb-4" role="group" aria-label="Relatiestatus">
                            {RELATIONSHIP_STATUSES.map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setEditRelationshipStatus((rs) => (rs === s ? "" : s))}
                                aria-pressed={editRelationshipStatus === s}
                                className="focus-ring px-3 py-1 rounded-full text-xs font-medium transition-colors border"
                                style={
                                  editRelationshipStatus === s
                                    ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "var(--accent)" }
                                    : { color: "var(--text2)", borderColor: "var(--border)" }
                                }
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={saveEdit}
                              className="focus-ring flex-1 py-2 rounded-lg text-sm font-medium"
                              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
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
                          <div className="flex gap-2 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                            <button
                              onClick={() => p.id === pinnedProfileId ? unpinProfile() : pinProfile(p.id)}
                              className="focus-ring flex-1 py-2 rounded-lg text-xs border transition-colors flex items-center justify-center gap-1.5"
                              style={p.id === pinnedProfileId
                                ? { borderColor: "var(--accent)", color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 10%, transparent)" }
                                : { borderColor: "var(--border)", color: "var(--text2)" }}
                            >
                              {p.id === pinnedProfileId ? <><PinOff size={12} /> Losmaken</> : <><Pin size={12} /> Mijn profiel</>}
                            </button>
                            <button
                              onClick={() => { setEditId(null); onPromptDelete(p.id); }}
                              className="focus-ring px-4 py-2 rounded-lg text-xs border transition-colors"
                              style={{ borderColor: "color-mix(in srgb, var(--hard-no) 40%, transparent)", color: "var(--hard-no)" }}
                            >
                              Verwijderen
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Link
                            href={`/profile/${p.id}`}
                            className="focus-ring block rounded-xl"
                            aria-label={`Profiel ${p.name} openen`}
                          >
                            {/* Card header */}
                            <div className="flex items-center gap-3 px-3 pt-3 pb-2 pr-12">
                              {!isMulti && (
                                <div className="relative flex-none">
                                  <div className="w-11 h-11 rounded-full overflow-hidden" aria-hidden="true">
                                    {p.avatarDataUrl ? (
                                      <img src={p.avatarDataUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-black" style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}>
                                        {initial}
                                      </div>
                                    )}
                                  </div>
                                  {p.id === pinnedProfileId && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "var(--accent)" }} aria-label="Mijn profiel">
                                      <Pin size={9} color="#000" />
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-base font-semibold truncate leading-tight">
                                  {isMulti ? p.role : p.name}
                                </p>
                                {isMulti ? (
                                  <p className="text-xs truncate mt-0.5" style={{ color: "var(--text2)" }}>
                                    {lvl?.label}
                                  </p>
                                ) : (
                                  <div className="flex flex-wrap items-center gap-1 mt-1">
                                    <RolePill role={p.role} />
                                    {lvl && <span className="text-xs" style={{ color: "var(--text2)" }}>· {lvl.label}</span>}
                                    {(() => {
                                      const pt = getProfileType(p, pinnedProfileId);
                                      return (
                                        <span
                                          className="text-[10px] uppercase tracking-widest flex items-center gap-0.5"
                                          style={{ color: pt === "primair" ? "var(--accent)" : "var(--text2)" }}
                                        >
                                          {pt === "partner" && <Lock size={8} aria-hidden="true" />}
                                          {pt}
                                        </span>
                                      );
                                    })()}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Status DNA bar */}
                            {rated > 0 ? (
                              <div className="flex h-1.5 mx-3 mb-3 rounded-full overflow-hidden gap-px">
                                {(["yes", "willing", "maybe", "no", "hard_no"] as const).map((s) => {
                                  const cnt = Object.values(p.entries ?? {}).filter((e) => e.status === s).length;
                                  if (!cnt) return null;
                                  const pct = (cnt / maxKinks) * 100;
                                  const c = { yes: "var(--yes)", willing: "var(--willing)", maybe: "var(--maybe)", no: "var(--no)", hard_no: "var(--hard-no)" }[s];
                                  return <div key={s} style={{ width: `${pct}%`, background: c }} />;
                                })}
                                <div style={{ flex: 1, background: "var(--border)" }} />
                              </div>
                            ) : (
                              <div className="h-1.5 mx-3 mb-3 rounded-full" style={{ background: "var(--border)" }} />
                            )}
                          </Link>

                          {/* Absolutely positioned edit button — sibling to Link, not inside it */}
                          <button
                            onClick={() => startEdit(p)}
                            aria-label={`Profiel ${p.name} bewerken`}
                            className="focus-ring absolute top-2 right-2 w-10 h-10 flex items-center justify-center rounded-lg transition-colors"
                            style={{ color: "var(--text2)" }}
                          >
                            <Pencil size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* CTAs */}
      <div className="flex flex-col gap-3">
        {canCompare ? (
          <Link
            href={`/compare?a=${compareProfiles[0]}&b=${compareProfiles[1]}`}
            className="focus-ring block rounded-xl p-6 transition-opacity hover:opacity-90"
            style={{
              background: "linear-gradient(145deg, color-mix(in srgb, var(--accent) 8%, var(--surface)), var(--surface))",
              border: "1px solid var(--border-accent)",
            }}
          >
            <div className="flex items-center gap-2 mb-1.5" style={{ color: "var(--accent)" }}>
              <Zap size={18} aria-hidden="true" className="flex-none" />
              <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 400, fontSize: "1.2rem", lineHeight: 1.2 }}>Vergelijk profielen</span>
            </div>
            <div className="text-sm" style={{ color: "var(--text2)" }}>
              Zie waar jullie grenzen raken — en waar ze uitdagen.
            </div>
            {profiles.length > 2 && (
              <div className="text-xs mt-1.5 opacity-50">{pinnedProfile ? `${pinnedProfile.name} + eerste andere` : "eerste twee profielen"}</div>
            )}
          </Link>
        ) : (
          <div
            className="rounded-xl p-6 opacity-40"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            role="button" tabIndex={0} aria-disabled="true"
            aria-label="Vergelijk profielen — voeg een tweede profiel toe om te vergelijken"
          >
            <div className="flex items-center gap-2 mb-1.5" style={{ color: "var(--text2)" }}>
              <Zap size={18} aria-hidden="true" className="flex-none" />
              <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 400, fontSize: "1.2rem", lineHeight: 1.2 }}>Vergelijk profielen</span>
            </div>
            <div className="text-sm" style={{ color: "var(--text2)" }}>
              Voeg een tweede profiel toe om te vergelijken.
            </div>
          </div>
        )}

        {profiles.length >= 2 ? (
          <Link
            href={`/contract?a=${compareProfiles[0]}&b=${compareProfiles[1]}`}
            className="focus-ring block rounded-xl p-5 transition-opacity hover:opacity-90"
            style={{ background: "var(--surface)", border: "1px solid var(--border-accent)" }}
          >
            <div className="flex items-center gap-2 text-base font-semibold mb-1" style={{ color: "var(--accent)" }}>
              <FileText size={16} aria-hidden="true" />
              Maak een contract
            </div>
            <div className="text-sm" style={{ color: "var(--text2)" }}>
              Safewords, aftercare en grenzen — op papier en exporteerbaar.
            </div>
          </Link>
        ) : (
          <div
            className="rounded-xl p-5 opacity-40"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            role="button" tabIndex={0} aria-disabled="true"
            aria-label="Maak een contract — voeg twee profielen toe om een contract te maken"
          >
            <div className="flex items-center gap-2 text-base font-semibold mb-1" style={{ color: "var(--text2)" }}>
              <FileText size={16} aria-hidden="true" />
              Maak een contract
            </div>
            <div className="text-sm" style={{ color: "var(--text2)" }}>
              Voeg twee profielen toe om een contract te maken.
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/scene"
            className="focus-ring block rounded-xl p-4 transition-opacity hover:opacity-90"
            style={{ background: "var(--surface)", border: "1px solid var(--border-accent)" }}
          >
            <div className="flex items-center gap-1.5 text-base font-semibold mb-1" style={{ color: "var(--accent)" }}>
              <Clapperboard size={15} aria-hidden="true" />
              Nieuwe scène
            </div>
            <div className="text-xs" style={{ color: "var(--text2)" }}>Schrijf de regels voordat het spel begint.</div>
          </Link>
          <Link
            href="/scenes"
            className="focus-ring block rounded-xl p-4 transition-opacity hover:opacity-90"
            style={{ background: "var(--surface)", border: "1px solid var(--border-accent)" }}
          >
            <div className="flex items-center gap-1.5 text-base font-semibold mb-1" style={{ color: "var(--accent)" }}>
              <Clapperboard size={15} aria-hidden="true" />
              Scènes
            </div>
            <div className="text-xs" style={{ color: "var(--text2)" }}>Alle scènes — gepland en voltooid.</div>
          </Link>
        </div>

        <Link
          href="/session"
          className="focus-ring block rounded-xl p-5 transition-opacity hover:opacity-90"
          style={{ background: "var(--surface)", border: "1px solid var(--border-accent)" }}
        >
          <div className="flex items-center gap-2 text-base font-semibold mb-1" style={{ color: "var(--accent)" }}>
            <Anchor size={16} aria-hidden="true" />
            Live sessie
          </div>
          <div className="text-sm" style={{ color: "var(--text2)" }}>
            Vergelijk kinks live — elk op eigen toestel.
          </div>
        </Link>
      </div>
    </>
  );
}
