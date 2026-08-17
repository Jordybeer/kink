import type { jsPDF as JsPdfType } from "jspdf";
import type { KinkStatus } from "@/types";
import { STATUS_LABEL as STATUS_NL } from "@/lib/statusLabels";
import { hexToRgb, PDF_PAPER_PALETTE, PDF_PARTY_ON_PAPER, PDF_STATUS_ON_PAPER } from "@/lib/pdfPalette";

// The contract's printing press, moved out of app/contract/page.tsx wholesale
// (Phase 17 discipline: copy-move, explicit inputs, zero layout edits — the
// contract-PDF arc is complete and frozen; this file only changes its address).
// The page keeps the ceremony, the signatures and the doc.save(); this module
// owns everything between "new jsPDF" and the page-count footers.

export type SignalKey = "green" | "yellow" | "red" | "black";
export type Signals = Record<SignalKey, string>;
export const SIGNAL_LEVELS: { key: SignalKey; color: string; meaning: string }[] = [
  { key: "green",  color: "var(--yes)",   meaning: "Meer / harder" },
  { key: "yellow", color: "var(--maybe)", meaning: "Vertraag / check in" },
  { key: "red",    color: "var(--no)",    meaning: "Stop dit" },
  { key: "black",  color: "var(--text2)", meaning: "Stop alles" },
];
export const DEFAULT_SIGNALS: Signals = { green: "Meer", yellow: "Geel", red: "Rood", black: "Safeword" };

export type KinkDetailItem = {
  name: string;
  statusA: KinkStatus | null; statusB: KinkStatus | null;
  commentA?: string; commentB?: string;
  desireA?: number | null; desireB?: number | null;
};
export type ContractItem = string | { text: string; tag: string } | KinkDetailItem;

export function isKinkDetail(item: ContractItem): item is KinkDetailItem {
  return typeof item === "object" && "statusA" in item;
}

export interface ContractPdfInputs {
  profileA: { name: string; role: string };
  profileB: { name: string; role: string };
  preamble: string;
  today: string;
  signalsA: Signals;
  signalsB: Signals;
  aftercareA: string[];
  aftercareB: string[];
  sharedAll: KinkDetailItem[];
  softLimits: KinkDetailItem[];
  hardLimitDetails: KinkDetailItem[];
  discuss: KinkDetailItem[];
  sigDataA: string | null;
  sigDataB: string | null;
  sigLabelA: string;
  sigLabelB: string;
}

export async function buildContractPdf(inputs: ContractPdfInputs): Promise<{ doc: JsPdfType; filename: string }> {
  const {
    profileA, profileB, preamble, today,
    signalsA, signalsB, aftercareA, aftercareB,
    sharedAll, softLimits, hardLimitDetails, discuss,
    sigDataA, sigDataB, sigLabelA, sigLabelB,
  } = inputs;

  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { registerPdfFonts } = await import("@/lib/pdfFonts");
  await registerPdfFonts(doc);
  // The file introduces itself in a reader's title bar — no more "untitled".
  doc.setProperties({
    title: `KinkSync Overeenkomst — ${profileA.name} & ${profileB.name}`,
    subject: `Opgesteld op ${today}`,
    author: `${profileA.name} & ${profileB.name}`,
    creator: "KinkSync (kinksync.be)",
  });
  const W = 210;
  const margin = 20;
  const lineW = W - margin * 2;
  let y = 20;

  const accent = hexToRgb(PDF_PAPER_PALETTE.accent);
  const paper = hexToRgb(PDF_PAPER_PALETTE.paper);
  const ink = hexToRgb(PDF_PAPER_PALETTE.ink);
  const muted = hexToRgb(PDF_PAPER_PALETTE.muted);

  // Background
  doc.setFillColor(...paper);
  doc.rect(0, 0, W, 297, "F");

  // Title
  doc.setFont("display", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...accent);
  doc.text("KinkSync Overeenkomst", W / 2, y, { align: "center" });
  y += 7;

  // Subtitle
  doc.setFontSize(9);
  doc.setFont("body", "normal");
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
  y += 10;

  // Preamble — paginate line by line so long text can't overflow the page
  doc.setFont("body", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  const pLines = doc.splitTextToSize(preamble, lineW) as string[];
  for (const line of pLines) {
    if (y > 272) { doc.addPage(); doc.setFillColor(...paper); doc.rect(0, 0, W, 297, "F"); y = 20; doc.setFont("body", "italic"); doc.setFontSize(8); doc.setTextColor(...muted); }
    doc.text(line, margin, y);
    y += 4;
  }
  y += 10;

  // Safeword & Nazorg section in PDF
  const hasSignalData = (s: Signals) => SIGNAL_LEVELS.some((l) => s[l.key] !== DEFAULT_SIGNALS[l.key] && s[l.key].trim());
  const hasSafewordData = hasSignalData(signalsA) || hasSignalData(signalsB) || aftercareA.length > 0 || aftercareB.length > 0;
  if (hasSafewordData) {
    if (y > 250) { doc.addPage(); doc.setFillColor(...paper); doc.rect(0, 0, W, 297, "F"); y = 20; }
    doc.setFont("body", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...accent);
    doc.text("Signalen & Nazorg", margin, y);
    y += 5;
    doc.setFont("body", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...ink);

    for (const [signals, profile] of [[signalsA, profileA], [signalsB, profileB]] as const) {
      for (const l of SIGNAL_LEVELS) {
        const word = signals[l.key].trim() || DEFAULT_SIGNALS[l.key];
        doc.text(`${l.meaning} (${profile.name}): "${word}"`, margin + 3, y); y += 4.5;
      }
    }
    if (aftercareA.length) { doc.text(`Nazorg ${profileA.name}: ${aftercareA.join(", ")}`, margin + 3, y); y += 4.5; }
    if (aftercareB.length) { doc.text(`Nazorg ${profileB.name}: ${aftercareB.join(", ")}`, margin + 3, y); y += 4.5; }
    y += 10;
  }

  const newPage = () => {
    doc.addPage();
    doc.setFillColor(...paper);
    doc.rect(0, 0, W, 297, "F");
    y = 20;
  };

  const itemLabel = (item: ContractItem) => {
    if (typeof item === "string") return item;
    return `${(item as { text: string; tag: string }).text} (${(item as { text: string; tag: string }).tag})`;
  };

  const col2X = margin + 82;
  const col3X = margin + 82 + 44;

  const section = (title: string, items: ContractItem[], colour: [number, number, number]) => {
    if (!items.length) return;

    if (y > 258) { newPage(); }
    doc.setFont("display", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...colour);
    doc.text(title, margin, y);
    y += 2.5;
    doc.setDrawColor(...colour);
    doc.setLineWidth(0.25);
    doc.line(margin, y, margin + lineW, y);
    y += 6; // was 4 — the one rule in the doc sitting tighter than its neighbours

    const isKinkRow = items.length > 0 && typeof items[0] === "object" && items[0] !== null && "name" in (items[0] as object);

    if (isKinkRow) {
      // The column heads print once per table — and again after every
      // page break, so a spilled section never leaves the reader
      // guessing whose column is whose.
      const printColumnHeads = () => {
        doc.setFont("body", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...muted);
        doc.text(profileA.name, col2X, y);
        doc.text(profileB.name, col3X, y);
        y += 4.5;
        doc.setFont("body", "normal");
        doc.setFontSize(8.5);
      };
      printColumnHeads();
      // The first column keeps to itself: names stop 8mm short of the
      // status columns, and comment text (bullet at 4mm, text at 6mm)
      // stops 6mm short — nothing runs under a party's verdict.
      const nameW = col2X - margin - 8;
      const commentW = col2X - margin - 12;
      for (const item of items as KinkDetailItem[]) {
        const sA = item.statusA ? STATUS_NL[item.statusA] : "—";
        const sB = item.statusB ? STATUS_NL[item.statusB] : "—";
        const nameLines = doc.splitTextToSize(`• ${item.name}`, nameW) as string[];
        // Each party's whisper prints as its own bullet block under the
        // kink name — measured at the comment font so wrapping is
        // honest, with a breath of air between the two voices. The
        // bullet itself wears the party's colour, echoing the screen.
        doc.setFontSize(7.5);
        const commentBlocks = [
          item.commentA ? { party: hexToRgb(PDF_PARTY_ON_PAPER.a), lines: doc.splitTextToSize(`${profileA.name}: ${item.commentA}`, commentW) as string[] } : null,
          item.commentB ? { party: hexToRgb(PDF_PARTY_ON_PAPER.b), lines: doc.splitTextToSize(`${profileB.name}: ${item.commentB}`, commentW) as string[] } : null,
        ].filter((b): b is { party: [number, number, number]; lines: string[] } => b !== null && b.lines.length > 0);
        doc.setFontSize(8.5);
        const commentLineCount = commentBlocks.reduce((n, b) => n + b.lines.length, 0);
        const commentGap = Math.max(0, commentBlocks.length - 1) * 1.4;
        const rowH = nameLines.length * 4.2 +
          (commentLineCount ? commentLineCount * 3.6 + commentGap + 1.5 : 0) + 1.5;
        if (y + rowH > 272) {
          newPage();
          printColumnHeads();
        }
        doc.setTextColor(...ink);
        doc.text(nameLines, margin, y);
        // Verdicts wear their status colour — scannable at arm's length,
        // same families the screen speaks (AA-on-paper verified).
        doc.setTextColor(...(item.statusA ? hexToRgb(PDF_STATUS_ON_PAPER[item.statusA]) : muted));
        doc.text(sA, col2X, y);
        doc.setTextColor(...(item.statusB ? hexToRgb(PDF_STATUS_ON_PAPER[item.statusB]) : muted));
        doc.text(sB, col3X, y);
        doc.setTextColor(...ink);
        if (commentBlocks.length) {
          doc.setFont("body", "italic");
          doc.setFontSize(7.5);
          let cy = y + nameLines.length * 4.2;
          for (const block of commentBlocks) {
            doc.setTextColor(...block.party);
            doc.text("•", margin + 4, cy);
            doc.setTextColor(...muted);
            doc.text(block.lines, margin + 6, cy);
            cy += block.lines.length * 3.6 + 1.4;
          }
          doc.setFont("body", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(...ink);
        }
        y += rowH;
      }
    } else {
      const colW = (lineW - 10) / 2;
      doc.setFont("body", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...ink);
      let i = 0;
      while (i < items.length) {
        const left = `• ${itemLabel(items[i])}`;
        const right = items[i + 1] !== undefined ? `• ${itemLabel(items[i + 1])}` : null;
        const lLines = doc.splitTextToSize(left, colW - 4) as string[];
        const rLines = right ? doc.splitTextToSize(right, colW - 4) as string[] : [];
        const rowH = Math.max(lLines.length, rLines.length) * 4.2 + 1;
        if (y + rowH > 272) {
          newPage();
          doc.setFont("body", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(...ink);
        }
        lLines.forEach((l, li) => doc.text(l, margin + 3, y + li * 4.2));
        rLines.forEach((l, li) => doc.text(l, margin + colW + 10, y + li * 4.2));
        y += rowH;
        i += right !== null ? 2 : 1;
      }
    }
    doc.setDrawColor(...muted);
    doc.setLineWidth(0.2);
    doc.line(margin, y, W - margin, y);
    y += 10;
  };

  // Sections descend the choice ladder: shared desires, then soft
  // limits, then hard limits, and what still needs talking comes last.
  section("Gedeelde verlangens", sharedAll, hexToRgb(PDF_STATUS_ON_PAPER.yes));
  section("Zachte grenzen", softLimits, hexToRgb(PDF_STATUS_ON_PAPER.maybe));
  // Hard limits print as the same party-column table as the other
  // sections — the "who" reads from whose column says Harde grens.
  section("Harde grenzen", hardLimitDetails, hexToRgb(PDF_STATUS_ON_PAPER.hard_no));
  section("Bespreking nodig", discuss, hexToRgb(PDF_STATUS_ON_PAPER.conflict));

  // Safeword clause
  if (y > 240) { doc.addPage(); doc.setFillColor(...paper); doc.rect(0, 0, W, 297, "F"); y = 20; }
  doc.setFont("body", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...accent);
  doc.text("Algemene afspraken", margin, y);
  y += 2.5;
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.25);
  doc.line(margin, y, margin + lineW, y);
  y += 6;
  doc.setFont("body", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...ink);
  const clauses = [
    "Safeword stopt alles, altijd en zonder uitleg.",
    "Aftercare is geen optie, maar een afspraak.",
    "Dit contract kan op elk moment door beiden worden herzien.",
    "Grenzen die hier niet staan, worden voor elke scène besproken.",
    "Dit contract kan door beide partijen ten alle tijden verbroken worden zonder toestemming van de ander.",
  ];
  for (const c of clauses) {
    doc.text(`• ${c}`, margin + 3, y);
    y += 5.5;
  }
  y += 12;

  // Signatures
  if (y > 220) { doc.addPage(); doc.setFillColor(...paper); doc.rect(0, 0, W, 297, "F"); y = 20; }
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.4);
  doc.line(margin, y, W - margin, y);
  y += 6;

  doc.setFont("body", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...accent);
  doc.text("Handtekeningen", margin, y);
  y += 6;

  const sigW = (lineW - 10) / 2;
  const sigH = 30;
  const boxTop = y;

  doc.setDrawColor(...muted);
  doc.setLineWidth(0.3);
  doc.rect(margin, boxTop, sigW, sigH);
  doc.rect(margin + sigW + 10, boxTop, sigW, sigH);

  // Inset generously so ink can bleed toward the border without touching it.
  const sigPad = 2.5;
  if (sigDataA) doc.addImage(sigDataA, "PNG", margin + sigPad, boxTop + sigPad, sigW - sigPad * 2, sigH - sigPad * 2);
  if (sigDataB) doc.addImage(sigDataB, "PNG", margin + sigW + 10 + sigPad, boxTop + sigPad, sigW - sigPad * 2, sigH - sigPad * 2);

  // Give the rule room to breathe below the box, then the name, then the
  // date — each its own line instead of huddling against the box (was a
  // 4mm/4mm/4mm crush that read as "glued" to the signature box).
  const sigLineY = boxTop + sigH + 6;
  doc.setDrawColor(...muted);
  doc.setLineWidth(0.2);
  doc.line(margin, sigLineY, W - margin, sigLineY);
  doc.setFont("body", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  // sigLabelA/B arrive precomputed — the real-name choice lives with the form.
  const sigNameY = sigLineY + 6;
  doc.text(sigLabelA, margin + sigW / 2, sigNameY, { align: "center" });
  doc.text(sigLabelB, margin + sigW + 10 + sigW / 2, sigNameY, { align: "center" });
  const sigDateY = sigNameY + 5;
  doc.text(today, margin + sigW / 2, sigDateY, { align: "center" });
  doc.text(today, margin + sigW + 10 + sigW / 2, sigDateY, { align: "center" });
  y = sigDateY + 10;

  // Loose pages of a signed document want to know their place —
  // "pagina 2 van 3" in the footer, but only when there's more than one.
  const pageCount = doc.getNumberOfPages();
  if (pageCount > 1) {
    doc.setFont("body", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...muted);
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.text(`pagina ${p} van ${pageCount}`, W / 2, 290, { align: "center" });
    }
  }


  return { doc, filename: `contract-${profileA.name}-${profileB.name}.pdf` };
}
