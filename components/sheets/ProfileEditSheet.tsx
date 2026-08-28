"use client";

import { useEffect, useState } from "react";
import {
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
import {
  QUESTIONNAIRE_INTERESTS,
  QUESTIONNAIRE_MODES,
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
  QuestionnaireMode,
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
  const siblings = getProfileSiblings(profile, profiles);
  const paired = siblings.length > 0;

  const [name, setName] = useState("");
  const [perspective, setPerspective] = useState<ProfilePerspective | null>(null);
  const [relationshipStatus, setRelationshipStatus] = useState("");
  const [questionnaireMode, setQuestionnaireMode] = useState<QuestionnaireMode>("dynamic");
  const [interests, setInterests] = useState<QuestionnaireInterest[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const setup = profile.questionnaireSetup;
    setName(profile.name);
    setPerspective(inferredPerspective(profile));
    setRelationshipStatus(profile.relationshipStatus ?? "");
    setQuestionnaireMode(setup?.mode ?? "dynamic");
    setInterests([...(setup?.interests ?? [])]);
    setError(null);
    // Reset when this sheet opens for a profile, not after every store mutation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profile.id]);

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

    try {
      updateProfileIdentity(profile.id, {
        name: name.trim(),
        relationshipStatus: relationshipStatus || undefined,
        fetLifeUsername: profile.fetLifeUsername,
        bdsmtestUrl: profile.bdsmtestUrl,
      });

      if (profile.perspective !== perspective) {
        adoptProfilePerspective(profile.id, perspective);
      }

      updateProfileQuestionnaire(profile.id, {
        mode: questionnaireMode,
        interests,
        version: 2,
      });

      setError(null);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Profiel kon niet worden opgeslagen.");
    }
  }

  return (
    <Sheet open={open} onClose={onClose} scrollable aria-label="Profiel bewerken">
      <SheetContent
        showClose={false}
        className="flex flex-col overflow-hidden px-0 pb-0 pt-3"
        style={{ maxHeight: "calc(var(--visual-viewport-height, 100dvh) - env(safe-area-inset-top))" }}
      >
        <div className="flex flex-none items-center gap-3 px-5 pb-4" data-testid="profile-edit-header">
          <div
            className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl"
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

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pb-5" data-testid="profile-edit-scroll-body">
          <section
            className="rounded-2xl p-4"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <div className="mb-3 flex items-center gap-2">
              <UsersThree aria-hidden="true" size={17} style={{ color: "var(--accent)" }} />
              <h3 className="text-sm font-semibold">Persoon &amp; perspectief</h3>
            </div>

            <label htmlFor="profile-edit-name" className="mb-1.5 block text-sm font-semibold" style={{ color: "var(--text2)" }}>
              Naam of alias
            </label>
            <input
              id="profile-edit-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              placeholder="Naam of alias"
              autoComplete="off"
              spellCheck={false}
              className="focus-ring mb-3 min-h-12 w-full rounded-xl px-3.5 text-base focus:outline-none"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            />

            {paired ? (
              <div
                className="flex items-center gap-3 rounded-xl p-3"
                style={{ background: "var(--surface)", border: "1px solid var(--border-accent)" }}
              >
                {perspective === "dominant"
                  ? <Crown aria-hidden="true" size={19} style={{ color: "var(--accent)" }} />
                  : <Heart aria-hidden="true" size={19} style={{ color: "var(--accent)" }} />}
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {perspective === "dominant" ? "Dominant" : "Submissive"}
                  </p>
                  <p className="mt-0.5 text-sm" style={{ color: "var(--text2)" }}>
                    Gekoppeld aan {siblings.map((sibling) => sibling.role).join(" en ")}. De naam wordt voor beide aangepast.
                  </p>
                  {profile.legacyRole && (
                    <p className="mt-1 text-xs" style={{ color: "var(--accent)" }}>
                      Eerdere rol: {profile.legacyRole}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <fieldset className="m-0 border-0 p-0">
                <legend className="mb-2 text-sm font-semibold" style={{ color: "var(--text2)" }}>
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
                        className="focus-ring flex min-h-[64px] items-center gap-2 rounded-xl px-3 text-left"
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
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
                    Je oude rol “{profile.role || "niet ingevuld"}” wordt als historische context bewaard wanneer je deze keuze opslaat.
                  </p>
                )}
                {profile.legacyRole && (
                  <p className="mt-2 text-xs" style={{ color: "var(--accent)" }}>
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
            <div className="mb-1 flex items-center gap-2">
              <ListChecks aria-hidden="true" size={17} style={{ color: "var(--accent)" }} />
              <h3 className="text-sm font-semibold">Jouw vragenlijst</h3>
            </div>
            <p className="mb-3 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
              Bestaande antwoorden blijven staan. De flow kiest alleen welke onbeantwoorde vraag nu nuttig is.
            </p>

            <p className="mb-2 text-sm font-semibold" style={{ color: "var(--text2)" }}>
              Flow
            </p>
            <div className="mb-4 grid gap-2">
              {QUESTIONNAIRE_MODES.map((option) => {
                const active = questionnaireMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setQuestionnaireMode(option.value)}
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
                    <span className="mt-0.5 block text-sm" style={{ color: "var(--text2)" }}>
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mb-2 text-sm font-semibold" style={{ color: "var(--text2)" }}>
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
                    className="focus-ring min-h-11 rounded-full px-3 text-sm font-semibold"
                    style={active
                      ? { background: "var(--accent-fill)", color: "var(--on-accent-fill)", border: "1px solid var(--accent)" }
                      : { background: "var(--surface)", color: "var(--text2)", border: "1px solid var(--border)" }}
                  >
                    {interest.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--accent)" }}>
              {questionnaireMode === "dynamic"
                ? "Dynamic heeft geen vast aantal: coverage blijft stabiel, expliciete positieve antwoorden kunnen één lokale vervolgdeur openen."
                : "Deep Dive blijft ordenen, maar laat uiteindelijk geen catalogusonderwerp over."}
            </p>
          </section>

          <section
            className="rounded-2xl p-4"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <div className="mb-3 flex items-center gap-2">
              <Sparkle aria-hidden="true" size={17} style={{ color: "var(--accent)" }} />
              <h3 className="text-sm font-semibold">Profielinformatie</h3>
            </div>

            <p className="mb-2 text-sm font-semibold" style={{ color: "var(--text2)" }}>
              Relatiestatus <span className="font-normal opacity-60">(optioneel)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {RELATIONSHIP_STATUSES.map((status) => {
                const active = relationshipStatus === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setRelationshipStatus(active ? "" : status)}
                    aria-pressed={active}
                    className="focus-ring min-h-11 rounded-full px-3 text-sm font-semibold"
                    style={active
                      ? { background: "var(--accent-fill)", color: "var(--on-accent-fill)", border: "1px solid var(--accent)" }
                      : { background: "var(--surface)", color: "var(--text2)", border: "1px solid var(--border)" }}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-sm leading-5" style={{ color: "var(--text2)" }}>
              FetLife en BDSMTest beheer je via Profiel aanvullen op je profiel.
            </p>
          </section>
        </div>

        <div
          className="flex-none px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3"
          data-testid="profile-edit-footer"
          style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}
        >
          {error && (
            <p className="mb-2 text-sm" role="alert" style={{ color: "var(--hard-no)" }}>
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
              className="focus-ring min-h-12 rounded-xl text-sm font-semibold"
              style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
            >
              Opslaan
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
