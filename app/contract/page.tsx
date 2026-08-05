"use client";
import { Suspense, useRef, useState, useEffect, useCallback } from "react";
import { ArrowRight, CaretDown, CaretUp, Heart, Trash, TrendUp, X } from "@phosphor-icons/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useStore, useHasHydrated } from "@/lib/store";
import { KINKS } from "@/lib/kinks";
import type { KinkStatus, KinkEntry } from "@/types";
import { isKinkMatch, isHardLimit, kinkMatchScore } from "@/lib/matching";
import PageShell from "@/components/PageShell";
import ContractSection from "@/components/contract/ContractSection";
import SignaturePad from "@/components/contract/SignaturePad";
import { useToast } from "@/components/Toast";
import { motion, AnimatePresence } from "framer-motion";
import { buildPreamble } from "@/lib/contractPreamble";
import { canvasHasInk } from "@/lib/canvasUtils";
import { STATUS_LABEL as STATUS_NL, statusPairRank } from "@/lib/statusLabels";
import { buildContractPdf, isKinkDetail, DEFAULT_SIGNALS, SIGNAL_LEVELS } from "@/lib/contractPdf";
import type { ContractItem, KinkDetailItem, Signals } from "@/lib/contractPdf";

const AFTERCARE_OPTIONS = ["Knuffelen", "Verbaal", "Eten & drinken", "Alleen tijd", "Journaling"];


function ContractPage() {
  const searchParams = useSearchParams();
  const { profiles, saveContract, contracts, deleteContract } = useStore();
  const _hasHydrated = useHasHydrated();
  const aId = searchParams.get("a") ?? "";
  const bId = searchParams.get("b") ?? "";
  const [generating, setGenerating] = useState(false);
  const [ceremony, setCeremony] = useState(false);
  const [preambleOpen, setPreambleOpen] = useState(false);
  const { showToast } = useToast();

  // Safeword & aftercare state
  const [signalsA, setSignalsA] = useState<Signals>({ ...DEFAULT_SIGNALS });
  const [signalsB, setSignalsB] = useState<Signals>({ ...DEFAULT_SIGNALS });
  const [aftercareA, setAftercareA] = useState<string[]>([]);
  const [aftercareB, setAftercareB] = useState<string[]>([]);

  // Identity & signature tracking
  const [realNameA, setRealNameA] = useState("");
  const [realNameB, setRealNameB] = useState("");
  const [whyOpen, setWhyOpen] = useState(false);
  const [signedA, setSignedA] = useState(false);
  const [signedB, setSignedB] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const canvasARef = useRef<HTMLCanvasElement>(null);
  const canvasBRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!whyOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setWhyOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [whyOpen]);

  if (!_hasHydrated) return <PageShell loading width="3xl" />;

  const profileA = profiles.find((p) => p.id === aId);
  const profileB = profiles.find((p) => p.id === bId);

  if (!profileA || !profileB) {
    return (
      <PageShell width="3xl">
        <p className="text-center py-12 text-sm" style={{ color: "var(--text2)" }}>
          Kies twee profielen via de vergelijkingspagina om een contract op te stellen.
        </p>
      </PageShell>
    );
  }

  type KinkDetail = {
    name: string;
    statusA: KinkStatus | null; statusB: KinkStatus | null;
    commentA?: string; commentB?: string;
    desireA?: number | null; desireB?: number | null;
  };
  const shared: KinkDetail[] = [];
  const hardLimits: { name: string; who: string }[] = [];
  // Same rows as hardLimits but in KinkDetail form, so the PDF can print
  // hard limits in the same party-column table as every other section.
  const hardLimitDetails: KinkDetail[] = [];
  const softLimits: KinkDetail[] = [];
  const discuss: KinkDetail[] = [];

  const EMPTY: KinkEntry = { status: null, comment: "" };

  for (const kink of KINKS) {
    const entryA = profileA.entries[kink.id] ?? EMPTY;
    const entryB = profileB.entries[kink.id] ?? EMPTY;
    const hasA = entryA.status;
    const hasB = entryB.status;
    if (!hasA && !hasB) continue;
    const detail: KinkDetail = {
      name: kink.name,
      statusA: entryA.status, statusB: entryB.status,
      commentA: entryA.comment || undefined,
      commentB: entryB.comment || undefined,
      desireA: entryA.desire ?? null,
      desireB: entryB.desire ?? null,
    };
    if (isHardLimit(entryA, entryB)) {
      const aHard = entryA.status === "hard_no";
      const bHard = entryB.status === "hard_no";
      const who = aHard && bHard ? "beiden" : aHard ? profileA.name : profileB.name;
      hardLimits.push({ name: kink.name, who });
      hardLimitDetails.push(detail);
    } else if (isKinkMatch(entryA, entryB)) {
      shared.push(detail);
    } else if (kinkMatchScore(entryA, entryB).kind === "soft") {
      softLimits.push(detail);
    } else if (hasA && hasB) {
      discuss.push(detail);
    }
  }

  // Custom kinks
  const customShared: KinkDetail[] = [];
  const allCustom = [
    ...(profileA.customKinks ?? []).map((k) => ({ ...k, side: "a" as const })),
    ...(profileB.customKinks ?? []).map((k) => ({ ...k, side: "b" as const })),
  ];
  const customMerged = new Map<string, { name: string; aId?: string; bId?: string }>();
  for (const ck of allCustom) {
    const key = ck.name.trim().toLowerCase();
    const ex = customMerged.get(key) ?? { name: ck.name };
    customMerged.set(key, ck.side === "a" ? { ...ex, aId: ck.id } : { ...ex, bId: ck.id });
  }
  for (const item of customMerged.values()) {
    const entryA = item.aId ? (profileA.entries[item.aId] ?? EMPTY) : EMPTY;
    const entryB = item.bId ? (profileB.entries[item.bId] ?? EMPTY) : EMPTY;
    const hasA = entryA.status;
    const hasB = entryB.status;
    const detail: KinkDetail = {
      name: item.name,
      statusA: entryA.status, statusB: entryB.status,
      commentA: entryA.comment || undefined,
      commentB: entryB.comment || undefined,
    };
    if (isKinkMatch(entryA, entryB)) customShared.push(detail);
    else if (hasA || hasB) discuss.push(detail);
  }

  // Every section lists its rows in the house hierarchy — the keenest
  // pair first (Heel graag > Ja > Misschien > Voor hen > Harde grens),
  // alphabetical within equals. Order reflects choices, not KINKS order.
  const byChoice = (a: KinkDetail, b: KinkDetail) =>
    statusPairRank(a.statusA, a.statusB) - statusPairRank(b.statusA, b.statusB) ||
    a.name.localeCompare(b.name, "nl");
  const sharedAll = [...shared, ...customShared].sort(byChoice);
  softLimits.sort(byChoice);
  discuss.sort(byChoice);
  hardLimitDetails.sort(byChoice);
  // Keep the on-screen hard-limit chips marching in the same order as
  // the PDF's detail rows.
  const hardOrder = new Map(hardLimitDetails.map((d, i) => [d.name, i]));
  hardLimits.sort((a, b) => (hardOrder.get(a.name) ?? 0) - (hardOrder.get(b.name) ?? 0));

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

  function handleConfirm() {
    if (!profileA || !profileB) return;
    if (!signedA || !signedB) {
      showToast({ message: "Beide partijen moeten tekenen voordat dit verbond gebonden is." });
      return;
    }
    if ((trimmedRealNameA.length > 0) !== (trimmedRealNameB.length > 0)) {
      showToast({ message: "Vul de echte naam van beide partijen in, of laat ze beide leeg." });
      return;
    }
    saveContract({
      date: Date.now(),
      profileAId: aId,
      profileBId: bId,
      profileAName: profileA.name,
      profileBName: profileB.name,
      matchCount: shared.length + customShared.length,
      hardLimitCount: hardLimits.length,
      softLimitCount: softLimits.length,
      discussCount: discuss.length,
      safeword: signalsA.black || signalsB.black || undefined,
    });
    showToast({ message: "Contract bevestigd — dit verbond is aangegaan!", variant: "success" });
  }

  async function handleGeneratePDF() {
    if (!profileA || !profileB) return;
    if (!signedA || !signedB) {
      showToast({ message: "Beide partijen moeten tekenen voordat dit verbond gebonden is." });
      return;
    }
    if ((trimmedRealNameA.length > 0) !== (trimmedRealNameB.length > 0)) {
      showToast({ message: "Vul de echte naam van beide partijen in, of laat ze beide leeg." });
      return;
    }
    setCeremony(true);
    await new Promise((resolve) => setTimeout(resolve, 2200));
    setCeremony(false);
    setGenerating(true);
    try {
      // Everything between "new jsPDF" and the footers lives in
      // lib/contractPdf now — a pure move; the page only gathers inputs,
      // saves the file and books the snapshot.
      const { doc, filename } = await buildContractPdf({
        profileA: { name: profileA.name, role: profileA.role },
        profileB: { name: profileB.name, role: profileB.role },
        preamble,
        today,
        signalsA,
        signalsB,
        aftercareA,
        aftercareB,
        sharedAll: sharedAll as KinkDetailItem[],
        softLimits: softLimits as KinkDetailItem[],
        hardLimitDetails: hardLimitDetails as KinkDetailItem[],
        discuss: discuss as KinkDetailItem[],
        sigDataA: canvasARef.current?.toDataURL("image/png") ?? null,
        sigDataB: canvasBRef.current?.toDataURL("image/png") ?? null,
        sigLabelA: useRealNames ? `${trimmedRealNameA} (${profileA.name})` : profileA.name,
        sigLabelB: useRealNames ? `${trimmedRealNameB} (${profileB.name})` : profileB.name,
      });

      try { doc.save(filename); } catch { /* PDF-fout is niet fataal */ }

      saveContract({
        date: Date.now(),
        profileAId: aId,
        profileBId: bId,
        profileAName: profileA.name,
        profileBName: profileB.name,
        matchCount: shared.length + customShared.length,
        hardLimitCount: hardLimits.length,
        softLimitCount: softLimits.length,
        discussCount: discuss.length,
        safeword: signalsA.black || signalsB.black || undefined,
      });
    } finally {
      setGenerating(false);
    }
  }

  const COLOUR_A = "var(--accent)";
  const COLOUR_B = "var(--accent2)";

  function toggleAftercareA(option: string) {
    setAftercareA((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  }

  function toggleAftercareB(option: string) {
    setAftercareB((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  }

  return (
    <>
    <PageShell width="3xl" className="contract-print">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap print:hidden">
        <Link href={`/compare?a=${aId}&b=${bId}`} className="focus-ring text-sm transition-colors min-h-[44px] inline-flex items-center pr-2" style={{ color: "var(--text2)" }}>
          <ArrowRight size={16} className="mr-1 rotate-180" aria-hidden="true" />
          Terug
        </Link>
        <h1 className="text-xl font-bold flex-1">Teken het contract</h1>
      </div>

      {/* Contract body */}
      <div
        className="rounded-2xl p-6 mb-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border-accent)" }}
      >
        {/* Title block */}
        <div className="text-center mb-6">
          <h2
            className="text-2xl font-bold mb-1"
            style={{ background: "linear-gradient(90deg, var(--accent), var(--accent2))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            KinkSync Contract
          </h2>
          <p className="text-sm" style={{ color: "var(--text2)" }}>
            <span style={{ color: COLOUR_A }}>{profileA.name}</span>
            <span className="mx-2" style={{ color: "var(--text2)" }}>&</span>
            <span style={{ color: COLOUR_B }}>{profileB.name}</span>
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text2)" }}>Opgesteld op {today}</p>
        </div>

        {/* Preamble */}
        <div className="mb-6" style={{ borderLeft: "3px solid var(--border-accent)", paddingLeft: "1rem" }}>
          <p className="text-sm italic leading-relaxed print:hidden" style={{ color: "var(--text2)" }}>
            {preambleOpen ? preamble : preamble.slice(0, preamble.indexOf(". ") + 1)}
          </p>
          <p className="hidden print:block text-sm italic leading-relaxed" style={{ color: "var(--text2)" }}>
            {preamble}
          </p>
          <button
            onClick={() => setPreambleOpen((v) => !v)}
            className="focus-ring text-xs mt-2 transition-colors py-2 px-3 inline-flex items-center gap-1"
            style={{ color: "var(--accent)" }}
          >
            {preambleOpen ? (<>Minder <CaretUp size={13} aria-hidden="true" /></>) : (<>Lees meer <CaretDown size={13} aria-hidden="true" /></>)}
          </button>
        </div>

        {/* Safeword & Nazorg */}
        <div className="mb-6 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          <h3 className="text-sm mb-4" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400, color: "var(--accent)" }}>
            Safeword &amp; Nazorg
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Column A */}
            <div className="flex flex-col gap-3 rounded-xl p-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <div className="text-xs font-semibold" style={{ color: COLOUR_A }}>
                {profileA.name}
              </div>
              <div className="flex flex-col gap-1.5">
                {SIGNAL_LEVELS.map((l) => (
                  <div key={l.key} className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full flex-none" style={{ background: l.color }} />
                    <span className="text-xs flex-none w-32" style={{ color: "var(--text2)" }}>{l.meaning}</span>
                    <input
                      type="text"
                      placeholder={DEFAULT_SIGNALS[l.key]}
                      value={signalsA[l.key]}
                      onChange={(e) => setSignalsA((s) => ({ ...s, [l.key]: e.target.value }))}
                      className="flex-1 text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 min-w-0"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                      aria-label={`${l.meaning} signaalwoord voor ${profileA.name}`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {AFTERCARE_OPTIONS.map((option) => {
                  const active = aftercareA.includes(option);
                  return (
                    <button
                      key={option}
                      onClick={() => toggleAftercareA(option)}
                      className="text-xs px-2 py-1 rounded-full border transition-all focus-ring"
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

            {/* Column B */}
            <div className="flex flex-col gap-3 rounded-xl p-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <div className="text-xs font-semibold" style={{ color: COLOUR_B }}>
                {profileB.name}
              </div>
              <div className="flex flex-col gap-1.5">
                {SIGNAL_LEVELS.map((l) => (
                  <div key={l.key} className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full flex-none" style={{ background: l.color }} />
                    <span className="text-xs flex-none w-32" style={{ color: "var(--text2)" }}>{l.meaning}</span>
                    <input
                      type="text"
                      placeholder={DEFAULT_SIGNALS[l.key]}
                      value={signalsB[l.key]}
                      onChange={(e) => setSignalsB((s) => ({ ...s, [l.key]: e.target.value }))}
                      className="flex-1 text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 min-w-0"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                      aria-label={`${l.meaning} signaalwoord voor ${profileB.name}`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {AFTERCARE_OPTIONS.map((option) => {
                  const active = aftercareB.includes(option);
                  return (
                    <button
                      key={option}
                      onClick={() => toggleAftercareB(option)}
                      className="text-xs px-2 py-1 rounded-full border transition-all focus-ring"
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
          </div>
        </div>

        <ContractSection title="Gedeelde verlangens" items={sharedAll} colour="var(--yes)" nameA={profileA.name} nameB={profileB.name} colourA={COLOUR_A} colourB={COLOUR_B} />
        <ContractSection title="Zachte grenzen" items={softLimits} colour="var(--maybe)" nameA={profileA.name} nameB={profileB.name} colourA={COLOUR_A} colourB={COLOUR_B} />
        <ContractSection
          title="Harde grenzen"
          items={hardLimits.map((h) => ({ text: h.name, tag: h.who }))}
          colour="var(--hard-no)"
        />
        <ContractSection title="Bespreking nodig" items={discuss} colour="var(--willing)" nameA={profileA.name} nameB={profileB.name} colourA={COLOUR_A} colourB={COLOUR_B} />

        {/* General clauses */}
        <div className="mt-6 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          <h3 className="text-sm mb-3" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400, color: "var(--accent)" }}>
            Algemene afspraken
          </h3>
          <ul className="space-y-1.5 text-sm" style={{ color: "var(--text2)" }}>
            <li><span className="inline-block w-3 h-3 rounded-full align-middle mr-2 flex-none" style={{ background: "var(--hard-no)" }} />Safeword stopt alles — altijd en zonder uitleg.</li>
            <li><span className="inline-block w-3 h-3 rounded-full align-middle mr-2 flex-none" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />Aftercare is geen optie, maar een afspraak.</li>
            <li><span className="inline-block w-3 h-3 rounded-full align-middle mr-2 flex-none" style={{ background: "var(--willing)" }} />Dit contract kan op elk moment door beiden worden herzien.</li>
            <li><span className="inline-block w-3 h-3 rounded-full align-middle mr-2 flex-none" style={{ background: "var(--maybe)" }} />Grenzen die hier niet staan, worden voor elke scène besproken.</li>
            <li><span className="inline-block w-3 h-3 rounded-full align-middle mr-2 flex-none" style={{ background: "var(--accent2)" }} />Dit contract kan door beide partijen ten alle tijden verbroken worden zonder toestemming van de ander.</li>
          </ul>
        </div>
      </div>

      {/* Echte namen (optioneel) */}
      <div
        className="rounded-2xl p-6 mb-6 print:hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-sm mb-1" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400, color: "var(--accent)" }}>
          Echte namen <span style={{ opacity: 0.6, fontStyle: "normal" }}>(optioneel)</span>
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--text2)" }}>
          Beide velden samen invullen of beide leeg laten. Bij invullen wordt het verbond formeler geformuleerd en verschijnen de echte namen naast de nicknames onder de handtekening.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium" style={{ color: COLOUR_A }}>
              Echte naam van {profileA.name}
            </span>
            <input
              value={realNameA}
              onChange={(e) => setRealNameA(e.target.value)}
              placeholder="Voor- en achternaam…"
              autoComplete="off"
              className="focus-ring w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none placeholder-[color:var(--text2)]"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium" style={{ color: COLOUR_B }}>
              Echte naam van {profileB.name}
            </span>
            <input
              value={realNameB}
              onChange={(e) => setRealNameB(e.target.value)}
              placeholder="Voor- en achternaam…"
              autoComplete="off"
              className="focus-ring w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none placeholder-[color:var(--text2)]"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => setWhyOpen(true)}
          className="focus-ring text-xs mt-3 inline-flex items-center gap-1 transition-colors min-h-[36px]"
          style={{ color: "var(--accent)" }}
        >
          Waarom een echte naam toevoegen? <ArrowRight size={13} aria-hidden="true" />
        </button>
      </div>

      {/* Signature section */}
      <div
        className="rounded-2xl p-6 mb-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-sm mb-4" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400, color: "var(--accent)" }}>
          Handtekeningen
        </h2>
        <div className="flex gap-4 flex-wrap">
          <SignaturePad label={profileA.name} colour={COLOUR_A} canvasRef={canvasARef} onSignedChange={setSignedA} />
          <SignaturePad label={profileB.name} colour={COLOUR_B} canvasRef={canvasBRef} onSignedChange={setSignedB} />
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex gap-4 print:hidden">
        <button
          onClick={handleGeneratePDF}
          disabled={generating || ceremony}
          className="focus-ring flex-1 py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}
        >
          {generating ? "Genereren…" : "Opslaan als PDF"}
        </button>
        <button
          onClick={handleConfirm}
          disabled={generating || ceremony}
          className="focus-ring flex-1 py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "var(--accent2)", color: "var(--on-accent)" }}
        >
          Contract bevestigen
        </button>
      </div>

      {/* Eerdere contracten */}
      {contracts.length > 0 && (
        <div className="mt-8 print:hidden">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400, color: "var(--accent)" }}>
              Eerdere contracten
            </h2>
            <Link
              href={`/timeline?a=${aId}&b=${bId}`}
              className="focus-ring text-xs transition-colors inline-flex items-center gap-1"
              style={{ color: "var(--text2)" }}
            >
              <TrendUp size={12} aria-hidden="true" />
              Bekijk grafiek
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {contracts.map((c) => (
              <div
                key={c.id}
                className="rounded-xl p-4 flex items-center gap-3"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">{c.profileAName} &amp; {c.profileBName}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text2)" }}>
                    {new Date(c.date).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                    {" · "}{c.matchCount} matches · {c.hardLimitCount} grenzen
                  </div>
                </div>
                {pendingDeleteId === c.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: "var(--text2)" }}>Zeker?</span>
                    <button
                      onClick={() => { deleteContract(c.id); setPendingDeleteId(null); }}
                      className="focus-ring text-xs px-2 py-1 rounded-lg font-semibold"
                      style={{ background: "var(--hard-no)", color: "var(--on-accent)" }}
                    >
                      Ja
                    </button>
                    <button
                      onClick={() => setPendingDeleteId(null)}
                      className="focus-ring text-xs px-2 py-1 rounded-lg"
                      style={{ background: "var(--surface2)", color: "var(--text2)" }}
                    >
                      Nee
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {c.profileAId && c.profileBId && (
                      <Link
                        href={`/contract?a=${c.profileAId}&b=${c.profileBId}`}
                        className="focus-ring text-xs px-3 py-1.5 rounded-lg transition-colors"
                        style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}
                      >
                        Bekijk
                      </Link>
                    )}
                    <button
                      onClick={() => setPendingDeleteId(c.id)}
                      aria-label="Contract verwijderen"
                      className="focus-ring p-2 rounded-lg"
                      style={{ color: "var(--text2)" }}
                    >
                      <Trash size={15} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </PageShell>
    <AnimatePresence>
      {whyOpen && (
        <motion.div
          key="why-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={() => setWhyOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 220,
            background: "rgba(0,0,0,0.65)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1rem",
            paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
          }}
        >
          <motion.div
            key="why-panel"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Waarom echte namen toevoegen"
            style={{
              background: "var(--surface)",
              borderRadius: "1rem",
              padding: "1.5rem",
              width: "100%",
              maxWidth: "480px",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
                Waarom echte namen?
              </span>
              <button
                onClick={() => setWhyOpen(false)}
                className="focus-ring p-1 rounded-full"
                style={{ color: "var(--text2)" }}
                aria-label="Sluiten"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>
            <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text)" }}>
              Een nickname kan prima zijn voor een persoonlijk verbond. Een echte naam maakt
              alleen duidelijker wie dit document heeft ondertekend.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
              Dat kan belangrijk zijn als je later discussie wilt vermijden over identiteit,
              instemming of afspraken. Het maakt het document dus helderder en meestal ook
              sterker.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    {ceremony && (
      <>
        <style>{`
            @keyframes ceremony-bg {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes ceremony-text {
              0%   { opacity: 0; transform: translateY(12px) scale(0.95); }
              30%  { opacity: 1; transform: translateY(0) scale(1); }
              80%  { opacity: 1; transform: translateY(0) scale(1); }
              100% { opacity: 0; transform: translateY(-8px) scale(1.02); }
            }
            @keyframes ceremony-sub {
              0%, 15% { opacity: 0; transform: translateY(8px); }
              40%     { opacity: 1; transform: translateY(0); }
              80%     { opacity: 1; transform: translateY(0); }
              100%    { opacity: 0; }
            }
            @keyframes ceremony-glow {
              0%, 100% { box-shadow: 0 0 60px color-mix(in srgb, var(--accent) 10%, transparent); }
              50%      { box-shadow: 0 0 120px color-mix(in srgb, var(--accent) 30%, transparent); }
            }
          `}</style>
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(10,10,15,0.97)",
              animation: "ceremony-bg 0.3s ease forwards",
            }}
          >
            <div style={{ textAlign: "center", maxWidth: "20rem", padding: "0 1.5rem" }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  margin: "0 auto 2rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 15%, transparent), color-mix(in srgb, var(--accent2) 15%, transparent))",
                  border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
                  animation: "ceremony-glow 2s ease infinite",
                  fontSize: "1.875rem",
                }}
              >
                <Heart size={30} weight="fill" aria-hidden="true" style={{ color: "var(--accent)" }} />
              </div>
              <p
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 600,
                  color: "var(--text)",
                  letterSpacing: "0.02em",
                  animation: "ceremony-text 2.2s ease forwards",
                  margin: 0,
                }}
              >
                Contract ondertekend.
              </p>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "color-mix(in srgb, var(--accent) 70%, transparent)",
                  marginTop: "0.75rem",
                  animation: "ceremony-sub 2.2s ease forwards",
                }}
              >
                De woorden die het verbond dragen.
              </p>
            </div>
          </div>
        </>
      )}
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
