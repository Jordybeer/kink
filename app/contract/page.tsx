"use client";
import { Suspense, useRef, useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useStore, useHasHydrated } from "@/lib/store";
import { KINKS } from "@/lib/kinks";
import type { KinkStatus } from "@/types";

function isMatch(a: KinkStatus, b: KinkStatus) {
  return !!a && !!b && (a === "yes" || a === "willing") && (b === "yes" || b === "willing");
}
function isHardLimit(a: KinkStatus, b: KinkStatus) {
  return a === "hard_no" || b === "hard_no";
}

const STATUS_NL: Record<NonNullable<KinkStatus>, string> = {
  yes:     "Heel graag",
  willing: "Interesse",
  maybe:   "Voor hen",
  no:      "Liever niet",
  hard_no: "Harde grens",
};

function useDrawCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#c084fc";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const getPos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onDown = (e: PointerEvent) => {
      drawing.current = true;
      canvas.setPointerCapture(e.pointerId);
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };
    const onMove = (e: PointerEvent) => {
      if (!drawing.current) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };
    const onUp = () => { drawing.current = false; };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [canvasRef]);
}


const AFTERCARE_OPTIONS = ["Knuffelen", "Verbaal", "Eten & drinken", "Alleen tijd", "Journaling"];

type SignalKey = "green" | "yellow" | "red" | "black";
type Signals = Record<SignalKey, string>;
const SIGNAL_LEVELS: { key: SignalKey; color: string; meaning: string }[] = [
  { key: "green",  color: "#22c55e", meaning: "Meer / harder" },
  { key: "yellow", color: "#f59e0b", meaning: "Vertraag / check in" },
  { key: "red",    color: "#ef4444", meaning: "Stop dit" },
  { key: "black",  color: "#6b7280", meaning: "Stop alles" },
];
const DEFAULT_SIGNALS: Signals = { green: "Meer", yellow: "Geel", red: "Rood", black: "Safeword" };

function buildPreamble(
  nameA: string,
  roleA: string,
  nameB: string,
  roleB: string,
  levelA: string,
  levelB: string
): string {
  const intro = `Dit verbond wordt gesloten tussen ${nameA} (${roleA}) en ${nameB} (${roleB}).`;

  const body = `Door dit verbond biedt ${nameA} zichzelf aan in vertrouwen, toewijding en gewillige overgave, binnen de grenzen die vrijuit zijn uitgesproken en wederzijds zijn begrepen, en ${nameB} aanvaardt die gave met eerbied, verantwoordelijkheid, beheersing en zorg. Wat hier wordt gegeven, wordt niet lichtvaardig genomen, want onderwerping is niet het verlies van het zelf, maar de bewuste daad om iemands kwetsbaarheid, vertrouwen en gehoorzaamheid in de handen te leggen van iemand die heeft gezworen zulke gaven met eer te bewaren. Autoriteit is op haar beurt geen louter voorrecht, maar een heilige plicht — om met standvastigheid te leiden, met kracht te beschermen, met intentie te bevelen, en het vertrouwen dat in hun hoede is gelegd te koesteren. Beiden begrijpen dat deze uitwisseling niet enkel rust op bezit, maar op toewijding, communicatie, verantwoordelijkheid en het stille geloof dat ieder zal eren wat is aangeboden. De één geeft, de ander ontvangt; de één geeft zich over, de ander leidt en beiden zijn verbonden door de zorg, het vertrouwen en de gekozen intimiteit die dit verbond betekenis geven. Hierin wordt macht niet slechts uitgewisseld, maar gedragen als een daad van toewijding, verantwoordelijkheid en verbondenheid tussen hen.`;

  const beginnerLevels = ["beginner"];
  const deepLevels = ["diepgaand", "ervaren"];
  const needsGuidanceClause =
    (beginnerLevels.includes(levelA) && deepLevels.includes(levelB)) ||
    (beginnerLevels.includes(levelB) && deepLevels.includes(levelA));

  const guidanceClause = needsGuidanceClause
    ? ` ${levelA === "beginner" ? nameA : nameB} brengt nieuwsgierigheid; ${levelA === "beginner" ? nameB : nameA} brengt geduld en begeleiding. Zij verplichten zich aan een tempo dat altijd in dienst staat van veiligheid en wederzijds begrip.`
    : "";

  return `${intro} ${body}${guidanceClause}`;
}

function ContractPage() {
  const searchParams = useSearchParams();
  const { profiles, saveContract, contracts, deleteContract } = useStore();
  const _hasHydrated = useHasHydrated();
  const aId = searchParams.get("a") ?? "";
  const bId = searchParams.get("b") ?? "";
  const [generating, setGenerating] = useState(false);
  const [ceremony, setCeremony] = useState(false);
  const [preambleOpen, setPreambleOpen] = useState(false);

  // Safeword & aftercare state
  const [signalsA, setSignalsA] = useState<Signals>({ ...DEFAULT_SIGNALS });
  const [signalsB, setSignalsB] = useState<Signals>({ ...DEFAULT_SIGNALS });
  const [aftercareA, setAftercareA] = useState<string[]>([]);
  const [aftercareB, setAftercareB] = useState<string[]>([]);

  const canvasARef = useRef<HTMLCanvasElement>(null);
  const canvasBRef = useRef<HTMLCanvasElement>(null);
  useDrawCanvas(canvasARef);
  useDrawCanvas(canvasBRef);

  function clearCanvas(ref: React.RefObject<HTMLCanvasElement | null>) {
    const c = ref.current;
    if (c) c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
  }

  if (!_hasHydrated) return null;

  const profileA = profiles.find((p) => p.id === aId);
  const profileB = profiles.find((p) => p.id === bId);

  if (!profileA || !profileB) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="mb-4" style={{ color: "var(--text2)" }}>Geen twee profielen geselecteerd.</p>
        <Link href="/compare" className="focus-ring text-sm py-2 inline-block" style={{ color: "var(--accent)" }}>← Terug naar vergelijking</Link>
      </main>
    );
  }

  const shared: string[] = [];
  const hardLimits: { name: string; who: string }[] = [];
  const softLimits: string[] = [];
  const discuss: string[] = [];

  for (const kink of KINKS) {
    const a = profileA.entries[kink.id]?.status ?? null;
    const b = profileB.entries[kink.id]?.status ?? null;
    if (!a && !b) continue;
    if (isHardLimit(a, b)) {
      const who = a === "hard_no" && b === "hard_no" ? "beiden" : a === "hard_no" ? profileA.name : profileB.name;
      hardLimits.push({ name: kink.name, who });
    } else if (isMatch(a, b)) {
      shared.push(kink.name);
    } else if (a === "no" || b === "no") {
      softLimits.push(kink.name);
    } else if (a && b) {
      discuss.push(kink.name);
    }
  }

  // Custom kinks
  const customShared: string[] = [];
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
    const a = item.aId ? (profileA.entries[item.aId]?.status ?? null) : null;
    const b = item.bId ? (profileB.entries[item.bId]?.status ?? null) : null;
    if (isMatch(a, b)) customShared.push(item.name);
    else if (a || b) discuss.push(item.name);
  }

  const today = new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });

  const preamble = buildPreamble(
    profileA.name, profileA.role,
    profileB.name, profileB.role,
    profileA.experienceLevel, profileB.experienceLevel
  );

  async function handleGeneratePDF() {
    if (!profileA || !profileB) return;
    setCeremony(true);
    await new Promise((resolve) => setTimeout(resolve, 2200));
    setCeremony(false);
    setGenerating(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const W = 210;
      const margin = 20;
      const lineW = W - margin * 2;
      let y = 20;

      const accent = [192, 132, 252] as [number, number, number];
      const dark = [20, 18, 28] as [number, number, number];
      const muted = [120, 110, 160] as [number, number, number];

      // Background
      doc.setFillColor(...dark);
      doc.rect(0, 0, W, 297, "F");

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(...accent);
      doc.text("KinkSync Contract", W / 2, y, { align: "center" });
      y += 7;

      // Subtitle
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...muted);
      doc.text("kinksync.be", W / 2, y, { align: "center" });
      y += 5;

      doc.setFontSize(10);
      doc.text(`${profileA.name} (${profileA.role}) & ${profileB.name} (${profileB.role})`, W / 2, y, { align: "center" });
      y += 5;
      doc.text(`Opgesteld op ${today}`, W / 2, y, { align: "center" });
      y += 8;

      // Divider
      doc.setDrawColor(...accent);
      doc.setLineWidth(0.4);
      doc.line(margin, y, W - margin, y);
      y += 6;

      // Preamble — paginate line by line so long text can't overflow the page
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(...muted);
      const pLines = doc.splitTextToSize(preamble, lineW) as string[];
      for (const line of pLines) {
        if (y > 272) { doc.addPage(); doc.setFillColor(...dark); doc.rect(0, 0, W, 297, "F"); y = 20; doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(...muted); }
        doc.text(line, margin, y);
        y += 4.5;
      }
      y += 4;

      // Safeword & Nazorg section in PDF
      const hasSignalData = (s: Signals) => SIGNAL_LEVELS.some((l) => s[l.key] !== DEFAULT_SIGNALS[l.key] && s[l.key].trim());
      const hasSafewordData = hasSignalData(signalsA) || hasSignalData(signalsB) || aftercareA.length > 0 || aftercareB.length > 0;
      if (hasSafewordData) {
        if (y > 250) { doc.addPage(); doc.setFillColor(...dark); doc.rect(0, 0, W, 297, "F"); y = 20; }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...accent);
        doc.text("Signalen & Nazorg", margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(220, 215, 240);

        for (const [signals, profile] of [[signalsA, profileA], [signalsB, profileB]] as const) {
          for (const l of SIGNAL_LEVELS) {
            const word = signals[l.key].trim() || DEFAULT_SIGNALS[l.key];
            doc.text(`${l.meaning} (${profile.name}): "${word}"`, margin + 3, y); y += 4.5;
          }
        }
        if (aftercareA.length) { doc.text(`Nazorg ${profileA.name}: ${aftercareA.join(", ")}`, margin + 3, y); y += 4.5; }
        if (aftercareB.length) { doc.text(`Nazorg ${profileB.name}: ${aftercareB.join(", ")}`, margin + 3, y); y += 4.5; }
        y += 3;
      }

      const itemLabel = (item: ContractItem) =>
        typeof item === "string" ? item : `${item.text} (${item.tag})`;

      const section = (title: string, items: ContractItem[], colour: [number, number, number]) => {
        if (!items.length) return;
        const colW = (lineW - 10) / 2;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...colour);
        doc.text(title, margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(220, 215, 240);
        let i = 0;
        while (i < items.length) {
          const leftText = `• ${itemLabel(items[i])}`;
          const rightItem = items[i + 1];
          const rightText = rightItem !== undefined ? `• ${itemLabel(rightItem)}` : null;
          const leftLines = doc.splitTextToSize(leftText, colW - 4) as string[];
          const rightLines = rightText ? doc.splitTextToSize(rightText, colW - 4) as string[] : [];
          const rowH = Math.max(leftLines.length, rightLines.length) * 4.5;
          if (y + rowH > 262) { doc.addPage(); doc.setFillColor(...dark); doc.rect(0, 0, W, 297, "F"); y = 20; doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(220, 215, 240); }
          leftLines.forEach((line, li) => doc.text(line, margin + 3, y + li * 4.5));
          rightLines.forEach((line, li) => doc.text(line, margin + colW + 10 + 3, y + li * 4.5));
          y += rowH;
          i += rightText !== null ? 2 : 1;
        }
        y += 3;
      };

      section("Gedeelde verlangens", [...shared, ...customShared], [74, 222, 128]);
      section("Harde grenzen", hardLimits.map((h) => ({ text: h.name, tag: h.who })), [239, 68, 68]);
      section("Zachte grenzen", softLimits, [251, 191, 36]);
      section("Bespreking nodig", discuss, [96, 165, 250]);

      // Safeword clause
      if (y > 240) { doc.addPage(); doc.setFillColor(...dark); doc.rect(0, 0, W, 297, "F"); y = 20; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...accent);
      doc.text("Algemene afspraken", margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(220, 215, 240);
      const clauses = [
        "Safeword stopt alles — altijd en zonder uitleg.",
        "Aftercare is geen optie, maar een afspraak.",
        "Dit contract kan op elk moment door beiden worden herzien.",
        "Grenzen die hier niet staan, worden voor elke scène besproken.",
        "Dit contract kan door beide partijen ten alle tijden verbroken worden zonder toestemming van de ander.",
      ];
      for (const c of clauses) {
        doc.text(`• ${c}`, margin + 3, y);
        y += 4.5;
      }
      y += 6;

      // Signatures
      if (y > 220) { doc.addPage(); doc.setFillColor(...dark); doc.rect(0, 0, W, 297, "F"); y = 20; }
      doc.setDrawColor(...accent);
      doc.setLineWidth(0.4);
      doc.line(margin, y, W - margin, y);
      y += 6;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...accent);
      doc.text("Handtekeningen", margin, y);
      y += 6;

      const sigW = (lineW - 10) / 2;
      const sigH = 30;

      const sigDataA = canvasARef.current?.toDataURL("image/png") ?? null;
      const sigDataB = canvasBRef.current?.toDataURL("image/png") ?? null;

      doc.setDrawColor(...muted);
      doc.setLineWidth(0.3);
      doc.rect(margin, y, sigW, sigH);
      doc.rect(margin + sigW + 10, y, sigW, sigH);

      if (sigDataA) doc.addImage(sigDataA, "PNG", margin + 1, y + 1, sigW - 2, sigH - 2);
      if (sigDataB) doc.addImage(sigDataB, "PNG", margin + sigW + 11, y + 1, sigW - 2, sigH - 2);

      y += sigH + 3;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...muted);
      doc.text(profileA.name, margin + sigW / 2, y, { align: "center" });
      doc.text(profileB.name, margin + sigW + 10 + sigW / 2, y, { align: "center" });
      y += 4;
      doc.text(today, margin + sigW / 2, y, { align: "center" });
      doc.text(today, margin + sigW + 10 + sigW / 2, y, { align: "center" });

      doc.save(`contract-${profileA.name}-${profileB.name}.pdf`);

      saveContract({
        date: Date.now(),
        profileAName: profileA.name,
        profileBName: profileB.name,
        matchCount: shared.length + customShared.length,
        hardLimitCount: hardLimits.length,
        softLimitCount: softLimits.length,
        discussCount: discuss.length,
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
    <main className="max-w-3xl mx-auto px-4 py-6 w-full pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href={`/compare?a=${aId}&b=${bId}`} className="focus-ring text-sm transition-colors py-2 pr-2" style={{ color: "var(--text2)" }}>
          ← Terug
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
          <p className="text-sm italic leading-relaxed" style={{ color: "var(--text2)" }}>
            {preambleOpen ? preamble : preamble.slice(0, preamble.indexOf(". ") + 1)}
          </p>
          <button
            onClick={() => setPreambleOpen((v) => !v)}
            className="focus-ring text-xs mt-2 transition-colors py-2 px-1 inline-block"
            style={{ color: "var(--accent)" }}
          >
            {preambleOpen ? "Minder ↑" : "Lees meer ↓"}
          </button>
        </div>

        {/* Safeword & Nazorg */}
        <div className="mb-6 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--accent)" }}>
            Safeword &amp; Nazorg
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Column A */}
            <div className="flex flex-col gap-3 rounded-xl p-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLOUR_A }}>
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
                      style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
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
                        background: active ? "color-mix(in srgb, #22c55e 20%, transparent)" : "transparent",
                        borderColor: active ? "#22c55e" : "var(--border)",
                        color: active ? "#22c55e" : "var(--text2)",
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
              <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLOUR_B }}>
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
                      style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
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
                        background: active ? "color-mix(in srgb, #22c55e 20%, transparent)" : "transparent",
                        borderColor: active ? "#22c55e" : "var(--border)",
                        color: active ? "#22c55e" : "var(--text2)",
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

        <ContractSection title="Gedeelde verlangens" items={[...shared, ...customShared]} colour="var(--yes)" />
        <ContractSection
          title="Harde grenzen"
          items={hardLimits.map((h) => ({ text: h.name, tag: h.who }))}
          colour="var(--hard-no)"
        />
        <ContractSection title="Zachte grenzen" items={softLimits} colour="var(--maybe)" />
        <ContractSection title="Bespreking nodig" items={discuss} colour="var(--willing)" />

        {/* General clauses */}
        <div className="mt-6 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--accent)" }}>
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

      {/* Signature section */}
      <div
        className="rounded-2xl p-6 mb-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "var(--accent)" }}>
          Handtekeningen
        </h2>
        <div className="flex gap-4 flex-wrap">
          <SignaturePad label={profileA.name} colour={COLOUR_A} canvasRef={canvasARef} />
          <SignaturePad label={profileB.name} colour={COLOUR_B} canvasRef={canvasBRef} />
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex gap-3">
        <button
          onClick={handleGeneratePDF}
          disabled={generating || ceremony}
          className="focus-ring flex-1 py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          {generating ? "Genereren…" : "↓ Opslaan / Afdrukken"}
        </button>
      </div>

      {/* Eerdere contracten */}
      {contracts.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--accent)" }}>
            Eerdere contracten
          </h2>
          <div className="flex flex-col gap-2 mt-3">
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
                <button
                  onClick={() => deleteContract(c.id)}
                  aria-label="Contract verwijderen"
                  className="focus-ring p-2 rounded-lg text-sm"
                  style={{ color: "var(--text2)" }}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
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
              0%, 100% { box-shadow: 0 0 60px rgba(192,132,252,0.1); }
              50%      { box-shadow: 0 0 120px rgba(192,132,252,0.3); }
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
                  background: "linear-gradient(135deg, rgba(192,132,252,0.15), rgba(244,114,182,0.15))",
                  border: "1px solid rgba(192,132,252,0.3)",
                  animation: "ceremony-glow 2s ease infinite",
                  fontSize: "1.875rem",
                }}
              >
                🖤
              </div>
              <p
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 600,
                  color: "#ffffff",
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
                  color: "rgba(192,132,252,0.7)",
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

type ContractItem = string | { text: string; tag: string };

function ContractSection({ title, items, colour }: { title: string; items: ContractItem[]; colour: string }) {
  if (!items.length) return null;
  return (
    <div className="mb-5">
      <h3 className="text-sm font-semibold mb-2" style={{ color: colour }}>
        {title}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span
            key={i}
            className="text-xs px-2.5 py-1 rounded-full"
            style={{
              background: `color-mix(in srgb, ${colour} 12%, transparent)`,
              color: colour,
              border: `1px solid color-mix(in srgb, ${colour} 30%, transparent)`,
            }}
          >
            {typeof item === "string" ? item : (
              <>{item.text} <span style={{ opacity: 0.65 }}>{item.tag}</span></>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

function SignaturePad({
  label,
  colour,
  canvasRef,
}: {
  label: string;
  colour: string;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}) {
  const [expanded, setExpanded] = useState(false);
  useDrawCanvas(canvasRef);

  function clear() {
    const c = canvasRef.current;
    if (c) c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
  }

  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-[140px]">
      <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: colour }}>
        {label}
      </div>
      <canvas
        ref={canvasRef}
        width={320}
        className="w-full rounded-xl touch-none"
        style={{
          border: `1px solid ${colour}`,
          background: "var(--surface2)",
          cursor: "crosshair",
          display: "block",
          height: expanded ? "200px" : "120px",
          transition: "height 300ms ease",
        }}
        aria-label={`Handtekening voor ${label}`}
      />
      <div className="flex items-center gap-2">
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Verklein handtekeningveld" : "Vergroot handtekeningveld"}
          className="focus-ring p-1 rounded-full border transition-colors"
          style={{ color: "var(--text2)", borderColor: "var(--border)" }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <button
          onClick={clear}
          className="focus-ring text-xs px-3 py-1 rounded-full border transition-colors"
          style={{ color: "var(--text2)", borderColor: "var(--border)" }}
        >
          Wis
        </button>
      </div>
      <div className="text-xs text-center" style={{ color: "var(--text2)" }}>
        Teken hier met vinger of muis
      </div>
    </div>
  );
}

export default function ContractSuspense() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm" style={{ color: "var(--text2)" }}>Laden…</div>}>
      <ContractPage />
    </Suspense>
  );
}
