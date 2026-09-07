"use client";

import { useEffect, useRef, useState } from "react";
import {
  CameraPlus,
  CaretLeft,
  CaretRight,
  Check,
  Heart,
  ListChecks,
} from "@phosphor-icons/react";
import Sheet, { SheetContent } from "@/components/Sheet";
import { avatarStyle } from "@/lib/avatar";
import { resizeImage } from "@/lib/imageUtils";
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
type QuestionnairePanel = "interests" | "flow" | null;

const EXPERIENCE_OPTIONS: Array<{ value: ExperienceLevel; label: string }> = [
  { value: "beginner", label: "Beginner" },
  { value: "gevorderd", label: "Gevorderd" },
  { value: "ervaren", label: "Ervaren" },
  { value: "diepgaand", label: "Diepgaand" },
];

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
  const [panel, setPanel] = useState<QuestionnairePanel>(null);
  const [name, setName] = useState("");
  const [perspective, setPerspective] = useState<ProfilePerspective | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("beginner");
  const [relationshipStatus, setRelationshipStatus] = useState("");
  const [questionnaireMode, setQuestionnaireMode] = useState<QuestionnaireMode>("dynamic");
  const [interests, setInterests] = useState<QuestionnaireInterest[]>([]);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>();
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

  function goNext() {
    if (!validateIdentity()) return;
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

    try {
      updateProfileIdentity(profile.id, {
        name: name.trim(),
        relationshipStatus: relationshipStatus || undefined,
        fetLifeUsername: profile.fetLifeUsername,
        bdsmtestUrl: profile.bdsmtestUrl,
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
        profiles: state.profiles.map((candidate) =>
          candidate.id === profile.id
            ? { ...candidate, experienceLevel, updatedAt: Date.now() }
            : candidate,
        ),
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

  return (
    <Sheet open={open} onClose={onClose} scrollable variant="surface" aria-label="Profiel bewerken">
      <SheetContent
        showClose={false}
        showHandle={false}
        className="flex h-[calc(var(--visual-viewport-height,100dvh)-env(safe-area-inset-top)-var(--sheet-edge-clearance))] flex-col overflow-hidden rounded-t-[24px] px-0 pb-0 pt-0 sm:h-auto sm:min-h-[42rem] sm:max-h-[min(48rem,calc(100dvh-3rem))] sm:rounded-[24px]"
        style={{
          backgroundImage: "radial-gradient(ellipse 88% 24rem at 50% 0%, color-mix(in srgb, var(--accent) 9%, transparent), transparent 76%)",
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
              className="focus-ring justify-self-end min-h-11 px-1 text-sm font-medium"
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
          {step === 1 ? (
            <section data-testid="profile-edit-identity-step">
              <h3
                className="text-2xl leading-tight"
                style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 600 }}
              >
                Identiteit
              </h3>
              <p className="mt-1 text-sm leading-5" style={{ color: "var(--text2)" }}>
                Dit helpt om je profiel goed te begrijpen. Je antwoorden blijven privé.
              </p>

              <div className="mt-4 flex items-center gap-4">
                <div
                  className="relative flex h-[5.5rem] w-[5.5rem] flex-none items-center justify-center overflow-hidden rounded-full"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border-accent)" }}
                >
                  {avatarDataUrl ? (
                    <img src={avatarDataUrl} alt="Nieuwe profielfoto" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl italic" style={avatarStyle(name || profile.name)}>
                      {initial}
                    </div>
                  )}
                  <span
                    className="pointer-events-none absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                  >
                    <CameraPlus size={16} aria-hidden="true" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Profielfoto</p>
                  <p className="mt-0.5 text-sm" style={{ color: "var(--text2)" }}>Verander je profielfoto.</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="focus-ring mt-2 min-h-11 rounded-xl px-3 text-sm font-semibold"
                    style={{ border: "1px solid var(--border)" }}
                  >
                    Foto wijzigen
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="sr-only"
                    aria-label="Nieuwe profielfoto kiezen"
                  />
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
                      <div
                        key={sibling.id}
                        className="flex min-h-12 items-center gap-3 px-3"
                        style={index > 0 ? { borderTop: "1px solid var(--border)" } : undefined}
                      >
                        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-xs font-semibold" style={avatarStyle(sibling.name)}>
                          {sibling.name.charAt(0).toUpperCase()}
                        </span>
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

              <label htmlFor="profile-edit-mode" className="mb-1.5 mt-4 block text-sm font-semibold">Verkenningsmodus</label>
              <select
                id="profile-edit-mode"
                value={questionnaireMode}
                onChange={(event) => setQuestionnaireMode(event.target.value as QuestionnaireMode)}
                className="ks-select focus-ring min-h-12 w-full rounded-xl px-3.5 text-base focus:outline-none"
                style={{ backgroundColor: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                {QUESTIONNAIRE_MODES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
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
              <h3 className="text-xl font-semibold">Ervaring &amp; flow</h3>
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
              <h3
                className="text-2xl leading-tight"
                style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 600 }}
              >
                Vragenlijst
              </h3>
              <p className="mt-1 text-sm leading-5" style={{ color: "var(--text2)" }}>
                Deze onderdelen helpen je profiel verder in te vullen. Je kunt dit later altijd aanpassen.
              </p>

              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={() => setPanel("interests")}
                  className="focus-ring flex min-h-[76px] items-center gap-3 rounded-xl px-3.5 text-left"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                >
                  <Heart size={27} weight="regular" aria-hidden="true" style={{ color: "var(--accent)" }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">Interessegebieden</span>
                    <span className="mt-0.5 block text-sm" style={{ color: "var(--text2)" }}>{interests.length > 0 ? `${interests.length} gekozen` : "Wat trekt je aan?"}</span>
                  </span>
                  <CaretRight size={17} aria-hidden="true" style={{ color: "var(--text2)" }} />
                </button>

                <button
                  type="button"
                  onClick={() => setPanel("flow")}
                  className="focus-ring flex min-h-[76px] items-center gap-3 rounded-xl px-3.5 text-left"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                >
                  <ListChecks size={27} weight="regular" aria-hidden="true" style={{ color: "var(--accent)" }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">Ervaring</span>
                    <span className="mt-0.5 block text-sm" style={{ color: "var(--text2)" }}>{experienceLevel} · {modeLabel}</span>
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
            <button type="button" onClick={goNext} className="focus-ring min-h-12 w-full rounded-full text-sm font-semibold" style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}>
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
              <button type="button" onClick={save} className="focus-ring min-h-12 rounded-full text-sm font-semibold" style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}>
                Opslaan
              </button>
            </div>
          )}
        </footer>
      </SheetContent>
    </Sheet>
  );
}