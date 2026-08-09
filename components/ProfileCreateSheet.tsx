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
import Sheet, { SheetContent } from "@/components/Sheet";
import {
  QUESTIONNAIRE_INTERESTS,
  QUESTIONNAIRE_MODES,
} from "@/lib/questionnaire";
import {
  createPerspectiveProfiles,
  type ProfileDirectionChoice,
} from "@/lib/profilePerspectives";
import { profileHref, waitForPersistedProfile } from "@/lib/localRoutes";
import type {
  QuestionnaireInterest,
  QuestionnaireMode,
} from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Step = 0 | 1 | 2;

const DIRECTIONS: Array<{
  value: ProfileDirectionChoice;
  label: string;
  description: string;
  icon: typeof Crown;
}> = [
  {
    value: "dominant",
    label: "Dominant",
    description: "Dit profiel beschrijft mijn leidende of gevende kant.",
    icon: Crown,
  },
  {
    value: "submissive",
    label: "Submissive",
    description: "Dit profiel beschrijft mijn ontvangende of volgende kant.",
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
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const createInFlightRef = useRef(false);
  const [step, setStep] = useState<Step>(0);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [direction, setDirection] = useState<ProfileDirectionChoice | null>(null);
  const [interests, setInterests] = useState<QuestionnaireInterest[]>([]);
  const [mode, setMode] = useState<QuestionnaireMode>("dynamic");
  const [isCreating, setIsCreating] = useState(false);
  const [pendingProfileId, setPendingProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setName("");
    setNameError(null);
    setDirection(null);
    setInterests([]);
    setMode("dynamic");
    setIsCreating(false);
    setPendingProfileId(null);
    createInFlightRef.current = false;
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [step]);

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
    setNameError(null);
    setStep(1);
  }

  async function create() {
    if (!direction || createInFlightRef.current) return;
    createInFlightRef.current = true;
    setIsCreating(true);
    setNameError(null);
    try {
      let primaryId = pendingProfileId;
      if (!primaryId) {
        const created = createPerspectiveProfiles({
          name: name.trim(),
          direction,
          questionnaireSetup: {
            mode,
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
        window.location.assign(profileHref(primaryId));
        return;
      }

      setPendingProfileId(null);
      onClose();
      router.push(`/profile/${primaryId}`);
    } catch (error) {
      setPendingProfileId(null);
      setNameError(error instanceof Error ? error.message : "Profiel kon niet worden gemaakt.");
      setStep(0);
    } finally {
      createInFlightRef.current = false;
      setIsCreating(false);
    }
  }

  const title = step === 0
    ? "Wie ben je hier?"
    : step === 1
      ? "Wat wil je verkennen?"
      : "Kies je route";

  return (
    <Sheet open={open} onClose={onClose} scrollable aria-label="Nieuw profiel maken">
      <SheetContent
        showClose={false}
        className="max-h-[calc(100dvh-env(safe-area-inset-top))] overflow-hidden px-0 pb-0 pt-3"
      >
        <div className="px-5">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-none"
              style={{
                background: "color-mix(in srgb, var(--accent) 14%, var(--surface2))",
                color: "var(--accent)",
                border: "1px solid var(--border-accent)",
              }}
            >
              {step === 0
                ? <UserCirclePlus aria-hidden="true" size={22} weight="duotone" />
                : <Sparkle aria-hidden="true" size={22} weight="duotone" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--text2)" }}>
                Stap {step + 1} van 3
              </p>
              <h2
                className="text-2xl leading-tight"
                style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 600 }}
              >
                {title}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-5" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-1 rounded-full transition-colors"
                style={{ background: index <= step ? "var(--accent)" : "var(--surface3)" }}
              />
            ))}
          </div>
        </div>

        <div
          ref={scrollRef}
          className="overflow-y-auto overscroll-contain px-5 pb-5"
          style={{ maxHeight: "calc(100dvh - 210px)" }}
        >
          {step === 0 && (
            <div className="ks-fade-in">
              <label htmlFor={nameId} className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text2)" }}>
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
                  background: "var(--surface2)",
                  border: `1px solid ${nameError ? "var(--hard-no)" : "var(--border)"}`,
                  color: "var(--text)",
                }}
              />

              <fieldset className="border-0 p-0 m-0">
                <legend className="text-xs font-semibold mb-2" style={{ color: "var(--text2)" }}>
                  Kant van de dynamiek
                </legend>
                <div className="grid gap-2">
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
                        className="focus-ring w-full min-h-[78px] rounded-2xl px-3.5 py-3 flex items-center gap-3 text-left transition-colors"
                        style={active
                          ? {
                              background: "color-mix(in srgb, var(--accent) 11%, var(--surface2))",
                              border: "1px solid var(--accent)",
                            }
                          : { background: "var(--surface2)", border: "1px solid var(--border)" }}
                      >
                        <span
                          className="w-11 h-11 rounded-full flex items-center justify-center flex-none"
                          style={{
                            background: active ? "var(--accent)" : "var(--surface3)",
                            color: active ? "var(--on-accent)" : "var(--text2)",
                          }}
                        >
                          <Icon size={20} weight={active ? "fill" : "regular"} aria-hidden="true" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold">{label}</span>
                          <span className="block text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text2)" }}>
                            {description}
                          </span>
                        </span>
                        {active && <Check size={17} weight="bold" style={{ color: "var(--accent)" }} aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {direction === "both" && (
                <div
                  className="rounded-xl p-3 mt-3 text-xs leading-relaxed"
                  style={{
                    color: "var(--text2)",
                    background: "color-mix(in srgb, var(--accent) 7%, var(--surface2))",
                    border: "1px solid var(--border-accent)",
                  }}
                >
                  Je krijgt twee afzonderlijke vragenlijsten. Antwoorden van je dominante kant worden nooit naar je submissieve kant gekopieerd.
                </div>
              )}

              {nameError && (
                <p className="text-xs mt-3" role="alert" style={{ color: "var(--hard-no)" }}>
                  {nameError}
                </p>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="ks-fade-in">
              <p className="text-sm mb-4 leading-relaxed" style={{ color: "var(--text2)" }}>
                Kies wat nu relevant voelt. Dat geeft die gebieden eerder dekking; je antwoorden worden nooit voorspeld of ingevuld.
              </p>
              <div className="grid gap-2">
                {QUESTIONNAIRE_INTERESTS.map((interest) => {
                  const active = interests.includes(interest.value);
                  return (
                    <button
                      key={interest.value}
                      type="button"
                      onClick={() => toggleInterest(interest.value)}
                      aria-pressed={active}
                      className="focus-ring min-h-[66px] rounded-2xl px-3.5 py-3 flex items-center gap-3 text-left"
                      style={active
                        ? {
                            background: "color-mix(in srgb, var(--accent) 10%, var(--surface2))",
                            border: "1px solid var(--accent)",
                          }
                        : { background: "var(--surface2)", border: "1px solid var(--border)" }}
                    >
                      <span
                        aria-hidden="true"
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-none"
                        style={{
                          background: active ? "var(--accent)" : "var(--surface3)",
                          color: active ? "var(--on-accent)" : "transparent",
                          border: active ? "none" : "1px solid var(--border)",
                        }}
                      >
                        <Check aria-hidden="true" size={13} weight="bold" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{interest.label}</span>
                        <span className="block text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text2)" }}>
                          {interest.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs mt-3" style={{ color: "var(--text2)" }}>
                Niets gekozen? Dan krijg je een brede, neutrale startselectie.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="ks-fade-in">
              <p className="text-sm mb-4 leading-relaxed" style={{ color: "var(--text2)" }}>
                Je kunt dit later aanpassen zonder bestaande antwoorden te verliezen.
              </p>
              <div className="grid gap-2">
                {QUESTIONNAIRE_MODES.map((option) => {
                  const active = mode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setMode(option.value)}
                      aria-pressed={active}
                      className="focus-ring min-h-[76px] rounded-2xl px-3.5 py-3 flex items-center gap-3 text-left"
                      style={active
                        ? {
                            background: "color-mix(in srgb, var(--accent) 11%, var(--surface2))",
                            border: "1px solid var(--accent)",
                          }
                        : { background: "var(--surface2)", border: "1px solid var(--border)" }}
                    >
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">{option.label}</span>
                          {active && <Check size={16} weight="bold" style={{ color: "var(--accent)" }} aria-hidden="true" />}
                        </span>
                        <span className="block text-xs mt-1 leading-relaxed" style={{ color: "var(--text2)" }}>
                          {option.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div
                className="rounded-2xl p-4 mt-4"
                style={{ background: "var(--surface2)", border: "1px solid var(--border-accent)" }}
              >
                <p className="text-xs uppercase tracking-[0.16em] mb-1" style={{ color: "var(--text2)" }}>
                  Jouw start
                </p>
                <p className="text-lg font-semibold">{name.trim()}</p>
                <p className="text-sm mt-0.5" style={{ color: "var(--accent)" }}>
                  {direction === "both" ? "Dominant + Submissive" : direction === "dominant" ? "Dominant" : "Submissive"}
                </p>
                <p className="text-xs mt-2" style={{ color: "var(--text2)" }}>
                  {mode === "dynamic"
                    ? "Dynamic stopt bij brede, expliciete dekking en vlecht echte vervolgvragen later terug in de flow."
                    : "Deep Dive blijft doorvragen tot de volledige catalogus expliciet is beoordeeld."}
                </p>
                {direction === "both" && (
                  <p className="text-xs mt-1" style={{ color: "var(--text2)" }}>
                    Beide profielen starten met dezelfde selectie, maar worden los van elkaar ingevuld.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div
          className="grid grid-cols-[auto_1fr] gap-2 px-5 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}
        >
          <button
            type="button"
            onClick={step === 0 ? onClose : () => setStep((current) => (current - 1) as Step)}
            disabled={isCreating}
            className="focus-ring min-h-12 rounded-xl px-4 flex items-center justify-center gap-2 text-sm font-semibold"
            style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}
          >
            {step === 0 ? "Annuleer" : <><ArrowLeft size={16} aria-hidden="true" /> Terug</>}
          </button>
          <button
            type="button"
            onClick={step === 0 ? continueFromIdentity : step === 1 ? () => setStep(2) : create}
            disabled={isCreating}
            className="focus-ring min-h-12 rounded-xl px-4 flex items-center justify-center gap-2 text-sm font-bold"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            {step === 2
              ? (isCreating ? "Profiel opslaan…" : pendingProfileId ? "Opslaan opnieuw" : "Profiel maken")
              : "Verder"}
            {step < 2 && <ArrowRight size={16} weight="bold" aria-hidden="true" />}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
