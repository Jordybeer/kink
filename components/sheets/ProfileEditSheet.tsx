"use client";
import { useState, useEffect } from "react";
import Sheet from "@/components/Sheet";
import { useStore } from "@/lib/store";
import { ROLE_GROUPS, EXPERIENCE_LEVELS, RELATIONSHIP_STATUSES } from "@/lib/roles";
import { parseBdsmtestOutput } from "@/lib/parseBdsmtest";
import type { ExperienceLevel, Profile } from "@/types";

// The dressing room — moved whole out of app/profile/[id]/page.tsx (Phase 8),
// same self-owned pattern as PinFlowSheet: seeds its own mirror when the
// curtain opens, the page only decides when.

interface ProfileEditSheetProps {
  open: boolean;
  profile: Profile;
  onClose: () => void;
}

export default function ProfileEditSheet({ open, profile, onClose }: ProfileEditSheetProps) {
  const { renameProfile, setBdsmtestScores } = useStore();

  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editLevel, setEditLevel] = useState<ExperienceLevel>("beginner");
  const [editRelStatus, setEditRelStatus] = useState("");
  const [editFetLife, setEditFetLife] = useState("");
  const [editBdsmtestUrl, setEditBdsmtestUrl] = useState("");
  const [editUrlError, setEditUrlError] = useState<string | null>(null);
  const [bdsmPaste, setBdsmPaste] = useState("");
  const [bdsmParseCount, setBdsmParseCount] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setEditName(profile.name);
    setEditRole(profile.role);
    setEditLevel(profile.experienceLevel ?? "beginner");
    setEditRelStatus(profile.relationshipStatus ?? "");
    setEditFetLife(profile.fetLifeUsername ?? "");
    setEditBdsmtestUrl(profile.bdsmtestUrl ?? "");
    setEditUrlError(null);
  }, [open, profile]);

  function handleSaveEdit() {
    if (!editName.trim()) return;
    const fetLife = editFetLife.trim();
    if (fetLife && (fetLife.includes("://") || fetLife.includes("<") || fetLife.includes(">"))) {
      setEditUrlError("FetLife: vul alleen je gebruikersnaam in, geen URL.");
      return;
    }
    const bdsmtest = editBdsmtestUrl.trim();
    if (bdsmtest && !/^https?:\/\/(www\.)?bdsmtest\.org\//i.test(bdsmtest)) {
      setEditUrlError("BDSMTest: URL moet beginnen met https://bdsmtest.org/");
      return;
    }
    setEditUrlError(null);
    renameProfile(profile.id, editName.trim(), editRole, editLevel, editRelStatus || undefined, fetLife || undefined, bdsmtest || undefined);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} aria-label="Profiel bewerken">
      <div
        className="rounded-t-2xl p-6 max-h-[90dvh] overflow-y-auto"
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--border-accent)",
          borderLeft: "1px solid var(--border)",
          borderRight: "1px solid var(--border)",
        }}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "var(--border)" }} />
        <h3 className="text-sm mb-4" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400, color: "var(--accent)" }}>
          Profiel bijwerken
        </h3>
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder="Naam of alias…"
          className="focus-ring w-full rounded-lg px-3 py-2.5 text-sm mb-3 focus:outline-none placeholder-[color:var(--text2)]"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
        <label className="text-xs mb-1.5 font-medium block" style={{ color: "var(--text2)" }}>Rol</label>
        <select
          value={editRole}
          onChange={(e) => setEditRole(e.target.value)}
          className="ks-select focus-ring w-full rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none"
          style={{ backgroundColor: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
        >
          {ROLE_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.roles.map((r) => <option key={r} value={r}>{r}</option>)}
            </optgroup>
          ))}
        </select>
        <p className="text-xs mb-1.5 font-medium" style={{ color: "var(--text2)" }}>Ervaringsniveau</p>
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
              <span className="text-xs opacity-70">{l.sub}</span>
            </button>
          ))}
        </div>
        <p className="text-xs mb-1.5 font-medium" style={{ color: "var(--text2)" }}>
          Relatiestatus <span className="font-normal opacity-60">(optioneel)</span>
        </p>
        <div className="no-scrollbar flex gap-1.5 mb-4 overflow-x-auto pb-1" role="group" aria-label="Relatiestatus">
          {RELATIONSHIP_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setEditRelStatus((rs) => (rs === s ? "" : s))}
              aria-pressed={editRelStatus === s}
              className="focus-ring flex-none px-3 py-1 rounded-full text-xs font-medium transition-colors border"
              style={
                editRelStatus === s
                  ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "var(--accent)" }
                  : { color: "var(--text2)", borderColor: "var(--border)" }
              }
            >
              {s}
            </button>
          ))}
        </div>
        <p className="text-xs mb-1.5 font-medium" style={{ color: "var(--text2)" }}>
          FetLife <span className="font-normal opacity-60">(optioneel)</span>
        </p>
        <input
          value={editFetLife}
          onChange={(e) => setEditFetLife(e.target.value)}
          placeholder="Gebruikersnaam…"
          className="focus-ring w-full rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none placeholder-[color:var(--text2)]"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
        <p className="text-xs mb-1.5 font-medium" style={{ color: "var(--text2)" }}>
          BDSMTest <span className="font-normal opacity-60">(optioneel)</span>
        </p>
        <input
          value={editBdsmtestUrl}
          onChange={(e) => setEditBdsmtestUrl(e.target.value)}
          placeholder="https://bdsmtest.org/r/…"
          className="focus-ring w-full rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none placeholder-[color:var(--text2)]"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
        {editUrlError && (
          <p className="text-xs mb-3 px-1" style={{ color: "var(--hard-no)" }}>{editUrlError}</p>
        )}
        <p className="text-xs mb-1.5 font-medium" style={{ color: "var(--text2)" }}>
          BDSMTest resultaten <span className="font-normal opacity-60">(plak je resultaten)</span>
        </p>
        <textarea
          value={bdsmPaste}
          onChange={(e) => { setBdsmPaste(e.target.value); setBdsmParseCount(null); }}
          placeholder={"== Results from bdsmtest.org ==\n100% Dominant\n97% Sadist\n…"}
          rows={4}
          className="focus-ring w-full rounded-lg px-3 py-2.5 text-xs mb-2 focus:outline-none placeholder-[color:var(--text2)] resize-none font-mono"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
        <button
          type="button"
          onClick={() => {
            const scores = parseBdsmtestOutput(bdsmPaste);
            if (scores.length > 0) {
              setBdsmtestScores(profile.id, scores);
              setBdsmParseCount(scores.length);
              setBdsmPaste("");
            }
          }}
          disabled={!bdsmPaste.trim()}
          className="focus-ring w-full py-2 rounded-lg text-xs font-semibold mb-1 transition-opacity disabled:opacity-40"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
        >
          Verwerk resultaten
        </button>
        {bdsmParseCount !== null && (
          <p className="text-xs mb-3 px-1" style={{ color: "var(--willing)" }}>
            {bdsmParseCount} rollen ingeladen ✓
          </p>
        )}
        {(profile.bdsmtestScores?.length ?? 0) > 0 && bdsmParseCount === null && (
          <p className="text-xs mb-3 px-1" style={{ color: "var(--text2)" }}>
            {profile.bdsmtestScores!.length} rollen opgeslagen · plak nieuwe tekst om te vervangen
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleSaveEdit}
            disabled={!editName.trim()}
            className="focus-ring flex-1 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-40"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            Opslaan
          </button>
          <button
            onClick={onClose}
            className="focus-ring px-4 py-2.5 rounded-lg border text-sm"
            style={{ borderColor: "var(--border)", color: "var(--text2)" }}
          >
            Annuleer
          </button>
        </div>
      </div>
    </Sheet>
  );
}
