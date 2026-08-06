"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  LockKey,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import { Suspense, useEffect, useMemo, useState } from "react";
import PageShell from "@/components/PageShell";
import MunchPunchQr from "@/components/munch-punch/MunchPunchQr";
import { getMunchPunchPrompt } from "@/lib/munchPunchCatalog";
import {
  decodeMunchPunchJoin,
  encryptMunchPunchResponse,
  type MunchPunchJoinEnvelope,
} from "@/lib/munchPunchCrypto";

function formatExpiry(value: number): string {
  return new Intl.DateTimeFormat("nl-BE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function GuestMunchPunchContent() {
  const [join, setJoin] = useState<MunchPunchJoinEnvelope | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [step, setStep] = useState(0);
  const [responseValue, setResponseValue] = useState<string | null>(null);
  const [pasteInput, setPasteInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [encrypting, setEncrypting] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    function readLocation() {
      if (!window.location.hash) return;
      try {
        const decoded = decodeMunchPunchJoin(window.location.href);
        setJoin(decoded);
        setAnswers(decoded.p.map(() => -1));
        setStep(0);
        setResponseValue(null);
        setError(null);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "De join-code is ongeldig.");
      }
    }
    readLocation();
    window.addEventListener("hashchange", readLocation);
    return () => window.removeEventListener("hashchange", readLocation);
  }, []);

  const prompt = useMemo(() => {
    if (!join) return null;
    const promptId = join.p[step];
    return promptId ? getMunchPunchPrompt(promptId) : null;
  }, [join, step]);

  const expired = !!join && now >= join.e;
  const answeredCount = answers.filter((answer) => answer >= 0).length;
  const complete = !!join && answeredCount === join.p.length;

  function acceptPastedJoin() {
    try {
      const decoded = decodeMunchPunchJoin(pasteInput.trim());
      setJoin(decoded);
      setAnswers(decoded.p.map(() => -1));
      setStep(0);
      setResponseValue(null);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "De join-code is ongeldig.");
    }
  }

  function chooseAnswer(value: number) {
    setAnswers((current) => current.map((answer, index) => index === step ? value : answer));
  }

  async function buildResponse() {
    if (!join || !complete || expired || encrypting) return;
    setEncrypting(true);
    setError(null);
    try {
      const encrypted = await encryptMunchPunchResponse(join, answers, Date.now());
      setResponseValue(encrypted);
      setAnswers([]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "De response kon niet worden versleuteld.");
    } finally {
      setEncrypting(false);
    }
  }

  function clearGuestSession() {
    setJoin(null);
    setAnswers([]);
    setStep(0);
    setResponseValue(null);
    setPasteInput("");
    setError(null);
    window.history.replaceState(null, "", "/munch-punch/join");
  }

  if (!join) {
    return (
      <PageShell width="lg">
        <section className="rounded-[26px] p-5" style={{ background: "var(--surface2)", border: "1px solid var(--border-accent)" }}>
          <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
            <LockKey size={22} weight="duotone" aria-hidden="true" />
          </span>
          <h1 className="text-3xl font-semibold serif-safe" style={{ fontFamily: "var(--font-display, Georgia, serif)" }}>
            Join Munch Punch
          </h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
            Scan de join-QR van de host. Je hoeft geen account of profiel te kiezen of te maken.
          </p>

          <label htmlFor="munch-join-code" className="mb-2 mt-5 block text-xs font-semibold">
            Of plak de join-link
          </label>
          <textarea
            id="munch-join-code"
            value={pasteInput}
            onChange={(event) => setPasteInput(event.target.value)}
            rows={5}
            placeholder="https://…/munch-punch/join#KSMJ1:…"
            className="focus-ring w-full rounded-xl px-3 py-3 text-xs outline-none"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", resize: "vertical" }}
          />
          {error && <p className="mt-3 text-xs" style={{ color: "var(--hard-no)" }}>{error}</p>}
          <button
            type="button"
            onClick={acceptPastedJoin}
            disabled={!pasteInput.trim()}
            className="focus-ring mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold disabled:opacity-40"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            Open vragen
            <ArrowRight size={17} weight="bold" aria-hidden="true" />
          </button>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell width="lg">
      <section className="mb-5 rounded-[26px] p-5" style={{ background: "var(--surface2)", border: "1px solid var(--border-accent)" }}>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
            <ShieldCheck size={23} weight="duotone" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Anonieme groepsvragen</p>
            <h1 className="mt-1 truncate text-2xl font-semibold serif-safe" style={{ fontFamily: "var(--font-display, Georgia, serif)" }}>
              {join.t}
            </h1>
            <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>
              Vervalt {formatExpiry(join.e)}
            </p>
          </div>
        </div>
      </section>

      {expired ? (
        <section className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--hard-no)" }}>
          <p className="flex items-start gap-2 text-sm" style={{ color: "var(--hard-no)" }}>
            <WarningCircle size={19} weight="fill" className="mt-0.5 flex-none" aria-hidden="true" />
            Deze room is vervallen. De host kan deze response niet meer aannemen.
          </p>
          <button
            type="button"
            onClick={clearGuestSession}
            className="focus-ring mt-4 min-h-11 w-full rounded-xl px-4 text-sm font-semibold"
            style={{ border: "1px solid var(--border)", color: "var(--text2)" }}
          >
            Wis roomgegevens
          </button>
        </section>
      ) : responseValue ? (
        <div className="space-y-4">
          <MunchPunchQr
            value={responseValue}
            title="Versleutelde response-QR"
            caption="Laat de host deze QR scannen. De host ziet geen individueel antwoordscherm; je keuzes worden na ontsleuteling direct opgeteld."
            copyLabel="Kopieer responsecode"
          />
          <section className="rounded-2xl p-4 text-xs leading-relaxed" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>
            <p className="flex items-start gap-2 font-semibold" style={{ color: "var(--yes)" }}>
              <CheckCircle size={17} weight="fill" className="mt-0.5 flex-none" aria-hidden="true" />
              De losse keuzes zijn uit deze pagina gewist; alleen de versleutelde QR blijft in het werkgeheugen.
            </p>
            <p className="mt-2">
              Dezelfde QR opnieuw aanbieden wordt geweigerd. Een nieuwe QR maken kan technisch nog steeds, dus dit is geen perfecte één-persoon-één-stem-controle.
            </p>
          </section>
          <button
            type="button"
            onClick={clearGuestSession}
            className="focus-ring min-h-11 w-full rounded-xl px-4 text-sm font-semibold"
            style={{ color: "var(--hard-no)", border: "1px solid var(--border)" }}
          >
            Wis QR en sluit af
          </button>
        </div>
      ) : prompt ? (
        <section className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
              Vraag {step + 1} van {join.p.length}
            </p>
            <p className="text-xs tabular-nums" style={{ color: "var(--text2)" }}>
              {answeredCount}/{join.p.length} gekozen
            </p>
          </div>
          <h2 className="text-xl font-semibold leading-snug">{prompt.question}</h2>
          <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--text2)" }}>{prompt.hint}</p>

          <div className="mt-5 space-y-2">
            {prompt.options.map((option, optionIndex) => {
              const selected = answers[step] === optionIndex;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => chooseAnswer(optionIndex)}
                  className="focus-ring min-h-12 w-full rounded-xl px-3 py-3 text-left text-sm font-semibold"
                  style={{
                    background: selected ? "color-mix(in srgb, var(--accent) 14%, var(--surface2))" : "var(--surface2)",
                    border: `1px solid ${selected ? "var(--border-accent)" : "var(--border)"}`,
                    color: selected ? "var(--text)" : "var(--text2)",
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              disabled={step === 0}
              className="focus-ring flex min-h-11 items-center justify-center gap-1 rounded-xl px-3 text-sm font-semibold disabled:opacity-35"
              style={{ border: "1px solid var(--border)", color: "var(--text2)" }}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Vorige
            </button>
            {step < join.p.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((current) => Math.min(join.p.length - 1, current + 1))}
                disabled={answers[step] < 0}
                className="focus-ring flex min-h-11 items-center justify-center gap-1 rounded-xl px-3 text-sm font-bold disabled:opacity-35"
                style={{ background: "var(--accent)", color: "var(--on-accent)" }}
              >
                Volgende
                <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void buildResponse()}
                disabled={!complete || encrypting}
                className="focus-ring flex min-h-11 items-center justify-center gap-1 rounded-xl px-3 text-sm font-bold disabled:opacity-35"
                style={{ background: "var(--accent)", color: "var(--on-accent)" }}
              >
                <LockKey size={16} weight="bold" aria-hidden="true" />
                {encrypting ? "Versleutelen…" : "Maak response-QR"}
              </button>
            )}
          </div>

          {error && <p className="mt-4 text-xs" style={{ color: "var(--hard-no)" }}>{error}</p>}
        </section>
      ) : null}

      <section className="mt-4 rounded-2xl p-4 text-xs leading-relaxed" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>
        <p className="font-semibold" style={{ color: "var(--text)" }}>Wat dit wel en niet verbergt</p>
        <p className="mt-2">
          De QR draagt geen naam, profiel-ID of blijvende identiteit. Mensen in de ruimte kunnen nog steeds zien wie scant of sociaal proberen antwoorden af te leiden. Gebruik de groepsuitslag nooit als individuele toestemming.
        </p>
      </section>
    </PageShell>
  );
}

export default function GuestMunchPunchPage() {
  return (
    <Suspense fallback={<PageShell loading width="lg" />}>
      <GuestMunchPunchContent />
    </Suspense>
  );
}
