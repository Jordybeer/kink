"use client";
import { Suspense, useRef, useState, useEffect, useCallback } from "react";
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

  const getPos = (e: PointerEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.strokeStyle = "#c084fc";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const onDown = (e: PointerEvent) => {
      drawing.current = true;
      canvas.setPointerCapture(e.pointerId);
      const { x, y } = getPos(e, canvas);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };
    const onMove = (e: PointerEvent) => {
      if (!drawing.current) return;
      const { x, y } = getPos(e, canvas);
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

function SignatureCanvas({ label, colour }: { label: string; colour: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useDrawCanvas(canvasRef);

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
  }

  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-[140px]">
      <div
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: colour }}
      >
        {label}
      </div>
      <canvas
        ref={canvasRef}
        width={280}
        height={120}
        className="sig-canvas w-full rounded-xl touch-none"
        style={{ border: `1px solid ${colour}`, background: "var(--surface2)", cursor: "crosshair" }}
        aria-label={`Handtekening voor ${label}`}
      />
      <button
        onClick={clear}
        className="focus-ring text-xs px-3 py-1 rounded-full border transition-colors"
        style={{ color: "var(--text2)", borderColor: "var(--border)" }}
      >
        Wis
      </button>
    </div>
  );
}

function ContractPage() {
  const searchParams = useSearchParams();
  const { profiles } = useStore();
  const _hasHydrated = useHasHydrated();
  const aId = searchParams.get("a") ?? "";
  const bId = searchParams.get("b") ?? "";
  const [generating, setGenerating] = useState(false);

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
        <Link href="/compare" className="focus-ring text-sm" style={{ color: "var(--accent)" }}>← Terug naar vergelijking</Link>
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

  async function handleGeneratePDF() {
    if (!profileA || !profileB) return;
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
      doc.text("KinkList Contract", W / 2, y, { align: "center" });
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...muted);
      doc.text(`${profileA.name} (${profileA.role}) & ${profileB.name} (${profileB.role})`, W / 2, y, { align: "center" });
      y += 5;
      doc.text(`Opgesteld op ${today}`, W / 2, y, { align: "center" });
      y += 8;

      // Divider
      doc.setDrawColor(...accent);
      doc.setLineWidth(0.4);
      doc.line(margin, y, W - margin, y);
      y += 6;

      // Preamble
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(...muted);
      const preamble = `Door dit verbond biedt de één zichzelf aan in vertrouwen, toewijding en gewillige overgave, binnen de grenzen die vrijuit zijn uitgesproken en wederzijds zijn begrepen, en de ander aanvaardt die gave met eerbied, verantwoordelijkheid, beheersing en zorg. Wat hier wordt gegeven, wordt niet lichtvaardig genomen, want onderwerping is niet het verlies van het zelf, maar de bewuste daad om iemands kwetsbaarheid, vertrouwen en gehoorzaamheid in de handen te leggen van iemand die heeft gezworen zulke gaven met eer te bewaren. Autoriteit is op haar beurt geen louter voorrecht, maar een heilige plicht — om met standvastigheid te leiden, met kracht te beschermen, met intentie te bevelen, en het vertrouwen dat in hun hoede is gelegd te koesteren. Beiden begrijpen dat deze uitwisseling niet enkel rust op bezit, maar op toewijding, communicatie, verantwoordelijkheid en het stille geloof dat ieder zal eren wat is aangeboden. De één geeft, de ander ontvangt; de één geeft zich over, de ander leidt en beiden zijn verbonden door de zorg, het vertrouwen en de gekozen intimiteit die dit verbond betekenis geven. Hierin wordt macht niet slechts uitgewisseld, maar gedragen als een daad van toewijding, verantwoordelijkheid en verbondenheid tussen hen.`;
      const pLines = doc.splitTextToSize(preamble, lineW);
      doc.text(pLines, margin, y);
      y += pLines.length * 4.5 + 4;

      const section = (title: string, items: string[], colour: [number, number, number]) => {
        if (!items.length) return;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...colour);
        doc.text(title, margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(220, 215, 240);
        for (const item of items) {
          if (y > 260) { doc.addPage(); doc.setFillColor(...dark); doc.rect(0, 0, W, 297, "F"); y = 20; }
          doc.text(`• ${item}`, margin + 3, y);
          y += 4.5;
        }
        y += 3;
      };

      section("Gedeelde verlangens", [...shared, ...customShared], [74, 222, 128]);
      section("Harde grenzen", hardLimits.map((h) => `${h.name} (${h.who})`), [239, 68, 68]);
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

      // Signature canvases → images
      const sigDataA = canvasARef.current?.toDataURL("image/png") ?? null;
      const sigDataB = canvasBRef.current?.toDataURL("image/png") ?? null;

      // Boxes
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
    } finally {
      setGenerating(false);
    }
  }

  const COLOUR_A = "var(--accent)";
  const COLOUR_B = "var(--accent2)";

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 w-full pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href={`/compare?a=${aId}&b=${bId}`} className="focus-ring text-sm transition-colors" style={{ color: "var(--text2)" }}>
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
            KinkList Contract
          </h2>
          <p className="text-sm" style={{ color: "var(--text2)" }}>
            <span style={{ color: COLOUR_A }}>{profileA.name}</span>
            <span className="mx-2" style={{ color: "var(--text2)" }}>&</span>
            <span style={{ color: COLOUR_B }}>{profileB.name}</span>
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text2)" }}>Opgesteld op {today}</p>
        </div>

        {/* Preamble */}
        <p className="text-sm italic mb-6 leading-relaxed" style={{ color: "var(--text2)", borderLeft: "3px solid var(--border-accent)", paddingLeft: "1rem" }}>
          Door dit verbond biedt de één zichzelf aan in vertrouwen, toewijding en gewillige overgave, binnen
          de grenzen die vrijuit zijn uitgesproken en wederzijds zijn begrepen, en de ander aanvaardt die gave
          met eerbied, verantwoordelijkheid, beheersing en zorg. Wat hier wordt gegeven, wordt niet
          lichtvaardig genomen, want onderwerping is niet het verlies van het zelf, maar de bewuste daad om
          iemands kwetsbaarheid, vertrouwen en gehoorzaamheid in de handen te leggen van iemand die heeft
          gezworen zulke gaven met eer te bewaren. Autoriteit is op haar beurt geen louter voorrecht, maar een
          heilige plicht — om met standvastigheid te leiden, met kracht te beschermen, met intentie te
          bevelen, en het vertrouwen dat in hun hoede is gelegd te koesteren. Beiden begrijpen dat deze
          uitwisseling niet enkel rust op bezit, maar op toewijding, communicatie, verantwoordelijkheid en het
          stille geloof dat ieder zal eren wat is aangeboden. De één geeft, de ander ontvangt; de één geeft
          zich over, de ander leidt en beiden zijn verbonden door de zorg, het vertrouwen en de gekozen
          intimiteit die dit verbond betekenis geven. Hierin wordt macht niet slechts uitgewisseld, maar
          gedragen als een daad van toewijding, verantwoordelijkheid en verbondenheid tussen hen.
        </p>

        <ContractSection title="Gedeelde verlangens" items={[...shared, ...customShared]} colour="var(--yes)" />
        <ContractSection
          title="Harde grenzen"
          items={hardLimits.map((h) => `${h.name} — ${h.who}`)}
          colour="var(--hard-no)"
        />
        <ContractSection title="Zachte grenzen" items={softLimits} colour="var(--maybe)" />
        <ContractSection title="Bespreking nodig" items={discuss} colour="var(--willing)" />

        {/* General clauses */}
        <div className="mt-6 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>
            Algemene afspraken
          </h3>
          <ul className="space-y-1.5 text-sm" style={{ color: "var(--text2)" }}>
            <li>🔴 Safeword stopt alles — altijd en zonder uitleg.</li>
            <li>🤍 Aftercare is geen optie, maar een afspraak.</li>
            <li>✏️ Dit contract kan op elk moment door beiden worden herzien.</li>
            <li>💬 Grenzen die hier niet staan, worden voor elke scène besproken.</li>
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
          disabled={generating}
          className="focus-ring flex-1 py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          {generating ? "Genereren…" : "↓ Opslaan / Afdrukken"}
        </button>
      </div>
    </main>
  );
}

function ContractSection({ title, items, colour }: { title: string; items: string[]; colour: string }) {
  if (!items.length) return null;
  return (
    <div className="mb-5">
      <h3 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: colour }}>
        {title}
      </h3>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--text)" }}>
            <span style={{ color: colour, flexShrink: 0 }}>•</span>
            {item}
          </li>
        ))}
      </ul>
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
        height={120}
        className="w-full rounded-xl touch-none"
        style={{ border: `1px solid ${colour}`, background: "var(--surface2)", cursor: "crosshair", display: "block" }}
        aria-label={`Handtekening voor ${label}`}
      />
      <button
        onClick={clear}
        className="focus-ring text-xs px-3 py-1 rounded-full border transition-colors"
        style={{ color: "var(--text2)", borderColor: "var(--border)" }}
      >
        Wis
      </button>
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
