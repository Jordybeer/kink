"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CameraPlus,
  CaretLeft,
  CaretRight,
  Check,
  CheckCircle,
  Heart,
  LinkSimple,
  ListChecks,
  Sparkle,
  Trash,
} from "@phosphor-icons/react";
import Sheet, { SheetContent } from "@/components/Sheet";
import { avatarStyle } from "@/lib/avatar";
import { resizeImage } from "@/lib/imageUtils";
import {
  MAX_BDSMTEST_COPY_CHARS,
  parseBdsmtestCopyAll,
  type BdsmtestCopyAllError,
} from "@/lib/parseBdsmtest";
import {
  adoptProfilePerspective,
  getProfileSiblings,
  updateProfileIdentity,
  updateProfileQuestionnaire,
} from "@/lib/profilePerspectives";
import { QUESTIONNAIRE_INTERESTS, QUESTIONNAIRE_MODES } from "@/lib/questionnaire";
import { RELATIONSHIP_STATUSES } from "@/lib/roles";
import { useStore } from "@/lib/store";
import type {
  ExperienceLevel,
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

type Step = 1 | 2;
type EditPanel = "sources" | "interests" | "flow" | null;

const EXPERIENCE_OPTIONS: Array<{ value: ExperienceLevel; label: string }> = [
  { value: "beginner", label: "Beginner" },
  { value: "gevorderd", label: "Gevorderd" },
  { value: "ervaren", label: "Ervaren" },
  { value: "diepgaand", label: "Diepgaand" },
];

const ERROR_COPY: Record<BdsmtestCopyAllError, string> = {
  "too-large": "Deze plaktekst is te groot om veilig te verwerken.",
  "missing-url": "Geen geldige BDSMTest-resultaatlink gevonden.",
  "multiple-urls": "Deze plaktekst bevat meer dan één resultaatlink.",
  "invalid-url": "De resultaatlink lijkt niet van bdsmtest.org te komen.",
  "missing-results": "Geen herkenbare BDSMTest-resultaten gevonden.",
  "invalid-results": "Een of meer BDSMTest-resultaten hebben een ongeldig formaat.",
};

const BDSMTEST_INPUT_MAX_CHARS = MAX_BDSMTEST_COPY_CHARS + 1;

function validFetLifeUsername(value: string): boolean {
  const clean = value.trim();
  return !clean || (!clean.includes("://") && !clean.includes("<") && !clean.includes(">") && clean.length <= 200);
}

function inferredPerspective(profile: Profile): ProfilePerspective | null {
  if (profile.perspective) return profile.perspective;
  const normalized = profile.role.trim().toLowerCase();
  if (normalized === "dominant") return "dominant";
  if (normalized === "submissive") return "submissive";
  return null;
}

function perspectiveForProfile(profile: Profile): ProfilePerspective | null {
  if (profile.perspective) return profile.perspective;
  const role = profile.role.trim().toLowerCase();
  return role === "dominant" || role === "submissive" ? role : null;
}

export default function ProfileEditSheet({ open, profile, onClose }: ProfileEditSheetProps) {
  const profiles = useStore((state) => state.profiles);
  const siblings = getProfileSiblings(profile, profiles);
  const paired = siblings.length > 0;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [panel, setPanel] = useState<EditPanel>(null);
  const [name, setName] = useState("");
  const [perspective, setPerspective] = useState<ProfilePerspective | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("beginner");
  const [relationshipStatus, setRelationshipStatus] = useState("");
  const [questionnaireMode, setQuestionnaireMode] = useState<QuestionnaireMode>("dynamic");
  const [interests, setInterests] = useState<QuestionnaireInterest[]>([]);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>();
  const [fetLife, setFetLife] = useState("");
  const [bdsmPaste, setBdsmPaste] = useState("");
  const [removeBdsmtest, setRemoveBdsmtest] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const setup = profile.questionnaireSetup;
    setStep(1);
    setPanel(null);
    setName(profile.name);
    setPerspective(inferredPerspective(profile));
    setExperienceLevel(profile.experienceLevel ?? "beginner");
    setRelationshipStatus(profile.relationshipStatus ?? "");
    setQuestionnaireMode(setup?.mode ?? "dynamic");
    setInterests([...(setup?.interests ?? [])]);
    setAvatarDataUrl(profile.avatarDataUrl);
    setFetLife(profile.fetLifeUsername ?? "");
    setBdsmPaste("");
    setRemoveBdsmtest(false);
    setError(null);
    // Reset when this sheet opens for a profile, not after every store mutation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profile.id]);

  const parsedBdsmtest = useMemo(() => {
    if (!bdsmPaste.trim()) return null;
    return parseBdsmtestCopyAll(bdsmPaste);
  }, [bdsmPaste]);

  const sourcesValid = validFetLifeUsername(fetLife)
    && (!bdsmPaste.trim() || parsedBdsmtest?.ok === true);

  function toggleInterest(interest: QuestionnaireInterest) {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((candidate) => candidate !== interest)
        : [...current, interest],
    );
  }

  function validateIdentity(): boolean {
    if (!name.trim()) {
      setError("Vul een naam of alias in.");
      return false;
    }
    if (!perspective) {
      setError("Kies eerst Dominant of Submissive voor dit profiel.");
      return false;
    }
    return true;
  }

  function validateSources(): boolean {
    if (!validFetLifeUsername(fetLife)) {
      setError("Vul bij FetLife alleen je gebruikersnaam in.");
      return false;
    }
    if (bdsmPaste.trim() && (!parsedBdsmtest || !parsedBdsmtest.ok)) {
      setError(parsedBdsmtest && !parsedBdsmtest.ok ? ERROR_COPY[parsedBdsmtest.error] : "BDSMTest kon niet worden verwerkt.");
      return false;
    }
    return true;
  }

  function goNext() {
    if (!validateIdentity()) {
      setPanel(null);
      return;
    }
    if (!validateSources()) {
      setPanel("sources");
      return;
    }
    setError(null);
    setStep(2);
    setPanel(null);
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setAvatarDataUrl(await resizeImage(file));
      setError(null);
    } catch (caught) {
      console.error("Avatar upload failed:", caught);
      setError("Afbeelding kon niet worden verwerkt. Probeer een andere afbeelding.");
    }
    event.target.value = "";
  }

  function save() {
    if (!validateIdentity()) {
      setStep(1);
      setPanel(null);
      return;
    }
    if (!validateSources()) {
      setStep(1);
      setPanel("sources");
      return;
    }

    try {
      const cleanFetLife = fetLife.trim();
      const nextBdsmtestUrl = removeBdsmtest
        ? undefined
        : parsedBdsmtest?.ok
          ? parsedBdsmtest.url
          : profile.bdsmtestUrl;

      updateProfileIdentity(profile.id, {
        name: name.trim(),
        relationshipStatus: relationshipStatus || undefined,
        fetLifeUsername: cleanFetLife || undefined,
        bdsmtestUrl: nextBdsmtestUrl,
      });

      if (profile.perspective !== perspective) {
        adoptProfilePerspective(profile.id, perspective!);
      }

      updateProfileQuestionnaire(profile.id, {
        mode: questionnaireMode,
        interests,
        version: 2,
      });

      useStore.setState((state) => ({
        profiles: state.profiles.map((candidate) => {
          if (candidate.id !== profile.id) return candidate;
          const sourcePatch = removeBdsmtest
            ? { bdsmtestUrl: undefined, bdsmtestScores: undefined }
            : parsedBdsmtest?.ok
              ? { bdsmtestUrl: parsedBdsmtest.url, bdsmtestScores: parsedBdsmtest.scores }
              : {};
          return {
            ...candidate,
            ...sourcePatch,
            experienceLevel,
            updatedAt: Date.now(),
          };
        }),
      }));

      if (avatarDataUrl !== profile.avatarDataUrl) {
        useStore.getState().setProfileAvatar(profile.id, avatarDataUrl);
      }

      setError(null);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Profiel kon niet worden opgeslagen.");
    }
  }

  const initial = name.trim().charAt(0).toUpperCase() || profile.name.charAt(0).toUpperCase();
  const modeLabel = QUESTIONNAIRE_MODES.find((option) => option.value === questionnaireMode)?.label ?? "Dynamic";
  const siblingPerspectives = new Set(siblings.map(perspectiveForProfile).filter(Boolean));
  const hasStoredBdsmtest = Boolean(profile.bdsmtestUrl || profile.bdsmtestScores?.length);
  const hasDraftBdsmtest = removeBdsmtest ? false : Boolean(parsedBdsmtest?.ok || hasStoredBdsmtest);
  const sourceLabels = [fetLife.trim() ? "FetLife" : null, hasDraftBdsmtest ? "BDSMTest" : null].filter(Boolean);
  const sourceSummary = sourceLabels.length ? sourceLabels.join(" · ") : "Niet gekoppeld";

  return (
    <Sheet open={open} onClose={onClose} scrollable variant="surface" aria-label="Profiel bewerken">
      <SheetContent
        showClose={false}
        showHandle={false}
        className="flex h-[calc(var(--visual-viewport-height,100dvh)-env(safe-area-inset-top)-var(--sheet-edge-clearance))] flex-col overflow-hidden rounded-t-[24px] px-0 pb-0 pt-0 sm:h-auto sm:min-h-[42rem] sm:max-h-[min(48rem,calc(100dvh-3rem))] sm:rounded-[24px]"
        style={{
          backgroundImage: "radial-gradient(ellipse 88% 24rem at 50% 0%, color-mix(in srgb, var(--accent) 11%, transparent), transparent 76%)",
          backgroundRepeat: "no-repeat",
        }}
      >
        <header className="flex-none px-5 pb-3 pt-4" data-testid="profile-edit-header">
          <div className="grid min-h-11 grid-cols-[1fr_auto_1fr] items-center gap-2">
            <span aria-hidden="true" />
            <h2 className="text-base font-semibold">Profiel bewerken</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Profiel bewerken sluiten"
              className="focus-ring min-h-11 justify-self-end px-1 text-sm font-medium"
              style={{ color: "var(--text2)" }}
            >
              Annuleren
            </button>
          </div>

          <div className="mx-auto mt-2 flex max-w-[12rem] items-center gap-3" aria-label="Stappen">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setPanel(null);
                setError(null);
              }}
              className="focus-ring flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-semibold"
              aria-current={step === 1 ? "step" : undefined}
              style={step === 1
                ? { background: "var(--accent-fill)", color: "var(--on-accent-fill)" }
                : { background: "var(--accent2)", color: "var(--bg)" }}
            >
              {step === 1 ? "1" : <Check size={16} weight="bold" aria-hidden="true" />}
            </button>
            <span className="h-px flex-1" style={{ background: "var(--border)" }} aria-hidden="true" />
            <button
              type="button"
              onClick={goNext}
              className="focus-ring flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-semibold"
              aria-current={step === 2 ? "step" : undefined}
              style={step === 2
                ? { background: "var(--accent-fill)", color: "var(--on-accent-fill)" }
                : { border: "1px solid var(--border-accent)", color: "var(--text2)" }}
            >
              2
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-4" data-testid="profile-edit-scroll-body">
          {step === 1 && panel === "sources" ? (
            <section data-testid="profile-edit-sources-panel">
              <button
                type="button"
                onClick={() => {
                  setPanel(null);
                  setError(null);
                }}
                className="focus-ring mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold"
                style={{ color: "var(--text2)" }}
              >
                <CaretLeft size={16} aria-hidden="true" /> Identiteit
              </button>
              <h3 className="text-xl font-semibold">Gekoppelde bronnen</h3>
              <p className="mt-1 text-sm leading-5" style={{ color: "var(--text2)" }}>
                Optionele externe profielcontext. Alles blijft lokaal opgeslagen.
              </p>

              <section className="mt-5">
                <div className="flex items-center gap-2">
                  <LinkSimple size={18} aria-hidden="true" style={{ color: "var(--accent)" }} />
                  <h4 className="text-sm font-semibold">FetLife</h4>
                </div>
                <p className="mt-1 text-sm leading-5" style={{ color: "var(--text2)" }}>
                  Vul alleen je gebruikersnaam in. De link wordt lokaal opgebouwd.
                </p>
                <input
                  value={fetLife}
                  onChange={(event) => {
                    setFetLife(event.target.value);
                    setError(null);
                  }}
                  maxLength={200}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Gebruikersnaam"
                  className="focus-ring mt-3 min-h-12 w-full rounded-xl px-3.5 text-base focus:outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
              </section>

              <section className="mt-5 border-t pt-5" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2">
                  <Sparkle size={18} aria-hidden="true" style={{ color: "var(--accent)" }} />
                  <h4 className="text-sm font-semibold">BDSMTest</h4>
                </div>
                <p className="mt-1 text-sm leading-5" style={{ color: "var(--text2)" }}>
                  Kies op bdsmtest.org Copy all en plak het resultaat hier in één keer.
                </p>
                <textarea
                  value={bdsmPaste}
                  onChange={(event) => {
                    setBdsmPaste(event.target.value);
                    setRemoveBdsmtest(false);
                    setError(null);
                  }}
                  rows={4}
                  maxLength={BDSMTEST_INPUT_MAX_CHARS}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Plak hier de resultaatlink en resultaten"
                  className="focus-ring mt-3 max-h-36 w-full resize-none rounded-xl px-3.5 py-3 text-base leading-6 focus:outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                />

                {parsedBdsmtest?.ok && (
                  <div className="mt-3 flex flex-wrap gap-2" role="status">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm" style={{ color: "var(--yes)", border: "1px solid color-mix(in srgb, var(--yes) 30%, var(--border))" }}>
                      <CheckCircle size={14} weight="fill" aria-hidden="true" /> Resultaatlink gevonden
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm" style={{ color: "var(--yes)", border: "1px solid color-mix(in srgb, var(--yes) 30%, var(--border))" }}>
                      <CheckCircle size={14} weight="fill" aria-hidden="true" /> {parsedBdsmtest.scores.length} resultaten gevonden
                    </span>
                  </div>
                )}

                {parsedBdsmtest && !parsedBdsmtest.ok && (
                  <p className="mt-2 text-sm leading-5" role="status" style={{ color: "var(--hard-no-text)" }}>
                    {ERROR_COPY[parsedBdsmtest.error]}
                  </p>
                )}

                {hasStoredBdsmtest && !bdsmPaste.trim() && !removeBdsmtest && (
                  <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
                    <p className="text-sm" style={{ color: "var(--text2)" }}>
                      {profile.bdsmtestScores?.length ?? 0} resultaten opgeslagen
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setRemoveBdsmtest(true);
                        setError(null);
                      }}
                      className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold"
                      style={{ color: "var(--hard-no-text)", border: "1px solid var(--border)" }}
                    >
                      <Trash size={14} aria-hidden="true" /> Verwijder
                    </button>
                  </div>
                )}

                {removeBdsmtest && (
                  <p className="mt-3 text-sm leading-5" style={{ color: "var(--text2)" }}>
                    De opgeslagen BDSMTest-link en resultaten worden verwijderd wanneer je opslaat.
                  </p>
                )}
              </section>
            </section>
          ) : step === 1 ? (
            <section data-testid="profile-edit-identity-step">
              <h3 className="text-2xl leading-tight" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 600 }}>
                Identiteit
              </h3>
              <p className="mt-1 text-sm leading-5" style={{ color: "var(--text2)" }}>
                Dit helpt om je profiel goed te begrijpen. Je antwoorden blijven privé.
              </p>

              <div className="mt-4 flex items-center gap-4">
                <div className="relative flex h-[5.5rem] w-[5.5rem] flex-none items-center justify-center overflow-hidden rounded-full" style={{ background: "var(--surface2)", border: "1px solid var(--border-accent)" }}>
                  {avatarDataUrl ? (
                    <img src={avatarDataUrl} alt="Nieuwe profielfoto" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl italic" style={avatarStyle(name || profile.name)}>{initial}</div>
                  )}
                  <span className="pointer-events-none absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <CameraPlus size={16} aria-hidden="true" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Profielfoto</p>
                  <p className="mt-0.5 text-sm" style={{ color: "var(--text2)" }}>Verander je profielfoto.</p>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="focus-ring mt-2 min-h-11 rounded-xl px-3 text-sm font-semibold" style={{ border: "1px solid var(--border)" }}>
                    Foto wijzigen
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="sr-only" aria-label="Nieuwe profielfoto kiezen" />
                </div>
              </div>

              <label htmlFor="profile-edit-name" className="mb-1.5 mt-5 block text-sm font-semibold">Naam of alias *</label>
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
                className="focus-ring min-h-12 w-full rounded-xl px-3.5 text-base focus:outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
              />

              <label htmlFor="profile-edit-perspective" className="mb-1.5 mt-4 block text-sm font-semibold">Hoofdperspectief *</label>
              <select
                id="profile-edit-perspective"
                value={perspective ?? ""}
                onChange={(event) => {
                  setPerspective(event.target.value as ProfilePerspective);
                  setError(null);
                }}
                className="ks-select focus-ring min-h-12 w-full rounded-xl px-3.5 text-base focus:outline-none"
                style={{ backgroundColor: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                <option value="" disabled>Kies perspectief</option>
                <option value="dominant" disabled={paired && perspective !== "dominant" && siblingPerspectives.has("dominant")}>Dominant</option>
                <option value="submissive" disabled={paired && perspective !== "submissive" && siblingPerspectives.has("submissive")}>Submissive</option>
              </select>

              {paired && (
                <div className="mt-4">
                  <p className="mb-1.5 text-sm font-semibold">Andere perspectieven</p>
                  <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--border)", background: "var(--surface2)" }}>
                    {siblings.map((sibling, index) => (
                      <div key={sibling.id} className="flex min-h-12 items-center gap-3 px-3" style={index > 0 ? { borderTop: "1px solid var(--border)" } : undefined}>
                        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-xs font-semibold" style={avatarStyle(sibling.name)}>{sibling.name.charAt(0).toUpperCase()}</span>
                        <span className="min-w-0 flex-1 truncate text-sm">{sibling.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <fieldset className="mt-4 border-0 p-0">
                <legend className="mb-1.5 text-sm font-semibold">Ervaring</legend>
                <div className="grid grid-cols-4 gap-1.5">
                  {EXPERIENCE_OPTIONS.map((option) => {
                    const active = experienceLevel === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setExperienceLevel(option.value)}
                        aria-pressed={active}
                        className="focus-ring min-h-11 rounded-xl px-1 text-xs font-semibold sm:text-sm"
                        style={active
                          ? { background: "var(--accent-fill)", color: "var(--on-accent-fill)", border: "1px solid var(--accent)" }
                          : { background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <label htmlFor="profile-edit-relationship" className="mb-1.5 mt-4 block text-sm font-semibold">Relatiestatus <span style={{ color: "var(--text2)" }}>(optioneel)</span></label>
              <select
                id="profile-edit-relationship"
                value={relationshipStatus}
                onChange={(event) => setRelationshipStatus(event.target.value)}
                className="ks-select focus-ring min-h-12 w-full rounded-xl px-3.5 text-base focus:outline-none"
                style={{ backgroundColor: "var(--surface2)", border: "1px solid var(--border)", color: relationshipStatus ? "var(--text)" : "var(--text2)" }}
              >
                <option value="">Niet tonen</option>
                {RELATIONSHIP_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>

              <button
                type="button"
                data-tour="profile-enrichment"
                onClick={() => {
                  setPanel("sources");
                  setError(null);
                }}
                className="focus-ring mt-5 flex min-h-[68px] w-full items-center gap-3 border-y px-1 py-3 text-left"
                style={{ borderColor: "var(--border)" }}
              >
                <LinkSimple size={22} weight="regular" aria-hidden="true" style={{ color: "var(--accent)" }} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">Gekoppelde bronnen</span>
                  <span className="mt-0.5 block text-sm" style={{ color: "var(--text2)" }}>{sourceSummary}</span>
                </span>
                <CaretRight size={17} aria-hidden="true" style={{ color: "var(--text2)" }} />
              </button>
            </section>
          ) : panel === "interests" ? (
            <section data-testid="profile-edit-interests-panel">
              <button type="button" onClick={() => setPanel(null)} className="focus-ring mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold" style={{ color: "var(--text2)" }}>
                <CaretLeft size={16} aria-hidden="true" /> Vragenlijst
              </button>
              <h3 className="text-xl font-semibold">Interessegebieden</h3>
              <p className="mt-1 text-sm leading-5" style={{ color: "var(--text2)" }}>Wat trekt je aan? Kies wat Dynamic als eerste mag meenemen.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {QUESTIONNAIRE_INTERESTS.map((interest) => {
                  const active = interests.includes(interest.value);
                  return (
                    <button
                      key={interest.value}
                      type="button"
                      onClick={() => toggleInterest(interest.value)}
                      aria-pressed={active}
                      className="focus-ring min-h-11 rounded-full px-3.5 text-sm font-semibold"
                      style={active
                        ? { background: "var(--accent-fill)", color: "var(--on-accent-fill)", border: "1px solid var(--accent)" }
                        : { color: "var(--text2)", border: "1px solid var(--border)" }}
                    >
                      {interest.label}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : panel === "flow" ? (
            <section data-testid="profile-edit-flow-panel">
              <button type="button" onClick={() => setPanel(null)} className="focus-ring mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold" style={{ color: "var(--text2)" }}>
                <CaretLeft size={16} aria-hidden="true" /> Vragenlijst
              </button>
              <h3 className="text-xl font-semibold">Verkenningsmodus</h3>
              <p className="mt-1 text-sm leading-5" style={{ color: "var(--text2)" }}>Hoe wil je door onbeantwoorde onderwerpen gaan?</p>
              <div className="mt-4 grid gap-2">
                {QUESTIONNAIRE_MODES.map((option) => {
                  const active = questionnaireMode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setQuestionnaireMode(option.value)}
                      aria-pressed={active}
                      className="focus-ring min-h-[70px] rounded-xl px-3.5 py-3 text-left"
                      style={active
                        ? { background: "color-mix(in srgb, var(--accent) 10%, var(--surface2))", border: "1px solid var(--accent)" }
                        : { background: "var(--surface2)", border: "1px solid var(--border)" }}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{option.label}</span>
                        {active && <Check size={15} weight="bold" aria-hidden="true" style={{ color: "var(--accent)" }} />}
                      </span>
                      <span className="mt-1 block text-sm leading-5" style={{ color: "var(--text2)" }}>{option.description}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : (
            <section data-testid="profile-edit-questionnaire-step">
              <h3 className="text-2xl leading-tight" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 600 }}>
                Vragenlijst
              </h3>
              <p className="mt-1 text-sm leading-5" style={{ color: "var(--text2)" }}>
                Deze onderdelen helpen je profiel verder in te vullen. Je kunt dit later altijd aanpassen.
              </p>

              <div className="mt-4 divide-y" style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
                <button type="button" onClick={() => setPanel("interests")} className="focus-ring flex min-h-[72px] w-full items-center gap-3 px-1 py-3 text-left">
                  <Heart size={25} weight="regular" aria-hidden="true" style={{ color: "var(--accent)" }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">Interessegebieden</span>
                    <span className="mt-0.5 block text-sm" style={{ color: "var(--text2)" }}>{interests.length > 0 ? `${interests.length} gekozen` : "Wat trekt je aan?"}</span>
                  </span>
                  <CaretRight size={17} aria-hidden="true" style={{ color: "var(--text2)" }} />
                </button>

                <button type="button" onClick={() => setPanel("flow")} className="focus-ring flex min-h-[72px] w-full items-center gap-3 px-1 py-3 text-left">
                  <ListChecks size={25} weight="regular" aria-hidden="true" style={{ color: "var(--accent)" }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">Verkenningsmodus</span>
                    <span className="mt-0.5 block text-sm" style={{ color: "var(--text2)" }}>{modeLabel}</span>
                  </span>
                  <CaretRight size={17} aria-hidden="true" style={{ color: "var(--text2)" }} />
                </button>
              </div>
            </section>
          )}
        </div>

        <footer
          className="flex-none px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3"
          data-testid="profile-edit-footer"
          style={{ borderTop: "1px solid var(--border)", background: "color-mix(in srgb, var(--surface) 96%, transparent)" }}
        >
          {error && <p className="mb-2 text-sm" role="alert" style={{ color: "var(--hard-no)" }}>{error}</p>}
          {step === 1 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!sourcesValid}
              className="focus-ring min-h-12 w-full rounded-full text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
            >
              Volgende <CaretRight size={15} className="ml-1 inline" aria-hidden="true" />
            </button>
          ) : (
            <div className="grid grid-cols-[0.82fr_1.18fr] gap-2">
              <button
                type="button"
                onClick={() => {
                  if (panel) setPanel(null);
                  else setStep(1);
                  setError(null);
                }}
                className="focus-ring min-h-12 rounded-full text-sm font-semibold"
                style={{ color: "var(--text)", border: "1px solid var(--border)" }}
              >
                <CaretLeft size={15} className="mr-1 inline" aria-hidden="true" /> Vorige
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!sourcesValid}
                className="focus-ring min-h-12 rounded-full text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
              >
                Opslaan
              </button>
            </div>
          )}
        </footer>
      </SheetContent>
    </Sheet>
  );
}
