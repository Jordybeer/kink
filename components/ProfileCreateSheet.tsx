"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowsLeftRight,
  Check,
  Crown,
  Heart,
  Sparkle,
  UserCirclePlus,
} from "@phosphor-icons/react";
import Sheet from "@/components/Sheet";
import { QUESTIONNAIRE_INTERESTS } from "@/lib/questionnaire";
import {
  createPerspectiveProfiles,
  type ProfileDirectionChoice,
} from "@/lib/profilePerspectives";
import { waitForPersistedProfile } from "@/lib/localRoutes";
import { EXPERIENCE_LEVELS } from "@/lib/roles";
import type { ExperienceLevel, QuestionnaireInterest } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Step = 0 | 1;

const DIRECTIONS: Array<{
  value: ProfileDirectionChoice;
  label: string;
  description: string;
  icon: typeof Crown;
}> = [
  {
    value: "dominant",
    label: "Dominant",
    description: "Antwoord vanuit mijn dominante dynamiek.",
    icon: Crown,
  },
  {
    value: "submissive",
    label: "Submissive",
    description: "Antwoord vanuit mijn submissieve dynamiek.",
    icon: Heart,
  },
  {
    value: "both",
    label: "Beide kanten",
    description: "Maak twee losse profielen: Dominant en Submissive.",
    icon: ArrowsLeftRight,
  },
];

export default function ProfileCreateSheet({ open, onClose }: Props) {
  const router = useRouter();
  const nameId = useId();
  const experienceId = useId();
  const experienceHintId = useId();
  const createInFlightRef = useRef(false);
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>(0);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [direction, setDirection] = useState<ProfileDirectionChoice | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(null);
  const [interests, setInterests] = useState<QuestionnaireInterest[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingProfileId, setPendingProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setName("");
    setNameError(null);
    setDirection(null);
    setExperienceLevel(null);
    setInterests([]);
    setIsCreating(false);
    setPendingProfileId(null);
    createInFlightRef.current = false;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    scrollBodyRef.current?.scrollTo({ top: 0 });
  }, [step, open]);

  function toggleInterest(interest: QuestionnaireInterest) {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((candidate) => candidate !== interest)
        : [...current, interest],
    );
  }

  function continueFromIdentity() {
    if (!name.trim()) {
      setNameError("Vul een naam of alias in.");
      return;
    }
    if (!direction) {
      setNameError("Kies Dominant, Submissive of Beide kanten.");
      return;
    }
    if (!experienceLevel) {
      setNameError("Kies je ervaringsniveau.");
      return;
    }
    setNameError(null);
    setStep(1);
  }

  async function create() {
    if (!direction || !experienceLevel || createInFlightRef.current) return;
    createInFlightRef.current = true;
    setIsCreating(true);
    setNameError(null);
    try {
      let primaryId = pendingProfileId;
      if (!primaryId) {
        const created = createPerspectiveProfiles({
          name: name.trim(),
          direction,
          experienceLevel,
          questionnaireSetup: {
            mode: "dynamic",
            interests,
            version: 2,
          },
        });
        primaryId = created.primaryId;
        setPendingProfileId(primaryId);
      }

      if (!navigator.onLine) {
        const persisted = await waitForPersistedProfile(primaryId);
        if (!persisted) {
          setNameError("Profiel is aangemaakt, maar lokale opslag is nog niet klaar. Blijf op deze pagina en probeer opslaan opnieuw.");
          return;
        }
        setPendingProfileId(null);
        onClose();
        window.location.assign(`/profile/${encodeURIComponent(primaryId)}/questions`);
        return;
      }

      setPendingProfileId(null);
      onClose();
      router.push(`/profile/${encodeURIComponent(primaryId)}/questions`);
    } catch (error) {
      setPendingProfileId(null);
      setNameError(error instanceof Error ? error.message : "Profiel kon niet worden gemaakt.");
      setStep(0);
    } finally {
      createInFlightRef.current = false;
      setIsCreating(false);
    }
  }

  const title = step === 0 ? "Wie ben je hier?" : "Wat wil je verkennen?";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      eyebrow={`Jouw perspectief / 0${step + 1} van 02`}
      subtitle="Jij bepaalt vanuit welke kant je vertelt."
      headerIcon={step === 0 ? <UserCirclePlus size={20} weight="duotone" aria-hidden="true" /> : <Sparkle size={20} weight="duotone" aria-hidden="true" />}
      variant="surface"
      scrollable
      scrollBodyRef={scrollBodyRef}
      aria-label="Nieuw profiel maken"
      footer={
        <div
          className="grid grid-cols-[auto_minmax(0,1fr)] gap-2"
        >
          <button
            type="button"
            onClick={step === 0 ? onClose : () => setStep(0)}
            disabled={isCreating}
            className="ks-motion-choice focus-ring min-h-12 rounded-xl px-4 flex items-center justify-center gap-2 text-sm font-semibold"
            style={{ background: "var(--profile-form-control-surface)", color: "var(--text2)", border: "1px solid var(--control-border)" }}
          >
            {step === 0 ? "Annuleer" : <><ArrowLeft size={16} aria-hidden="true" /> Terug</>}
          </button>
          <button
            type="button"
            onClick={step === 0 ? continueFromIdentity : create}
            disabled={isCreating}
            className="ks-modal-primary ks-motion-choice focus-ring min-h-12 rounded-xl px-4 flex items-center justify-center gap-2 text-sm font-semibold"
            style={{ color: "var(--on-accent-fill)" }}
          >
            {step === 1
              ? (isCreating ? "Profiel opslaan…" : pendingProfileId ? "Opslaan opnieuw" : "Start vragen")
              : "Verder"}
            {step === 0 && <ArrowRight size={16} weight="bold" aria-hidden="true" />}
          </button>
        </div>
      }
    >
        <div className="mb-5">
          <p className="mb-3 text-xs font-semibold" style={{ color: "var(--text2)" }}>Stap {step + 1} van 2</p>
          <div className="grid grid-cols-2 gap-2" role="progressbar" aria-label="Voortgang profielaanmaak"
            aria-valuemin={0} aria-valuemax={2} aria-valuenow={step + 1}>
            {[0, 1].map((index) => (
              <span key={index} aria-hidden="true"
                className="ks-motion-state h-1 rounded-full"
                style={{ background: index <= step ? "var(--accent)" : "var(--surface3)" }}
              />
            ))}
          </div>
        </div>

        <div className="pb-3">
          {step === 0 && (
            <div className="ks-fade-in">
              <label htmlFor={nameId} className="block text-sm font-semibold mb-1.5" style={{ color: "var(--text2)" }}>
                Naam of alias
              </label>
              <input
                id={nameId}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setNameError(null);
                }}
                placeholder="Bijvoorbeeld Nova"
                autoComplete="off"
                autoCapitalize="words"
                className="focus-ring w-full min-h-12 rounded-xl px-3.5 text-base mb-5 focus:outline-none placeholder-[color:var(--text2)]"
                style={{
                  background: "var(--profile-form-control-surface)",
                  border: `1px solid ${nameError ? "var(--hard-no)" : "var(--control-border)"}`,
                  color: "var(--text)",
                }}
              />

              <fieldset className="border-0 p-0 m-0">
                <legend className="text-sm font-semibold mb-2" style={{ color: "var(--text2)" }}>
                  Kant van de dynamiek
                </legend>
                <div className="ks-modal-role-group">
                  {DIRECTIONS.map(({ value, label, description, icon: Icon }) => {
                    const active = direction === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setDirection(value);
                          setNameError(null);
                        }}
                        aria-pressed={active}
                        data-selected={active}
                        className="ks-modal-role ks-motion-choice ks-motion-state focus-ring w-full min-h-[68px] px-3 py-2.5 flex items-center gap-3 text-left"

                      >
                        <span
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-none"
                          style={{
                            background: active ? "var(--accent)" : "var(--profile-form-muted-surface)",
                            color: active ? "var(--on-accent)" : "var(--text2)",
                          }}
                        >
                          <Icon size={20} weight={active ? "fill" : "regular"} aria-hidden="true" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold">{label}</span>
                          <span className="block text-sm mt-0.5 leading-relaxed" style={{ color: "var(--text2)" }}>
                            {description}
                          </span>
                        </span>
                        {active && <Check size={17} weight="bold" style={{ color: "var(--accent)" }} aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <label htmlFor={experienceId} className="block text-sm font-semibold mt-5 mb-1.5" style={{ color: "var(--text2)" }}>
                Ervaringsniveau
              </label>
              <select
                id={experienceId}
                value={experienceLevel ?? ""}
                onChange={(event) => {
                  setExperienceLevel(event.target.value as ExperienceLevel);
                  setNameError(null);
                }}
                aria-describedby={experienceHintId}
                className="ks-select focus-ring w-full min-h-12 rounded-xl px-3.5 text-base focus:outline-none"
                style={{ backgroundColor: "var(--profile-form-control-surface)", border: "1px solid var(--control-border)", color: experienceLevel ? "var(--text)" : "var(--text2)" }}
              >
                <option value="" disabled>Kies je ervaringsniveau</option>
                {EXPERIENCE_LEVELS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <p id={experienceHintId} className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
                Je eigen inschatting van je ervaring met kink. Dit bepaalt niet welke vragen je krijgt.
              </p>

              {direction === "both" && (
                <div
                  className="rounded-xl p-3 mt-3 text-sm leading-relaxed"
                  style={{
                    color: "var(--text2)",
                    background: "color-mix(in srgb, var(--accent) 7%, var(--profile-form-control-surface))",
                    border: "1px solid var(--border-accent)",
                  }}
                >
                  Je krijgt twee afzonderlijke vragenlijsten. Antwoorden van je dominante kant worden nooit naar je submissieve kant gekopieerd.
                </div>
              )}

              {nameError && (
                <p className="text-sm mt-3" role="alert" style={{ color: "var(--hard-no)" }}>
                  {nameError}
                </p>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="ks-fade-in">
              <p className="text-sm mb-4 leading-relaxed" style={{ color: "var(--text2)" }}>
                Kies wat nu relevant voelt. Die onderwerpen verschijnen eerder. Je antwoorden worden nooit voorspeld of ingevuld.
              </p>
              <div className="ks-modal-role-group">
                {QUESTIONNAIRE_INTERESTS.map((interest) => {
                  const active = interests.includes(interest.value);
                  return (
                    <button
                      key={interest.value}
                      type="button"
                      onClick={() => toggleInterest(interest.value)}
                      aria-pressed={active}
                      data-selected={active}
                      className="ks-modal-role ks-motion-choice ks-motion-state focus-ring min-h-[62px] w-full px-3 py-2.5 flex items-center gap-3 text-left"

                    >
                      <span
                        aria-hidden="true"
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-none"
                        style={{
                          background: active ? "var(--accent)" : "var(--profile-form-muted-surface)",
                          color: active ? "var(--on-accent)" : "transparent",
                          border: active ? "none" : "1px solid var(--control-border)",
                        }}
                      >
                        <Check aria-hidden="true" size={13} weight="bold" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{interest.label}</span>
                        <span className="block text-sm mt-0.5 leading-relaxed" style={{ color: "var(--text2)" }}>
                          {interest.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-sm mt-3" style={{ color: "var(--text2)" }}>
                Niets gekozen? Dan krijg je een brede, neutrale startselectie.
              </p>
            </div>
          )}
        </div>
    </Sheet>
  );
}
