"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle, LinkSimple, Sparkle, Trash, X } from "@phosphor-icons/react";
import { parseBdsmtestCopyAll, type BdsmtestCopyAllError } from "@/lib/parseBdsmtest";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useStore } from "@/lib/store";
import type { Profile } from "@/types";

interface Props {
  open: boolean;
  profile: Profile;
  onClose: () => void;
}

const ERROR_COPY: Record<BdsmtestCopyAllError, string> = {
  "too-large": "Deze plaktekst is te groot om veilig te verwerken.",
  "missing-url": "Geen geldige BDSMTest-resultaatlink gevonden.",
  "multiple-urls": "Deze plaktekst bevat meer dan één resultaatlink.",
  "invalid-url": "De resultaatlink lijkt niet van bdsmtest.org te komen.",
  "missing-results": "Geen herkenbare BDSMTest-resultaten gevonden.",
  "invalid-results": "Een of meer BDSMTest-resultaten hebben een ongeldig formaat.",
};

function validFetLifeUsername(value: string): boolean {
  const clean = value.trim();
  return !clean || (!clean.includes("://") && !clean.includes("<") && !clean.includes(">") && clean.length <= 200);
}

export default function ProfileEnrichmentModal({ open, profile, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [fetLife, setFetLife] = useState("");
  const [bdsmPaste, setBdsmPaste] = useState("");
  const [removeBdsmtest, setRemoveBdsmtest] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusTrap(dialogRef, open && mounted);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setFetLife(profile.fetLifeUsername ?? "");
    setBdsmPaste("");
    setRemoveBdsmtest(false);
    setError(null);
    requestAnimationFrame(() => dialogRef.current?.focus());

    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      requestAnimationFrame(() => previousFocus.current?.isConnected && previousFocus.current.focus());
    };
  }, [onClose, open, profile.fetLifeUsername]);

  const parsed = useMemo(() => {
    if (!bdsmPaste.trim()) return null;
    return parseBdsmtestCopyAll(bdsmPaste);
  }, [bdsmPaste]);

  if (!mounted || !open) return null;

  function save() {
    const cleanFetLife = fetLife.trim();
    if (!validFetLifeUsername(cleanFetLife)) {
      setError("Vul bij FetLife alleen je gebruikersnaam in.");
      return;
    }

    if (bdsmPaste.trim() && (!parsed || !parsed.ok)) {
      setError(parsed && !parsed.ok ? ERROR_COPY[parsed.error] : "BDSMTest kon niet worden verwerkt.");
      return;
    }

    useStore.setState((state) => {
      const latest = state.profiles.find((candidate) => candidate.id === profile.id);
      if (!latest) return state;
      const now = Date.now();

      return {
        profiles: state.profiles.map((candidate) => {
          const samePerson = candidate.id === latest.id
            || Boolean(latest.personGroupId && candidate.personGroupId === latest.personGroupId);
          if (!samePerson) return candidate;

          const personLevel = {
            ...candidate,
            fetLifeUsername: cleanFetLife || undefined,
            updatedAt: now,
          };
          if (candidate.id !== latest.id) return personLevel;

          if (removeBdsmtest) {
            const { bdsmtestUrl: _url, bdsmtestScores: _scores, ...withoutBdsmtest } = personLevel;
            return withoutBdsmtest as Profile;
          }

          if (parsed?.ok) {
            return {
              ...personLevel,
              bdsmtestUrl: parsed.url,
              bdsmtestScores: parsed.scores,
            };
          }

          return personLevel;
        }),
      };
    });

    setError(null);
    onClose();
  }

  const hasStoredBdsmtest = Boolean(profile.bdsmtestUrl || profile.bdsmtestScores?.length);

  return createPortal(
    <div className="fixed inset-0 z-[360] flex items-center justify-center p-4 sm:p-6" role="presentation">
      <div
        aria-hidden="true"
        onMouseDown={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(5, 3, 12, 0.76)", backdropFilter: "blur(8px)" }}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-enrichment-title"
        tabIndex={-1}
        className="relative z-10 w-[min(92vw,34rem)] max-h-[min(calc(var(--visual-viewport-height,100dvh)-2rem),42rem)] overflow-y-auto overscroll-contain rounded-[24px] p-5 shadow-2xl sm:p-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl"
            style={{ color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 10%, var(--surface2))" }}
          >
            <Sparkle size={20} weight="duotone" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text2)" }}>Profiel</p>
            <h2 id="profile-enrichment-title" className="mt-1 text-xl font-semibold" style={{ color: "var(--text)" }}>
              Profiel aanvullen
            </h2>
            <p className="mt-1 text-sm leading-5" style={{ color: "var(--text2)" }}>
              Voeg je BDSMTest of FetLife toe wanneer je dat zelf wilt.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluit profiel aanvullen"
            className="focus-ring flex h-10 w-10 flex-none items-center justify-center rounded-full"
            style={{ color: "var(--text2)" }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <section className="mt-5 rounded-2xl p-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <LinkSimple size={17} aria-hidden="true" style={{ color: "var(--accent)" }} />
            <h3 className="text-sm font-semibold">FetLife</h3>
          </div>
          <p className="mt-1 text-xs leading-5" style={{ color: "var(--text2)" }}>
            Alleen je gebruikersnaam. KinkSync maakt daar lokaal de profiel-link van.
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
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        </section>

        <section className="mt-3 rounded-2xl p-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <Sparkle size={17} aria-hidden="true" style={{ color: "var(--accent)" }} />
            <h3 className="text-sm font-semibold">BDSMTest</h3>
          </div>
          <p className="mt-1 text-xs leading-5" style={{ color: "var(--text2)" }}>
            Gebruik op bdsmtest.org de optie Copy all en plak hier alles in één keer.
          </p>

          <textarea
            value={bdsmPaste}
            onChange={(event) => {
              setBdsmPaste(event.target.value);
              setRemoveBdsmtest(false);
              setError(null);
            }}
            rows={5}
            maxLength={16_384}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Plak hier de resultaatlink en resultaten"
            className="focus-ring mt-3 w-full resize-none rounded-xl px-3 py-2.5 text-sm leading-5 focus:outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
          />

          {parsed?.ok && (
            <div className="mt-3 flex flex-wrap gap-2" role="status">
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs" style={{ color: "var(--yes)", background: "color-mix(in srgb, var(--yes) 8%, var(--surface))" }}>
                <CheckCircle size={14} weight="fill" aria-hidden="true" /> Resultaatlink gevonden
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs" style={{ color: "var(--yes)", background: "color-mix(in srgb, var(--yes) 8%, var(--surface))" }}>
                <CheckCircle size={14} weight="fill" aria-hidden="true" /> {parsed.scores.length} resultaten gevonden
              </span>
            </div>
          )}

          {parsed && !parsed.ok && (
            <p className="mt-2 text-xs leading-5" role="status" style={{ color: "var(--hard-no-text)" }}>
              {ERROR_COPY[parsed.error]}
            </p>
          )}

          {hasStoredBdsmtest && !bdsmPaste.trim() && !removeBdsmtest && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl px-3 py-2.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-xs" style={{ color: "var(--text2)" }}>
                {profile.bdsmtestScores?.length ?? 0} resultaten opgeslagen
              </p>
              <button
                type="button"
                onClick={() => {
                  setRemoveBdsmtest(true);
                  setError(null);
                }}
                className="focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold"
                style={{ color: "var(--hard-no-text)" }}
              >
                <Trash size={14} aria-hidden="true" /> Verwijder
              </button>
            </div>
          )}

          {removeBdsmtest && (
            <p className="mt-3 text-xs leading-5" style={{ color: "var(--text2)" }}>
              De opgeslagen BDSMTest-link en resultaten worden verwijderd wanneer je opslaat.
            </p>
          )}
        </section>

        {error && (
          <p className="mt-3 rounded-xl px-3 py-2.5 text-sm" role="alert" style={{ color: "var(--hard-no-text)", background: "color-mix(in srgb, var(--hard-no) 7%, var(--surface2))", border: "1px solid color-mix(in srgb, var(--hard-no) 22%, var(--border))" }}>
            {error}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="focus-ring min-h-12 rounded-xl text-sm font-semibold"
            style={{ color: "var(--text2)", border: "1px solid var(--border)" }}
          >
            Annuleer
          </button>
          <button
            type="button"
            onClick={save}
            className="focus-ring min-h-12 rounded-xl text-sm font-semibold"
            style={{ color: "var(--on-accent-fill)", background: "var(--accent-fill)" }}
          >
            Opslaan
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
