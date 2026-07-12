"use client";
import { useState } from "react";
import Link from "next/link";
import { PushPin, PushPinSlash, PencilSimple, FileText, FilmSlate, Anchor, Lock, CaretRight } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { STAGGER_CHILDREN, fadeUp } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { EXPERIENCE_LEVELS, RELATIONSHIP_STATUSES } from "@/lib/roles";
import RolePicker from "@/components/RolePicker";
import { getProfileType } from "@/lib/profileType";
import { avatarStyle } from "@/lib/avatar";
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
        className="flex flex-col gap-3 mb-6 lg:grid lg:grid-cols-2 lg:gap-3 lg:items-start"
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
                      <div
                        className="w-full h-full flex items-center justify-center text-xs italic"
                        style={avatarStyle(groupName)}
                      >
                        {groupName[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span
                    className="text-base italic"
                    style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500, color: "var(--text)" }}
                  >
                    {groupName}
                  </span>
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
                  const initial = p.name[0].toUpperCase();
                  const lvl = EXPERIENCE_LEVELS.find((l) => l.value === (p.experienceLevel ?? "beginner"));
                  // The pinned profile sits for a portrait; the rest mingle.
                  const isPortrait = !isMulti && p.id === pinnedProfileId;
                  const ratedCount = Object.values(p.entries).filter((e) => e.status).length;

                  return (
                    <div
                      key={p.id}
                      className="relative rounded-xl"
                      style={{
                        background: isPortrait
                          ? "linear-gradient(145deg, color-mix(in srgb, var(--accent) 6%, var(--surface2)), var(--surface2))"
                          : "var(--surface2)",
                        border: `1px solid ${isPortrait ? "var(--border-accent)" : "var(--border)"}`,
                      }}
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
                          <div className="mb-3">
                            <RolePicker value={editRole} onChange={setEditRole} />
                          </div>
                          <fieldset className="mb-4 border-0 p-0 m-0">
                          <legend className="text-xs mb-1.5" style={{ color: "var(--text2)" }}>Ervaringsniveau</legend>
                          <div className="grid grid-cols-4 gap-1.5">
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
                                <span className="text-xs opacity-70">{l.sub}</span>
                              </button>
                            ))}
                          </div>
                          </fieldset>
                          <fieldset className="mb-4 border-0 p-0 m-0">
                          <legend className="text-xs mb-1.5" style={{ color: "var(--text2)" }}>Relatiestatus <span className="opacity-60">(optioneel)</span></legend>
                          <div className="flex flex-wrap gap-1.5">
                            {RELATIONSHIP_STATUSES.map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setEditRelationshipStatus((rs) => (rs === s ? "" : s))}
                                aria-pressed={editRelationshipStatus === s}
                                className="focus-ring px-3 min-h-9 rounded-full text-xs font-medium transition-colors border"
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
                          </fieldset>
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
                              {p.id === pinnedProfileId ? <><PushPinSlash size={12} /> Losmaken</> : <><PushPin size={12} /> Mijn profiel</>}
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
                            <div className={`flex items-center gap-3 px-3 pb-3 pr-12 ${isPortrait ? "pt-4" : "pt-3"}`}>
                              {!isMulti && (
                                <div className="relative flex-none">
                                  <div className={`${isPortrait ? "w-16 h-16" : "w-11 h-11"} rounded-full overflow-hidden`} aria-hidden="true">
                                    {p.avatarDataUrl ? (
                                      <img src={p.avatarDataUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      // Monogram, not sticker — the initial sits in the house serif.
                                      <div
                                        className={`w-full h-full flex items-center justify-center ${isPortrait ? "text-2xl" : "text-base"} italic`}
                                        style={avatarStyle(p.name)}
                                      >
                                        {initial}
                                      </div>
                                    )}
                                  </div>
                                  {p.id === pinnedProfileId && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "var(--accent)" }} aria-label="Mijn profiel">
                                      <PushPin size={9} color="var(--on-accent)" />
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                {/* Every name speaks the house serif — the portrait just speaks louder. */}
                                <p
                                  className={`${isPortrait ? "text-xl" : "text-base"} italic truncate leading-tight`}
                                  style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500, color: "var(--text)" }}
                                >
                                  {isMulti ? p.role : p.name}
                                </p>
                                {isMulti ? (
                                  <p className="text-xs truncate mt-0.5" style={{ color: "var(--text2)" }}>
                                    {lvl?.label}
                                  </p>
                                ) : (
                                  <div className="flex flex-wrap items-center gap-1 mt-1">
                                    {p.role && <span className="text-xs font-medium" style={{ color: "var(--text2)" }}>{p.role}</span>}
                                    {lvl && <span className="text-xs" style={{ color: "var(--text2)" }}>· {lvl.label}</span>}
                                    {getProfileType(p, pinnedProfileId) === "partner" && (
                                      <Lock size={8} aria-hidden="true" style={{ color: "var(--text2)" }} />
                                    )}
                                  </div>
                                )}
                                {isPortrait && ratedCount > 0 && (
                                  <p className="text-xs mt-1 tabular-nums" style={{ color: "var(--text2)" }}>
                                    {ratedCount} beoordeeld
                                  </p>
                                )}
                              </div>
                            </div>

                          </Link>

                          {/* Absolutely positioned edit button — sibling to Link, not inside it */}
                          <button
                            onClick={() => startEdit(p)}
                            aria-label={`Profiel ${p.name} bewerken`}
                            className="focus-ring absolute top-1/2 -translate-y-1/2 right-2 w-10 h-10 flex items-center justify-center rounded-full transition-colors"
                            style={{ color: "var(--text2)" }}
                          >
                            <PencilSimple size={14} />
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
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:items-start">
        {canCompare ? (() => {
          const pairA = profiles.find((p) => p.id === compareProfiles[0]);
          const pairB = profiles.find((p) => p.id === compareProfiles[1]);
          return (
          <Link
            href={`/compare?a=${compareProfiles[0]}&b=${compareProfiles[1]}`}
            className="focus-ring block rounded-xl p-5 transition-opacity hover:opacity-90 lg:col-span-2 lg:order-1"
            style={{
              background: "linear-gradient(145deg, color-mix(in srgb, var(--accent) 8%, var(--surface)), var(--surface))",
              border: "1px solid var(--border-accent)",
            }}
          >
            <div className="flex items-center gap-4">
              {/* The two faces this card will put across the table from
                  each other — the comparison, worn as a lapel pin. */}
              <div className="flex items-center flex-none" aria-hidden="true">
                <CompareCoin p={pairA} />
                <CompareCoin p={pairB} overlap />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: "var(--text2)" }}>
                  Vergelijk
                </p>
                <p
                  className="text-lg italic leading-tight truncate"
                  style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500, color: "var(--text)" }}
                >
                  {pairA?.name}
                  <span aria-hidden="true" style={{ color: "var(--accent)", fontStyle: "normal" }}> × </span>
                  {pairB?.name}
                </p>
                <p className="text-sm mt-0.5" style={{ color: "var(--text2)" }}>
                  Zie waar jullie grenzen raken — en waar ze uitdagen.
                </p>
              </div>
              <CaretRight size={16} aria-hidden="true" className="flex-none" style={{ color: "var(--accent)" }} />
            </div>
          </Link>
          );
        })() : (
          <div
            className="rounded-xl p-5 lg:col-span-2 lg:order-1"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            role="button" tabIndex={0} aria-disabled="true"
            aria-label="Vergelijk profielen — voeg een tweede profiel toe om te vergelijken"
          >
            <div className="flex items-center gap-4">
              {/* One face at the table, one seat still open — the empty
                  coin is the invitation. */}
              <div className="flex items-center flex-none" aria-hidden="true">
                <CompareCoin p={profiles[0]} />
                <CompareCoin overlap />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: "var(--text2)" }}>
                  Vergelijk
                </p>
                <p className="text-sm" style={{ color: "var(--text2)" }}>
                  Voeg een tweede profiel toe om te vergelijken.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* The back wall keeps its voice down — slim rows, one loud CTA above */}
        <div className="flex flex-col gap-1.5 lg:col-span-2 lg:order-2">
          {profiles.length >= 2 ? (
            <Link
              href={`/contract?a=${compareProfiles[0]}&b=${compareProfiles[1]}`}
              className="focus-ring flex items-center gap-2.5 min-h-12 rounded-xl px-3 transition-colors"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <FileText size={15} aria-hidden="true" className="flex-none" style={{ color: "var(--text2)" }} />
              <span className="flex-1 text-sm font-medium truncate">Maak een contract</span>
              <CaretRight size={14} aria-hidden="true" className="flex-none" style={{ color: "var(--text2)" }} />
            </Link>
          ) : (
            <div
              className="flex items-center gap-2.5 min-h-12 rounded-xl px-3 opacity-40"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              role="button" tabIndex={0} aria-disabled="true"
              aria-label="Maak een contract — voeg twee profielen toe om een contract te maken"
            >
              <FileText size={15} aria-hidden="true" className="flex-none" style={{ color: "var(--text2)" }} />
              <span className="flex-1 text-sm font-medium truncate" style={{ color: "var(--text2)" }}>Maak een contract</span>
            </div>
          )}
          {[
            { href: "/scene", label: "Nieuwe scène", icon: FilmSlate },
            { href: "/scenes", label: "Scènes", icon: FilmSlate },
            { href: "/session", label: "Live sessie", icon: Anchor },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="focus-ring flex items-center gap-2.5 min-h-12 rounded-xl px-3 transition-colors"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <Icon size={15} aria-hidden="true" className="flex-none" style={{ color: "var(--text2)" }} />
              <span className="flex-1 text-sm font-medium truncate">{label}</span>
              <CaretRight size={14} aria-hidden="true" className="flex-none" style={{ color: "var(--text2)" }} />
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

// A profile struck as a small coin — photo if one exists, otherwise the
// monogram in its wardrobe duotone. An absent profile mints a vacant coin:
// a dashed seat waiting for the second player.
function CompareCoin({ p, overlap }: { p?: { name: string; avatarDataUrl?: string }; overlap?: boolean }) {
  const offset = overlap ? "-ml-3" : "";
  if (!p) {
    return (
      <div
        className={`w-12 h-12 rounded-full flex-none ${offset}`}
        style={{ border: "1.5px dashed var(--border-accent)", background: "var(--surface)" }}
      />
    );
  }
  return (
    <div
      className={`w-12 h-12 rounded-full overflow-hidden flex-none ${offset}`}
      style={overlap ? { boxShadow: "0 0 0 2px var(--surface)" } : undefined}
    >
      {p.avatarDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.avatarDataUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-lg italic" style={avatarStyle(p.name)}>
          {p.name[0].toUpperCase()}
        </div>
      )}
    </div>
  );
}
