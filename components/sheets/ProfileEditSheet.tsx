"use client";

import { useEffect, useRef, useState } from "react";
import {
  CameraPlus,
  CaretLeft,
  CaretRight,
  Check,
  Crown,
  Heart,
  ListChecks,
  Lock,
  X,
} from "@phosphor-icons/react";
import Sheet, { SheetContent } from "@/components/Sheet";
import { useStore } from "@/lib/store";
import { resizeImage } from "@/lib/imageUtils";
import { avatarStyle } from "@/lib/avatar";
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

type Step = 1 | 2;
type QuestionnairePanel = "interests" | "flow" | "privacy" | null;

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
  const [questionnaireMode, setQuestionnaireMode] = useState<QuestionnaireMode>("dynamic");
  const [interests, setInterests] = useState<QuestionnaireInterest[]>([]);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const setup = profile.questionnaireSetup;
    setStep(1);
    setPanel(null);
    setName(profile.name);
    setPerspective(inferredPerspective(profile));
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
        relationshipStatus: profile.relationshipStatus,
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
    <Sheet open={open} onClose={onClose} scrollable aria-label="Profiel bewerken">
      <SheetContent
        showClose={false}
        className="flex flex-col overflow-hidden px-0 pb-0 pt-0"
        style={{
          maxHeight: "calc(var(--visual-viewport-height, 100dvh) - env(safe-area-inset-top))",
          backgroundImage: "radial-gradient(ellipse 92% 25rem at 50% 0%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 74%)",
          backgroundRepeat: "no-repeat",
        }}
      >
        <header
          className="flex-none px-5 pb-3 pt-4"
          data-testid="profile-edit-header"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-semibold leading-tight">Profiel bewerken</h2>
              <p className="mt-1 text-sm leading-5" style={{ color: "var(--text2)" }}>
                Werk je profiel bij. Je antwoorden blijven privé.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Profiel bewerken sluiten"
              className="focus-ring flex h-11 w-11 flex-none items-center justify-center rounded-full"
              style={{ color: "var(--text2)" }}
            >
              <X aria-hidden="true" size={21} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3" aria-label="Stappen">
            <button
              type="button"
              onClick={() => { setStep(1); setPanel(null); setError(null); }}
              className="focus-ring flex min-h-11 items-center gap-2 text-left"
              aria-current={step === 1 ? "step" : undefined}
            >
              <span
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-semibold"
                style={step === 1
                  ? { background: "var(--accent-fill)", color: "var(--on-accent-fill)" }
                  : { background: "var(--accent2)", color: "var(--bg)" }}
              >
                {step === 1 ? "1" : <Check size={16} weight="bold" aria-hidden="true" />}
              </span>
              <span className="text-sm font-semibold" style={{ color: step === 1 ? "var(--text)" : "var(--accent2)" }}>
                Identiteit
              </span>
            </button>
            <span className="h-px w-10" style={{ background: "var(--border)" }} aria-hidden="true" />
            <button
              type="button"
              onClick={goNext}
              className="focus-ring flex min-h-11 items-center justify-end gap-2 text-right"
              aria-current={step === 2 ? "step" : undefined}
            >
              <span
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-semibold"
                style={step === 2
                  ? { background: "var(--accent-fill)", color: "var(--on-accent-fill)" }
                  : { border: "1px solid var(--border-accent)", color: "var(--text2)" }}
              >
                2
              </span>
              <span className="text-sm font-semibold" style={{ color: step === 2 ? "var(--text)" : "var(--text2)" }}>
                Vragenlijst
              </span>
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-5" data-testid="profile-edit-scroll-body">
          {step === 1 ? (
            <section data-testid="profile-edit-identity-step">
              <div className="mb-5">
                <h3 className="text-lg font-semibold">Jij in dit profiel</h3>
                <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>Dit is hoe je hier getoond wordt.</p>
              </div>

              <div className="mb-5 flex items-center gap-4">
                <div
                  className="relative flex h-20 w-20 flex-none items-center justify-center overflow-hidden rounded-full"
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
                  <p className="text-sm font-semibold">Foto</p>
                  <p className="mt-0.5 text-sm" style={{ color: "var(--text2)" }}>Verander je profielfoto.</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="focus-ring mt-2 min-h-11 rounded-full px-4 text-sm font-semibold"
                    style={{ border: "1px solid var(--border)", color: "var(--text)" }}
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

              <label htmlFor="profile-edit-name" className="mb-1.5 block text-sm font-semibold">Naam of alias</label>
              <input
                id="profile-edit-name"
                value={name}
                onChange={(event) => { setName(event.target.value); setError(null); }}
                placeholder="Naam of alias"
                autoComplete="off"
                spellCheck={false}
                className="focus-ring min-h-12 w-full rounded-xl px-3.5 text-base focus:outline-none"
                style={{ background: "color-mix(in srgb, var(--surface2) 72%, transparent)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
              <p className="mt-1.5 text-sm" style={{ color: "var(--text2)" }}>Dit is de naam die in de app getoond wordt.</p>

              <fieldset className="mt-5 border-0 p-0">
                <legend className="mb-2 text-sm font-semibold">Jouw richting</legend>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: "dominant" as const, label: "Dominant", icon: Crown },
                    { value: "submissive" as const, label: "Submissive", icon: Heart },
                  ]).map(({ value, label, icon: Icon }) => {
                    const active = perspective === value;
                    const unavailable = paired && !active && siblingPerspectives.has(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => { if (!unavailable) setPerspective(value); setError(null); }}
                        aria-pressed={active}
                        disabled={unavailable}
                        className="focus-ring flex min-h-[58px] items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold disabled:opacity-45"
                        style={active
                          ? { background: "var(--accent-fill)", color: "var(--on-accent-fill)", border: "1px solid var(--accent)" }
                          : { border: "1px solid var(--border)", color: "var(--text)" }}
                      >
                        <Icon size={18} weight="regular" aria-hidden="true" />
                        {label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
                  {paired ? "Gekoppelde perspectieven behouden ieder hun eigen richting." : "Je kunt dit later altijd aanpassen."}
                </p>
                {profile.legacyRole && (
                  <p className="mt-1 text-xs" style={{ color: "var(--accent)" }}>Eerdere rol: {profile.legacyRole}</p>
                )}
              </fieldset>

              {paired && (
                <section className="mt-6 border-t pt-4" style={{ borderColor: "var(--border)" }}>
                  <h3 className="text-sm font-semibold">Gekoppelde perspectieven</h3>
                  <p className="mt-1 text-sm leading-5" style={{ color: "var(--text2)" }}>
                    Dit profiel is gekoppeld aan andere perspectieven. Deze koppeling kan hier niet gewijzigd worden.
                  </p>
                  <div className="mt-3 overflow-hidden rounded-xl" style={{ border: "1px solid var(--border)", background: "color-mix(in srgb, var(--surface2) 54%, transparent)" }}>
                    {siblings.map((sibling, index) => (
                      <div
                        key={sibling.id}
                        className="flex min-h-[62px] items-center gap-3 px-3"
                        style={index > 0 ? { borderTop: "1px solid var(--border)" } : undefined}
                      >
                        <span
                          className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-semibold"
                          style={avatarStyle(sibling.name)}
                        >
                          {sibling.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{sibling.name}</p>
                          <p className="truncate text-xs" style={{ color: "var(--text2)" }}>
                            {sibling.role} · Kan niet gewijzigd worden
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </section>
          ) : panel === "interests" ? (
            <section data-testid="profile-edit-interests-panel">
              <button
                type="button"
                onClick={() => setPanel(null)}
                className="focus-ring mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold"
                style={{ color: "var(--text2)" }}
              >
                <CaretLeft size={16} aria-hidden="true" /> Vragenlijst
              </button>
              <h3 className="text-xl font-semibold">Interessegebieden</h3>
              <p className="mt-1 text-sm leading-5" style={{ color: "var(--text2)" }}>
                Kies wat Dynamic als eerste mag meenemen. Je bestaande antwoorden veranderen niet.
              </p>
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
              <button
                type="button"
                onClick={() => setPanel(null)}
                className="focus-ring mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold"
                style={{ color: "var(--text2)" }}
              >
                <CaretLeft size={16} aria-hidden="true" /> Vragenlijst
              </button>
              <h3 className="text-xl font-semibold">Ervaring &amp; flow</h3>
              <p className="mt-1 text-sm leading-5" style={{ color: "var(--text2)" }}>
                Kies hoe de vragenlijst je door onbeantwoorde onderwerpen leidt.
              </p>
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
                        : { background: "color-mix(in srgb, var(--surface2) 50%, transparent)", border: "1px solid var(--border)" }}
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
          ) : panel === "privacy" ? (
            <section data-testid="profile-edit-privacy-panel">
              <button
                type="button"
                onClick={() => setPanel(null)}
                className="focus-ring mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold"
                style={{ color: "var(--text2)" }}
              >
                <CaretLeft size={16} aria-hidden="true" /> Vragenlijst
              </button>
              <h3 className="text-xl font-semibold">Privacy &amp; grenzen</h3>
              <p className="mt-1 text-sm leading-6" style={{ color: "var(--text2)" }}>
                Privé antwoorden en grenzen stel je per onderwerp in. Deze editor verandert die keuzes niet en bewaart je bestaande antwoorden.
              </p>
              <div className="mt-5 border-y py-4" style={{ borderColor: "var(--border)" }}>
                <p className="text-sm font-semibold">Per onderwerp, bewust gekozen</p>
                <p className="mt-1 text-sm leading-5" style={{ color: "var(--text2)" }}>
                  Open een onderwerp op je profiel om de status, context en privacy van dat antwoord te beheren.
                </p>
              </div>
            </section>
          ) : (
            <section data-testid="profile-edit-questionnaire-step">
              <div className="mb-5">
                <h3 className="text-xl font-semibold">Wat wil je verkennen?</h3>
                <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>Beheer je kink-interesses, ervaring en voorkeuren.</p>
              </div>

              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => setPanel("interests")}
                  className="focus-ring flex min-h-[76px] items-center gap-3 rounded-xl px-3.5 text-left"
                  style={{ background: "color-mix(in srgb, var(--surface2) 52%, transparent)", border: "1px solid var(--border)" }}
                >
                  <Heart size={28} weight="regular" aria-hidden="true" style={{ color: "var(--accent)" }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">Interessegebieden</span>
                    <span className="mt-0.5 block truncate text-sm" style={{ color: "var(--text2)" }}>
                      {interests.length} gekozen
                    </span>
                  </span>
                  <CaretRight size={17} aria-hidden="true" style={{ color: "var(--text2)" }} />
                </button>

                <button
                  type="button"
                  onClick={() => setPanel("flow")}
                  className="focus-ring flex min-h-[76px] items-center gap-3 rounded-xl px-3.5 text-left"
                  style={{ background: "color-mix(in srgb, var(--surface2) 52%, transparent)", border: "1px solid var(--border)" }}
                >
                  <ListChecks size={28} weight="regular" aria-hidden="true" style={{ color: "var(--accent)" }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">Ervaring</span>
                    <span className="mt-0.5 block truncate text-sm" style={{ color: "var(--text2)" }}>
                      {profile.experienceLevel} · {modeLabel}
                    </span>
                  </span>
                  <CaretRight size={17} aria-hidden="true" style={{ color: "var(--text2)" }} />
                </button>

                <button
                  type="button"
                  onClick={() => setPanel("privacy")}
                  className="focus-ring flex min-h-[76px] items-center gap-3 rounded-xl px-3.5 text-left"
                  style={{ background: "color-mix(in srgb, var(--surface2) 52%, transparent)", border: "1px solid var(--border)" }}
                >
                  <Lock size={28} weight="regular" aria-hidden="true" style={{ color: "var(--accent)" }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">Privacy &amp; grenzen</span>
                    <span className="mt-0.5 block truncate text-sm" style={{ color: "var(--text2)" }}>
                      Per onderwerp, zonder bestaande antwoorden te wijzigen
                    </span>
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
          style={{ background: "color-mix(in srgb, var(--surface) 94%, transparent)", borderTop: "1px solid var(--border)" }}
        >
          {error && <p className="mb-2 text-sm" role="alert" style={{ color: "var(--hard-no)" }}>{error}</p>}

          {step === 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="focus-ring min-h-12 w-full rounded-full text-sm font-semibold"
              style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
            >
              Volgende <CaretRight size={15} className="ml-1 inline" aria-hidden="true" />
            </button>
          ) : (
            <div className="grid grid-cols-[0.82fr_1.18fr] gap-2">
              <button
                type="button"
                onClick={() => { if (panel) setPanel(null); else setStep(1); setError(null); }}
                className="focus-ring min-h-12 rounded-full text-sm font-semibold"
                style={{ color: "var(--text)", border: "1px solid var(--border)" }}
              >
                <CaretLeft size={15} className="mr-1 inline" aria-hidden="true" /> Vorige
              </button>
              <button
                type="button"
                onClick={save}
                className="focus-ring min-h-12 rounded-full text-sm font-semibold"
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
