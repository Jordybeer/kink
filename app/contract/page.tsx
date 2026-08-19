"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { ArrowRight, CaretDown, CaretUp, X } from "@phosphor-icons/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useStore, useHasHydrated } from "@/lib/store";
import { KINKS } from "@/lib/kinks";
import type { KinkStatus, KinkEntry } from "@/types";
import { isKinkMatch, isHardLimit, kinkMatchScore } from "@/lib/matching";
import PageShell from "@/components/PageShell";
import ContractSection from "@/components/contract/ContractSection";
import ContractSigningSheet from "@/components/contract/ContractSigningSheet";
import { contractParticipantFromProfile, type ContractVersionContent } from "@/lib/contractLifecycle";
import SignaturePad from "@/components/contract/SignaturePad";
import { useToast } from "@/components/Toast";
import { motion, AnimatePresence } from "framer-motion";
import { buildPreamble } from "@/lib/contractPreamble";
import { statusPairRank } from "@/lib/statusLabels";
import { DEFAULT_SIGNALS, SIGNAL_LEVELS } from "@/lib/contractPdf";
import type { Signals } from "@/lib/contractPdf";
import { comparableEntry } from "@/lib/privateResponses";
import { directionalCompareLabel, directionalComparisonEntries } from "@/lib/directionality";
import {
  captureHandwrittenSignature,
  type ContractContentWithHandwriting,
} from "@/lib/contractHandwriting";

const AFTERCARE_OPTIONS = ["Knuffelen", "Verbaal", "Eten & drinken", "Alleen tijd", "Journaling"];

function ContractPage() {
  const searchParams = useSearchParams();
  const profiles = useStore((state) => state.profiles);
  const _hasHydrated = useHasHydrated();
  const aId = searchParams.get("a") ?? "";
  const bId = searchParams.get("b") ?? "";
  const [preambleOpen, setPreambleOpen] = useState(false);
  const [signingOpen, setSigningOpen] = useState(false);
  const [signingContent, setSigningContent] = useState<ContractContentWithHandwriting | null>(null);
  const { showToast } = useToast();

  const [signalsA, setSignalsA] = useState<Signals>({ ...DEFAULT_SIGNALS });
  const [signalsB, setSignalsB] = useState<Signals>({ ...DEFAULT_SIGNALS });
  const [aftercareA, setAftercareA] = useState<string[]>([]);
  const [aftercareB, setAftercareB] = useState<string[]>([]);

  const [realNameA, setRealNameA] = useState("");
  const [realNameB, setRealNameB] = useState("");
  const [whyOpen, setWhyOpen] = useState(false);
  const [signedA, setSignedA] = useState(false);
  const [signedB, setSignedB] = useState(false);

  const canvasARef = useRef<HTMLCanvasElement>(null);
  const canvasBRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!whyOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setWhyOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [whyOpen]);

  if (!_hasHydrated) return <PageShell loading width="3xl" />;

  const profileA = profiles.find((profile) => profile.id === aId);
  const profileB = profiles.find((profile) => profile.id === bId);

  if (!profileA || !profileB) {
    return (
      <PageShell width="3xl">
        <p className="py-12 text-center text-sm" style={{ color: "var(--text2)" }}>
          Kies twee profielen via de vergelijkingspagina om een contract op te stellen.
        </p>
      </PageShell>
    );
  }

  const selectedProfileA = profileA;
  const selectedProfileB = profileB;

  type KinkDetail = {
    name: string;
    statusA: KinkStatus | null;
    statusB: KinkStatus | null;
    commentA?: string;
    commentB?: string;
    desireA?: number | null;
    desireB?: number | null;
  };

  const shared: KinkDetail[] = [];
  const hardLimits: { name: string; who: string }[] = [];
  const hardLimitDetails: KinkDetail[] = [];
  const softLimits: KinkDetail[] = [];
  const discuss: KinkDetail[] = [];
  const EMPTY: KinkEntry = { status: null, comment: "" };

  for (const kink of KINKS) {
    const pair = directionalComparisonEntries(profileA.entries, profileB.entries, kink.id);
    const entryA = comparableEntry(pair.sourceEntry);
    const entryB = comparableEntry(pair.partnerEntry);
    const hasA = entryA.status;
    const hasB = entryB.status;
    if (!hasA && !hasB) continue;
    const detail: KinkDetail = {
      name: directionalCompareLabel(kink.id, kink.name),
      statusA: entryA.status,
      statusB: entryB.status,
      commentA: entryA.comment || undefined,
      commentB: entryB.comment || undefined,
      desireA: entryA.desire ?? null,
      desireB: entryB.desire ?? null,
    };
    if (isHardLimit(entryA, entryB)) {
      const aHard = entryA.status === "hard_no";
      const bHard = entryB.status === "hard_no";
      const who = aHard && bHard ? "beiden" : aHard ? profileA.name : profileB.name;
      hardLimits.push({ name: detail.name, who });
      hardLimitDetails.push(detail);
    } else if (isKinkMatch(entryA, entryB)) {
      shared.push(detail);
    } else if (kinkMatchScore(entryA, entryB).kind === "soft") {
      softLimits.push(detail);
    } else if (hasA && hasB) {
      discuss.push(detail);
    }
  }

  const customShared: KinkDetail[] = [];
  const allCustom = [
    ...(profileA.customKinks ?? []).map((kink) => ({ ...kink, side: "a" as const })),
    ...(profileB.customKinks ?? []).map((kink) => ({ ...kink, side: "b" as const })),
  ];
  const customMerged = new Map<string, { name: string; aId?: string; bId?: string }>();
  for (const kink of allCustom) {
    const key = kink.name.trim().toLowerCase();
    const existing = customMerged.get(key) ?? { name: kink.name };
    customMerged.set(key, kink.side === "a" ? { ...existing, aId: kink.id } : { ...existing, bId: kink.id });
  }
  for (const item of customMerged.values()) {
    const entryA = item.aId ? comparableEntry(profileA.entries[item.aId]) : EMPTY;
    const entryB = item.bId ? comparableEntry(profileB.entries[item.bId]) : EMPTY;
    const detail: KinkDetail = {
      name: item.name,
      statusA: entryA.status,
      statusB: entryB.status,
      commentA: entryA.comment || undefined,
      commentB: entryB.comment || undefined,
    };
    if (isKinkMatch(entryA, entryB)) customShared.push(detail);
    else if (entryA.status || entryB.status) discuss.push(detail);
  }

  const byChoice = (left: KinkDetail, right: KinkDetail) =>
    statusPairRank(left.statusA, left.statusB) - statusPairRank(right.statusA, right.statusB)
    || left.name.localeCompare(right.name, "nl");
  const sharedAll = [...shared, ...customShared].sort(byChoice);
  softLimits.sort(byChoice);
  discuss.sort(byChoice);
  hardLimitDetails.sort(byChoice);
  const hardOrder = new Map(hardLimitDetails.map((detail, index) => [detail.name, index]));
  hardLimits.sort((left, right) => (hardOrder.get(left.name) ?? 0) - (hardOrder.get(right.name) ?? 0));

  const today = new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  const trimmedRealNameA = realNameA.trim();
  const trimmedRealNameB = realNameB.trim();
  const useRealNames = trimmedRealNameA.length > 0 && trimmedRealNameB.length > 0;

  const preamble = buildPreamble({
    nameA: profileA.name,
    roleA: profileA.role,
    nameB: profileB.name,
    roleB: profileB.role,
    levelA: profileA.experienceLevel,
    levelB: profileB.experienceLevel,
    realNameA: useRealNames ? trimmedRealNameA : undefined,
    realNameB: useRealNames ? trimmedRealNameB : undefined,
  });

  function baseContractContent(): ContractVersionContent {
    return {
      schema: 1,
      profileA: contractParticipantFromProfile(selectedProfileA),
      profileB: contractParticipantFromProfile(selectedProfileB),
      preamble,
      createdAt: Date.now(),
      ...(useRealNames ? { realNameA: trimmedRealNameA, realNameB: trimmedRealNameB } : {}),
      signalsA: { green: signalsA.green, amber: signalsA.yellow, red: signalsA.red, black: signalsA.black },
      signalsB: { green: signalsB.green, amber: signalsB.yellow, red: signalsB.red, black: signalsB.black },
      aftercareA: [...aftercareA],
      aftercareB: [...aftercareB],
      shared: sharedAll.map((item) => ({ ...item })),
      softLimits: softLimits.map((item) => ({ ...item })),
      hardLimits: hardLimits.map((item) => ({ ...item })),
      hardLimitDetails: hardLimitDetails.map((item) => ({ ...item })),
      discuss: discuss.map((item) => ({ ...item })),
    };
  }

  function handleConfirm() {
    if ((trimmedRealNameA.length > 0) !== (trimmedRealNameB.length > 0)) {
      showToast({ message: "Vul de echte naam van beide partijen in, of laat ze beide leeg." });
      return;
    }
    if (!signedA || !signedB || !canvasARef.current || !canvasBRef.current) {
      showToast({ message: "Beide handgeschreven handtekeningen zijn verplicht voordat je dit contract kunt bewaren." });
      return;
    }
    try {
      const content: ContractContentWithHandwriting = {
        ...baseContractContent(),
        handwrittenSignatures: {
          profileA: captureHandwrittenSignature(canvasARef.current),
          profileB: captureHandwrittenSignature(canvasBRef.current),
        },
      };
      setSigningContent(content);
      setSigningOpen(true);
    } catch (caught) {
      showToast({ message: caught instanceof Error ? caught.message : "De handtekeningen konden niet worden vastgelegd." });
    }
  }

  const COLOUR_A = "var(--accent)";
  const COLOUR_B = "var(--accent2)";

  function toggleAftercareA(option: string) {
    setAftercareA((previous) => previous.includes(option)
      ? previous.filter((item) => item !== option)
      : [...previous, option]);
  }

  function toggleAftercareB(option: string) {
    setAftercareB((previous) => previous.includes(option)
      ? previous.filter((item) => item !== option)
      : [...previous, option]);
  }

  return (
    <>
      <PageShell width="3xl" className="contract-print">
        <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
          <Link
            href={`/compare?a=${aId}&b=${bId}`}
            prefetch={false}
            className="focus-ring inline-flex min-h-[44px] items-center pr-2 text-sm transition-colors"
            style={{ color: "var(--text2)" }}
          >
            <ArrowRight size={16} className="mr-1 rotate-180" aria-hidden="true" />
            Terug
          </Link>
          <h1 className="flex-1 text-xl font-bold">Teken het contract</h1>
        </div>

        <div
          className="mb-6 rounded-2xl p-6"
          style={{ background: "var(--surface)", border: "1px solid var(--border-accent)" }}
        >
          <div className="mb-6 text-center">
            <h2
              className="mb-1 text-2xl font-bold"
              style={{ background: "linear-gradient(90deg, var(--accent), var(--accent2))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              KinkSync Contract
            </h2>
            <p className="text-sm" style={{ color: "var(--text2)" }}>
              <span style={{ color: COLOUR_A }}>{profileA.name}</span>
              <span className="mx-2" style={{ color: "var(--text2)" }}>&</span>
              <span style={{ color: COLOUR_B }}>{profileB.name}</span>
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>Opgesteld op {today}</p>
          </div>

          <div className="mb-6 border-l-[3px] pl-4" style={{ borderColor: "var(--border-accent)" }}>
            <p className="text-sm italic leading-relaxed print:hidden" style={{ color: "var(--text2)" }}>
              {preambleOpen ? preamble : preamble.slice(0, preamble.indexOf(". ") + 1)}
            </p>
            <p className="hidden text-sm italic leading-relaxed print:block" style={{ color: "var(--text2)" }}>{preamble}</p>
            <button
              type="button"
              onClick={() => setPreambleOpen((value) => !value)}
              className="focus-ring mt-2 inline-flex min-h-9 items-center gap-1 px-3 text-xs transition-colors"
              style={{ color: "var(--accent)" }}
            >
              {preambleOpen ? <>Minder <CaretUp size={13} aria-hidden="true" /></> : <>Lees meer <CaretDown size={13} aria-hidden="true" /></>}
            </button>
          </div>

          <div className="mb-6 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <h3 className="mb-4 text-sm italic" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 400, color: "var(--accent)" }}>
              Safeword &amp; Nazorg
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                { profile: profileA, signals: signalsA, setSignals: setSignalsA, aftercare: aftercareA, toggle: toggleAftercareA, colour: COLOUR_A },
                { profile: profileB, signals: signalsB, setSignals: setSignalsB, aftercare: aftercareB, toggle: toggleAftercareB, colour: COLOUR_B },
              ].map(({ profile, signals, setSignals, aftercare, toggle, colour }) => (
                <div key={profile.id} className="flex flex-col gap-3 rounded-xl p-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <div className="text-xs font-semibold" style={{ color: colour }}>{profile.name}</div>
                  <div className="flex flex-col gap-1.5">
                    {SIGNAL_LEVELS.map((level) => (
                      <div key={level.key} className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 flex-none rounded-full" style={{ background: level.color }} />
                        <span className="w-32 flex-none text-xs" style={{ color: "var(--text2)" }}>{level.meaning}</span>
                        <input
                          type="text"
                          placeholder={DEFAULT_SIGNALS[level.key]}
                          value={signals[level.key]}
                          onChange={(event) => setSignals((current) => ({ ...current, [level.key]: event.target.value }))}
                          className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2"
                          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                          aria-label={`${level.meaning} signaalwoord voor ${profile.name}`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {AFTERCARE_OPTIONS.map((option) => {
                      const active = aftercare.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => toggle(option)}
                          className="focus-ring rounded-full border px-2 py-1 text-xs transition-all"
                          style={{
                            background: active ? "color-mix(in srgb, var(--yes) 20%, transparent)" : "transparent",
                            borderColor: active ? "var(--yes)" : "var(--border)",
                            color: active ? "var(--yes)" : "var(--text2)",
                          }}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <ContractSection title="Gedeelde verlangens" items={sharedAll} colour="var(--yes)" nameA={profileA.name} nameB={profileB.name} colourA={COLOUR_A} colourB={COLOUR_B} />
          <ContractSection title="Zachte grenzen" items={softLimits} colour="var(--maybe)" nameA={profileA.name} nameB={profileB.name} colourA={COLOUR_A} colourB={COLOUR_B} />
          <ContractSection title="Harde grenzen" items={hardLimits.map((item) => ({ text: item.name, tag: item.who }))} colour="var(--hard-no)" />
          <ContractSection title="Bespreking nodig" items={discuss} colour="var(--willing)" nameA={profileA.name} nameB={profileB.name} colourA={COLOUR_A} colourB={COLOUR_B} />

          <div className="mt-6 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <h3 className="mb-3 text-sm italic" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 400, color: "var(--accent)" }}>Algemene afspraken</h3>
            <ul className="space-y-1.5 text-sm" style={{ color: "var(--text2)" }}>
              <li>Safeword stopt alles, altijd en zonder uitleg.</li>
              <li>Aftercare is geen optie, maar een afspraak.</li>
              <li>Dit contract kan op elk moment door beiden worden herzien.</li>
              <li>Grenzen die hier niet staan, worden voor elke scène besproken.</li>
              <li>Dit contract kan door beide partijen op elk moment worden verbroken zonder toestemming van de ander.</li>
            </ul>
          </div>
        </div>

        <div className="mb-6 rounded-2xl p-6 print:hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h2 className="mb-1 text-sm italic" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 400, color: "var(--accent)" }}>
            Echte namen <span className="not-italic opacity-60">(optioneel)</span>
          </h2>
          <p className="mb-4 text-sm" style={{ color: "var(--text2)" }}>
            Beide velden samen invullen of beide leeg laten. Bij invullen verschijnen de echte namen naast de nicknames onder de handtekening.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium" style={{ color: COLOUR_A }}>Echte naam van {profileA.name}</span>
              <input value={realNameA} onChange={(event) => setRealNameA(event.target.value)} placeholder="Voor- en achternaam…" autoComplete="off" className="focus-ring w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium" style={{ color: COLOUR_B }}>Echte naam van {profileB.name}</span>
              <input value={realNameB} onChange={(event) => setRealNameB(event.target.value)} placeholder="Voor- en achternaam…" autoComplete="off" className="focus-ring w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }} />
            </label>
          </div>
          <button type="button" onClick={() => setWhyOpen(true)} className="focus-ring mt-3 inline-flex min-h-9 items-center gap-1 text-xs transition-colors" style={{ color: "var(--accent)" }}>
            Waarom een echte naam toevoegen? <ArrowRight size={13} aria-hidden="true" />
          </button>
        </div>

        <div className="mb-6 rounded-2xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h2 className="text-sm italic" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 400, color: "var(--accent)" }}>
            Handgeschreven handtekeningen
          </h2>
          <p className="mb-4 mt-1 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
            Verplicht voordat dit contract kan worden bewaard of digitaal bevestigd. Beide handtekeningen worden onderdeel van exact deze contractversie.
          </p>
          <div className="flex flex-wrap gap-4">
            <SignaturePad label={profileA.name} colour={COLOUR_A} canvasRef={canvasARef} onSignedChange={setSignedA} />
            <SignaturePad label={profileB.name} colour={COLOUR_B} canvasRef={canvasBRef} onSignedChange={setSignedB} />
          </div>
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          className="focus-ring min-h-12 w-full rounded-xl px-4 text-sm font-bold transition-opacity hover:opacity-90"
          style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
        >
          Contract bewaren of digitaal bevestigen
        </button>
        <Link href="/contracts" className="focus-ring mt-3 flex min-h-10 items-center justify-center text-sm" style={{ color: "var(--text2)" }}>
          Naar contractgeschiedenis
        </Link>
      </PageShell>

      {signingContent && (
        <ContractSigningSheet
          open={signingOpen}
          onClose={() => {
            setSigningOpen(false);
            setSigningContent(null);
          }}
          profileA={profileA}
          profileB={profileB}
          content={signingContent}
        />
      )}

      <AnimatePresence>
        {whyOpen && (
          <motion.div
            key="why-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setWhyOpen(false)}
            className="fixed inset-0 z-[220] flex items-center justify-center p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
            style={{ background: "rgba(0,0,0,0.65)" }}
          >
            <motion.div
              key="why-panel"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Waarom echte namen toevoegen"
              className="w-full max-w-[480px] rounded-2xl p-6"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Waarom echte namen?</span>
                <button type="button" onClick={() => setWhyOpen(false)} className="focus-ring rounded-full p-1" style={{ color: "var(--text2)" }} aria-label="Sluiten">
                  <X aria-hidden="true" size={18} />
                </button>
              </div>
              <p className="mb-3 text-sm leading-relaxed">
                Een nickname kan prima zijn voor een persoonlijk verbond. Een echte naam maakt alleen duidelijker wie dit document heeft ondertekend.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
                Dat kan belangrijk zijn als je later discussie wilt vermijden over identiteit, instemming of afspraken. Het maakt het document helderder; het verandert niets aan de lokale privacy van KinkSync.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function ContractSuspense() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm" style={{ color: "var(--text2)" }}>Laden…</div>}>
      <ContractPage />
    </Suspense>
  );
}
