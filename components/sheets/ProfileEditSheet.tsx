"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CaretDown,
  CaretUp,
  Check,
  Crown,
  Heart,
  ListChecks,
  PencilSimple,
  Sparkle,
  UsersThree,
} from "@phosphor-icons/react";
import Sheet, { SheetContent } from "@/components/Sheet";
import { useStore } from "@/lib/store";
import { RELATIONSHIP_STATUSES } from "@/lib/roles";
import { parseBdsmtestOutput } from "@/lib/parseBdsmtest";
import {
  DEFAULT_QUESTIONNAIRE_SETUP,
  QUESTIONNAIRE_INTERESTS,
  QUESTIONNAIRE_PRESETS,
  questionnaireCount,
} from "@/lib/questionnaire";
import {
  adoptProfilePerspective,
  getProfileSiblings,
  updateProfileIdentity,
  updateProfileQuestionnaire,
} from "@/lib/profilePerspectives";
import type {
  Profile,
  ProfilePerspective,
  QuestionnaireInterest,
  QuestionnairePreset,
} from "@/types";

interface ProfileEditSheetProps {
  open: boolean;
  profile: Profile;
  onClose: () => void;
}

function inferredPerspective(profile: Profile): ProfilePerspective | null {
  if (profile.perspective) return profile.perspective;
  const normalized = profile.role.trim().toLowerCase();
  if (normalized === "dominant") return "dominant";
  if (normalized === "submissive") return "submissive";
  return null;
}

export default function ProfileEditSheet({ open, profile, onClose }: ProfileEditSheetProps) {
  const profiles = useStore((state) => state.profiles);
  const setBdsmtestScores = useStore((state) => state.setBdsmtestScores);
  const siblings = getProfileSiblings(profile, profiles);
  const paired = siblings.length > 0;

  const [name, setName] = useState("");
  const [perspective, setPerspective] = useState<ProfilePerspective | null>(null);
  const [relationshipStatus, setRelationshipStatus] = useState("");
  const [fetLife, setFetLife] = useState("");
  const [bdsmtestUrl, setBdsmtestUrl] = useState("");
  const [preset, setPreset] = useState<QuestionnairePreset>("balanced");
  const [interests, setInterests] = useState<QuestionnaireInterest[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [bdsmPaste, setBdsmPaste] = useState("");
  const [bdsmParseCount, setBdsmParseCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const setup = profile.questionnaireSetup ?? DEFAULT_QUESTIONNAIRE_SETUP;
    setName(profile.name);
    setPerspective(inferredPerspective(profile));
    setRelationshipStatus(profile.relationshipStatus ?? "");
    setFetLife(profile.fetLifeUsername ?? "");
    setBdsmtestUrl(profile.bdsmtestUrl ?? "");
    setPreset(setup.preset);
    setInterests([...setup.interests]);
    setAdvancedOpen(false);
    setBdsmPaste("");
    setBdsmParseCount(null);
    setError(null);
    // Reset when this sheet opens for a profile, not after every store mutation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profile.id]);

  const count = useMemo(
    () => questionnaireCount({ preset, interests, version: 1 }),
    [preset, interests],
  );

  function toggleInterest(interest: QuestionnaireInterest) {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((candidate) => candidate !== interest)
        : [...current, interest],
    );
  }

  function save() {
    if (!name.trim()) {
      setError("Vul een naam of alias in.");
      return;
    }
    if (!perspective) {
      setError("Kies eerst Dominant of Submissive voor dit profiel.");
      return;
    }

    const cleanFetLife = fetLife.trim();
    if (cleanFetLife && (cleanFetLife.includes("://") || cleanFetLife.includes("<") || cleanFetLife.includes(">"))) {
      setError("Vul bij FetLife alleen de gebruikersnaam in.");
      return;
    }

    const cleanBdsmtestUrl = bdsmtestUrl.trim();
    if (cleanBdsmtestUrl && !/^https?:\/\/(www\.)?bdsmtest\.org\//i.test(cleanBdsmtestUrl)) {
      setError("De BDSMTest-link moet beginnen met https://bdsmtest.org/.");
      return;
    }

    try {
      updateProfileIdentity(profile.id, {
        name: name.trim(),
        relationshipStatus: relationshipStatus || undefined,
        fetLifeUsername: cleanFetLife || undefined,
        bdsmtestUrl: cleanBdsmtestUrl || undefined,
      });

      if (profile.perspective !== perspective) {
        adoptProfilePerspective(profile.id, perspective);
      }

      updateProfileQuestionnaire(profile.id, {
        preset,
        interests,
        version: 1,
      });

      setError(null);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Profiel kon niet worden opgeslagen.");
    }
  }

  function importBdsmResults() {
    const scores = parseBdsmtestOutput(bdsmPaste);
    if (scores.length === 0) {
      setError("Geen herkenbare BDSMTest-resultaten gevonden.");
      return;
    }
    setBdsmtestScores(profile.id, scores);
    setBdsmParseCount(scores.length);
    setBdsmPaste("");
    setError(null);
  }

  return (
    <Sheet open={open} onClose={onClose} scrollable aria-label="Profiel bewerken">
      <SheetContent
        showClose={false}
        className="max-h-[calc(100dvh-env(safe-area-inset-top))] overflow-hidden px-0 pb-0 pt-3"
      >
        <div className="px-5 pb-4 flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-none"
            style={{
              background: "color-mix(in srgb, var(--accent) 14%, var(--surface2))",
              color: "var(--accent)",
              border: "1px solid var(--border-accent)",
            }}
          >
            <PencilSimple aria-hidden="true" size={21} weight="duotone" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--text2)" }}>
              Profiel
            </p>
            <h2
              className="text-2xl leading-tight"
              style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 600 }}
            >
              Profiel bijwerken
            </h2>
          </div>
        </div>

        <div className="overflow-y-auto overscroll-contain px-5 pb-5 space-y-4" style={{ maxHeight: "calc(100dvh - 170px)" }}>
          <section
            className="rounded-2xl p-4"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <UsersThree aria-hidden="true" size={17} style={{ color: "var(--accent)" }} />
              <h3 className="text-sm font-semibold">Persoon & perspectief</h3>
            </div>

            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text2)" }}>
              Naam of alias
            </label>
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              placeholder="Naam of alias"
              className="focus-ring w-full min-h-12 rounded-xl px-3.5 text-base mb-3 focus:outline-none"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            />

            {paired ? (
              <div
                className="rounded-xl p-3 flex items-center gap-3"
                style={{ background: "var(--surface)", border: "1px solid var(--border-accent)" }}
              >
                {perspective === "dominant"
                  ? <Crown aria-hidden="true" size={19} style={{ color: "var(--accent)" }} />
                  : <Heart aria-hidden="true" size={19} style={{ color: "var(--accent)" }} />}
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {perspective === "dominant" ? "Dominant" : "Submissive"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text2)" }}>
                    Gekoppeld aan {siblings.map((sibling) => sibling.role).join(" en ")}. De naam wordt voor beide aangepast.
                  </p>
                  {profile.legacyRole && (
                    <p className="text-xs mt-1" style={{ color: "var(--accent)" }}>
                      Eerdere rol: {profile.legacyRole}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <fieldset className="border-0 p-0 m-0">
                <legend className="text-xs font-semibold mb-2" style={{ color: "var(--text2)" }}>
                  Primaire richting
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: "dominant" as const, label: "Dominant", icon: Crown },
                    { value: "submissive" as const, label: "Submissive", icon: Heart },
                  ]).map(({ value, label, icon: Icon }) => {
                    const active = perspective === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPerspective(value)}
                        aria-pressed={active}
                        className="focus-ring min-h-[64px] rounded-xl px-3 flex items-center gap-2 text-left"
                        style={active
                          ? { background: "color-mix(in srgb, var(--accent) 10%, var(--surface))", border: "1px solid var(--accent)" }
                          : { background: "var(--surface)", border: "1px solid var(--border)" }}
                      >
                        <Icon size={18} style={{ color: active ? "var(--accent)" : "var(--text2)" }} />
                        <span className="text-sm font-semibold">{label}</span>
                        {active && <Check aria-hidden="true" size={14} className="ml-auto" style={{ color: "var(--accent)" }} />}
                      </button>
                    );
                  })}
                </div>
                {!profile.perspective && (
                  <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--text2)" }}>
                    Je oude rol “{profile.role || "niet ingevuld"}” wordt als historische context bewaard wanneer je deze keuze opslaat.
                  </p>
                )}
                {profile.legacyRole && (
                  <p className="text-xs mt-2" style={{ color: "var(--accent)" }}>
                    Eerdere rol: {profile.legacyRole}
                  </p>
                )}
              </fieldset>
            )}
          </section>

          <section
            className="rounded-2xl p-4"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-2 mb-1">
              <ListChecks aria-hidden="true" size={17} style={{ color: "var(--accent)" }} />
              <h3 className="text-sm font-semibold">Jouw vragenlijst</h3>
            </div>
            <p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--text2)" }}>
              Verkleinen wist niets. Reeds beantwoorde onderwerpen blijven altijd zichtbaar.
            </p>

            <div className="grid gap-2 mb-4">
              {QUESTIONNAIRE_PRESETS.map((option) => {
                const active = preset === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPreset(option.value)}
                    aria-pressed={active}
                    className="focus-ring min-h-[62px] rounded-xl px-3 py-2.5 text-left"
                    style={active
                      ? { background: "color-mix(in srgb, var(--accent) 10%, var(--surface))", border: "1px solid var(--accent)" }
                      : { background: "var(--surface)", border: "1px solid var(--border)" }}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{option.label}</span>
                      {active && <Check aria-hidden="true" size={14} style={{ color: "var(--accent)" }} />}
                    </span>
                    <span className="block text-xs mt-0.5" style={{ color: "var(--text2)" }}>
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-xs font-semibold mb-2" style={{ color: "var(--text2)" }}>
              Interessegebieden
            </p>
            <div className="flex flex-wrap gap-2">
              {QUESTIONNAIRE_INTERESTS.map((interest) => {
                const active = interests.includes(interest.value);
                return (
                  <button
                    key={interest.value}
                    type="button"
                    onClick={() => toggleInterest(interest.value)}
                    aria-pressed={active}
                    className="focus-ring min-h-10 rounded-full px-3 text-xs font-semibold"
                    style={active
                      ? { background: "var(--accent)", color: "var(--on-accent)", border: "1px solid var(--accent)" }
                      : { background: "var(--surface)", color: "var(--text2)", border: "1px solid var(--border)" }}
                  >
                    {interest.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs mt-3" style={{ color: "var(--accent)" }}>
              Ongeveer {count} onderwerpen in deze startselectie.
            </p>
          </section>

          <section
            className="rounded-2xl p-4"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkle aria-hidden="true" size={17} style={{ color: "var(--accent)" }} />
              <h3 className="text-sm font-semibold">Profielinformatie</h3>
            </div>

            <p className="text-xs font-semibold mb-2" style={{ color: "var(--text2)" }}>
              Relatiestatus <span className="font-normal opacity-60">(optioneel)</span>
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {RELATIONSHIP_STATUSES.map((status) => {
                const active = relationshipStatus === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setRelationshipStatus(active ? "" : status)}
                    aria-pressed={active}
                    className="focus-ring min-h-10 rounded-full px-3 text-xs font-semibold"
                    style={active
                      ? { background: "var(--accent)", color: "var(--on-accent)", border: "1px solid var(--accent)" }
                      : { background: "var(--surface)", color: "var(--text2)", border: "1px solid var(--border)" }}
                  >
                    {status}
                  </button>
                );
              })}
            </div>

            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text2)" }}>
              FetLife-gebruikersnaam <span className="font-normal opacity-60">(optioneel)</span>
            </label>
            <input
              value={fetLife}
              onChange={(event) => setFetLife(event.target.value)}
              placeholder="Alleen je gebruikersnaam"
              className="focus-ring w-full min-h-11 rounded-xl px-3 text-sm focus:outline-none"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </section>

          <section
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <button
              type="button"
              onClick={() => setAdvancedOpen((current) => !current)}
              aria-expanded={advancedOpen}
              className="focus-ring w-full min-h-[64px] px-4 flex items-center gap-3 text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">BDSMTest-resultaten</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text2)" }}>
                  {(profile.bdsmtestScores?.length ?? 0) > 0
                    ? `${profile.bdsmtestScores!.length} rollen opgeslagen`
                    : "Optionele externe profielinformatie"}
                </p>
              </div>
              {advancedOpen ? <CaretUp aria-hidden="true" size={16} /> : <CaretDown aria-hidden="true" size={16} />}
            </button>

            {advancedOpen && (
              <div className="px-4 pb-4 pt-1" style={{ borderTop: "1px solid var(--border)" }}>
                <label className="block text-xs font-semibold mt-3 mb-1.5" style={{ color: "var(--text2)" }}>
                  Resultaatlink
                </label>
                <input
                  value={bdsmtestUrl}
                  onChange={(event) => setBdsmtestUrl(event.target.value)}
                  placeholder="https://bdsmtest.org/r/…"
                  className="focus-ring w-full min-h-11 rounded-xl px-3 text-sm mb-3 focus:outline-none"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                />

                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text2)" }}>
                  Plak resultaten
                </label>
                <textarea
                  value={bdsmPaste}
                  onChange={(event) => {
                    setBdsmPaste(event.target.value);
                    setBdsmParseCount(null);
                  }}
                  placeholder={"== Results from bdsmtest.org ==\n100% Dominant\n97% Sadist\n…"}
                  rows={4}
                  className="focus-ring w-full rounded-xl px-3 py-2.5 text-xs resize-none font-mono focus:outline-none"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
                <button
                  type="button"
                  onClick={importBdsmResults}
                  disabled={!bdsmPaste.trim()}
                  className="focus-ring w-full min-h-11 rounded-xl mt-2 text-xs font-semibold disabled:opacity-40"
                  style={{ border: "1px solid var(--border)", color: "var(--text)" }}
                >
                  Verwerk resultaten
                </button>
                {bdsmParseCount !== null && (
                  <p className="text-xs mt-2" style={{ color: "var(--willing)" }}>
                    {bdsmParseCount} rollen ingeladen.
                  </p>
                )}
              </div>
            )}
          </section>
        </div>

        <div
          className="px-5 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}
        >
          {error && (
            <p className="text-xs mb-2" role="alert" style={{ color: "var(--hard-no)" }}>
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onClose}
              className="focus-ring min-h-12 rounded-xl text-sm font-semibold"
              style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}
            >
              Annuleer
            </button>
            <button
              type="button"
              onClick={save}
              className="focus-ring min-h-12 rounded-xl text-sm font-bold"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              Opslaan
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
