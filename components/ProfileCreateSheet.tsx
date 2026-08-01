"use client";

import { useEffect, useId, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkle,
  UserCirclePlus,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import Sheet, { SheetContent } from "@/components/Sheet";
import RolePicker from "@/components/RolePicker";
import { EXPERIENCE_LEVELS, RELATIONSHIP_STATUSES } from "@/lib/roles";
import type { ExperienceLevel } from "@/types";

export interface ProfileCreateInput {
  name: string;
  role: string;
  experienceLevel: ExperienceLevel;
  relationshipStatus?: string;
  parentName: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  parentCandidates: string[];
  onCreate: (input: ProfileCreateInput) => string | null;
}

export default function ProfileCreateSheet({
  open,
  onClose,
  parentCandidates,
  onCreate,
}: Props) {
  const nameId = useId();
  const [step, setStep] = useState<0 | 1>(0);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [role, setRole] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("beginner");
  const [relationshipStatus, setRelationshipStatus] = useState("");
  const [parentName, setParentName] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setName("");
    setNameError(null);
    setRole("");
    setExperienceLevel("beginner");
    setRelationshipStatus("");
    setParentName(null);
  }, [open]);

  function chooseNewPerson() {
    setParentName(null);
    setName("");
    setNameError(null);
  }

  function chooseParent(candidate: string) {
    setParentName(candidate);
    setName(candidate);
    setNameError(null);
  }

  function continueToDetails() {
    if (!name.trim()) {
      setNameError("Vul een naam of alias in.");
      return;
    }
    setNameError(null);
    setStep(1);
  }

  function create() {
    const error = onCreate({
      name: name.trim(),
      role,
      experienceLevel,
      relationshipStatus: relationshipStatus || undefined,
      parentName,
    });
    if (error) {
      setNameError(error);
      setStep(0);
    }
  }

  const selectedExperience = EXPERIENCE_LEVELS.find((level) => level.value === experienceLevel);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <Sheet open={open} onClose={onClose} scrollable aria-label="Nieuw profiel maken">
      <SheetContent
        showHandle={false}
        className="max-h-[calc(100dvh-env(safe-area-inset-top))] overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-none"
              style={{
                background: "color-mix(in srgb, var(--accent) 14%, var(--surface2))",
                color: "var(--accent)",
                border: "1px solid var(--border-accent)",
              }}
            >
              {step === 0 ? <UserCirclePlus size={22} weight="duotone" /> : <Sparkle size={22} weight="duotone" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--text2)" }}>
                Stap {step + 1} van 2
              </p>
              <h2
                className="text-2xl leading-tight"
                style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 600, color: "var(--text)" }}
              >
                {step === 0 ? "Wie voeg je toe?" : "Maak het persoonlijk"}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluit profiel maken"
            className="focus-ring w-11 h-11 rounded-full flex items-center justify-center flex-none"
            style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}
          >
            <X size={17} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-6" aria-hidden="true">
          <div className="h-1 rounded-full" style={{ background: "var(--accent)" }} />
          <div
            className="h-1 rounded-full transition-colors"
            style={{ background: step === 1 ? "var(--accent)" : "var(--surface3)" }}
          />
        </div>

        {step === 0 ? (
          <div className="ks-fade-in">
            <p className="text-sm mb-4" style={{ color: "var(--text2)" }}>
              Begin met de basis. Antwoorden, foto en verdere details voeg je daarna op het profiel zelf toe.
            </p>

            {parentCandidates.length > 0 && (
              <fieldset className="border-0 p-0 m-0 mb-5">
                <legend className="text-xs font-semibold mb-2" style={{ color: "var(--text2)" }}>
                  Soort profiel
                </legend>
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={chooseNewPerson}
                    aria-pressed={parentName === null}
                    className="focus-ring min-h-[68px] rounded-2xl px-3.5 py-3 flex items-center gap-3 text-left transition-colors"
                    style={parentName === null
                      ? {
                          background: "color-mix(in srgb, var(--accent) 10%, var(--surface2))",
                          border: "1px solid var(--accent)",
                        }
                      : { background: "var(--surface2)", border: "1px solid var(--border)" }}
                  >
                    <span
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-none"
                      style={{
                        background: parentName === null ? "var(--accent)" : "var(--surface3)",
                        color: parentName === null ? "var(--on-accent)" : "var(--text2)",
                      }}
                    >
                      <UserCirclePlus size={19} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold">Nieuwe persoon</span>
                      <span className="block text-xs mt-0.5" style={{ color: "var(--text2)" }}>
                        Een eigen naam of alias
                      </span>
                    </span>
                    {parentName === null && <Check size={16} style={{ color: "var(--accent)" }} />}
                  </button>

                  {parentCandidates.map((candidate) => {
                    const active = parentName === candidate;
                    return (
                      <button
                        key={candidate}
                        type="button"
                        onClick={() => chooseParent(candidate)}
                        aria-pressed={active}
                        className="focus-ring min-h-[68px] rounded-2xl px-3.5 py-3 flex items-center gap-3 text-left transition-colors"
                        style={active
                          ? {
                              background: "color-mix(in srgb, var(--accent) 10%, var(--surface2))",
                              border: "1px solid var(--accent)",
                            }
                          : { background: "var(--surface2)", border: "1px solid var(--border)" }}
                      >
                        <span
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-none"
                          style={{
                            background: active ? "var(--accent)" : "var(--surface3)",
                            color: active ? "var(--on-accent)" : "var(--text2)",
                          }}
                        >
                          <UsersThree size={19} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold truncate">Extra rol voor {candidate}</span>
                          <span className="block text-xs mt-0.5" style={{ color: "var(--text2)" }}>
                            Wordt onder dezelfde persoon gegroepeerd
                          </span>
                        </span>
                        {active && <Check size={16} style={{ color: "var(--accent)" }} />}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <div className="mb-4">
              <label htmlFor={nameId} className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text2)" }}>
                Naam of alias
              </label>
              <input
                id={nameId}
                value={name}
                readOnly={parentName !== null}
                onChange={(event) => {
                  setName(event.target.value);
                  setNameError(null);
                }}
                placeholder="Bijvoorbeeld Nova"
                autoComplete="off"
                autoCapitalize="words"
                className="focus-ring w-full min-h-12 rounded-xl px-3.5 text-base focus:outline-none placeholder-[color:var(--text2)]"
                style={{
                  background: parentName ? "var(--surface3)" : "var(--surface2)",
                  border: `1px solid ${nameError ? "var(--hard-no)" : "var(--border)"}`,
                  color: "var(--text)",
                }}
              />
              {nameError ? (
                <p className="text-xs mt-1.5" role="alert" style={{ color: "var(--hard-no)" }}>
                  {nameError}
                </p>
              ) : parentName ? (
                <p className="text-xs mt-1.5" style={{ color: "var(--text2)" }}>
                  Dezelfde naam houdt beide rollen netjes bij elkaar.
                </p>
              ) : null}
            </div>

            <div className="mb-6">
              <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--text2)" }}>
                Rol <span className="font-normal opacity-60">(optioneel)</span>
              </p>
              <RolePicker value={role} onChange={setRole} />
            </div>

            <button
              type="button"
              onClick={continueToDetails}
              className="focus-ring w-full min-h-12 rounded-xl px-4 flex items-center justify-center gap-2 text-sm font-bold transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              Verder
              <ArrowRight size={16} weight="bold" />
            </button>
          </div>
        ) : (
          <div className="ks-fade-in">
            <p className="text-sm mb-4" style={{ color: "var(--text2)" }}>
              Deze keuzes geven meteen context, maar blijven later volledig aanpasbaar.
            </p>

            <fieldset className="border-0 p-0 m-0 mb-5">
              <legend className="text-xs font-semibold mb-2" style={{ color: "var(--text2)" }}>
                Ervaringsniveau
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {EXPERIENCE_LEVELS.map((level) => {
                  const active = experienceLevel === level.value;
                  return (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => setExperienceLevel(level.value)}
                      aria-pressed={active}
                      className="focus-ring min-h-[74px] rounded-2xl px-3 py-3 text-left transition-colors"
                      style={active
                        ? {
                            background: "color-mix(in srgb, var(--accent) 11%, var(--surface2))",
                            border: "1px solid var(--accent)",
                          }
                        : { background: "var(--surface2)", border: "1px solid var(--border)" }}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{level.label}</span>
                        {active && <Check size={15} style={{ color: "var(--accent)" }} />}
                      </span>
                      <span className="block text-xs mt-1" style={{ color: "var(--text2)" }}>
                        {level.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="border-0 p-0 m-0 mb-5">
              <legend className="text-xs font-semibold mb-2" style={{ color: "var(--text2)" }}>
                Relatiestatus <span className="font-normal opacity-60">(optioneel)</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {RELATIONSHIP_STATUSES.map((status) => {
                  const active = relationshipStatus === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setRelationshipStatus(active ? "" : status)}
                      aria-pressed={active}
                      className="focus-ring min-h-10 rounded-full px-3.5 text-xs font-semibold transition-colors"
                      style={active
                        ? { background: "var(--accent)", color: "var(--on-accent)", border: "1px solid var(--accent)" }
                        : { background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div
              className="rounded-2xl p-3.5 mb-6 flex items-center gap-3"
              style={{
                background: "color-mix(in srgb, var(--accent) 6%, var(--surface2))",
                border: "1px solid var(--border-accent)",
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-none"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))", color: "var(--on-accent)" }}
                aria-hidden="true"
              >
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{name}</p>
                <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text2)" }}>
                  {[role || "Rol nog open", selectedExperience?.label, relationshipStatus].filter(Boolean).join(" · ")}
                </p>
                {parentName && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--accent)" }}>
                    Extra rol onder {parentName}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-[auto_1fr] gap-2">
              <button
                type="button"
                onClick={() => setStep(0)}
                aria-label="Terug naar naam en rol"
                className="focus-ring min-w-12 min-h-12 rounded-xl flex items-center justify-center"
                style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}
              >
                <ArrowLeft size={17} weight="bold" />
              </button>
              <button
                type="button"
                onClick={create}
                className="focus-ring min-h-12 rounded-xl px-4 flex items-center justify-center gap-2 text-sm font-bold transition-opacity hover:opacity-90"
                style={{ background: "var(--accent)", color: "var(--on-accent)" }}
              >
                Maak profiel
                <Check size={17} weight="bold" />
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
