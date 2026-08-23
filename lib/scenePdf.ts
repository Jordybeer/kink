import type { SceneRecord, SceneItem, Profile } from "@/types";
import { hexToRgb, PDF_PAPER_PALETTE } from "@/lib/pdfPalette";

// Shared print palette from lib/pdfPalette; only scene-specific voices live here.
const LEDGER_PALETTE = {
  paper:      PDF_PAPER_PALETTE.paper,
  title:      PDF_PAPER_PALETTE.accent,
  body:       PDF_PAPER_PALETTE.ink,
  muted:      PDF_PAPER_PALETTE.muted,
  line:       "#e5e7eb",
  safeBg:     "#fff1f5",
  safeBorder: "#f6d5e4",
  safeFg:     "#9f1239",
  zacht:      "#2563eb",
  midden:     "#c2410c",
  intens:     "#991b1b",
  green:      "#047857",
  amber:      "#b45309",
  red:        "#b91c1c",
};

export interface IntensitySummary {
  zacht: number;
  midden: number;
  intens: number;
  total: number;
  sentence: string;
}

export function summarizeIntensities(items: SceneItem[]): IntensitySummary {
  const counts = { zacht: 0, midden: 0, intens: 0 };
  for (const it of items) counts[it.intensity]++;
  const total = items.length;
  if (total === 0) return { ...counts, total: 0, sentence: "Geen items" };
  const parts: string[] = [];
  if (counts.zacht  > 0) parts.push(`${counts.zacht}× zacht`);
  if (counts.midden > 0) parts.push(`${counts.midden}× midden`);
  if (counts.intens > 0) parts.push(`${counts.intens}× intens`);
  parts.push(`totaal ${total} items`);
  return { ...counts, total, sentence: parts.join(" · ") };
}

const MONTHS_NL = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
] as const;

export function formatSceneDisplayDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const month = MONTHS_NL[Number(match[2]) - 1];
  const day = Number(match[3]);
  if (!month || day < 1 || day > 31) return value;
  return `${day} ${month} ${match[1]}`;
}

function normalizedParticipantText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("nl");
}

export function formatSceneParticipantLine(
  title: string,
  aName?: string,
  bName?: string,
): string | null {
  const names = [aName?.trim(), bName?.trim()].filter((name): name is string => Boolean(name));
  if (names.length === 0) return null;

  const line = names.length === 2 ? `${names[0]} + ${names[1]}` : names[0];
  const titleKey = normalizedParticipantText(title);
  const equivalentTitles = names.length === 2
    ? [
        `${names[0]} & ${names[1]}`,
        `${names[0]} + ${names[1]}`,
        `${names[0]} en ${names[1]}`,
      ]
    : [names[0]];

  return equivalentTitles.some((candidate) => normalizedParticipantText(candidate) === titleKey)
    ? null
    : line;
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "menu";
}

function todayIso(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatSceneFilename(
  title: string,
  date: string | undefined,
  now: Date = new Date()
): string {
  const slug = slugify(title.trim());
  const dateStr = date ?? todayIso(now);
  return `kink-scene-${slug}-${dateStr}.pdf`;
}

const TRAFFIC_LABEL: Record<string, string> = {
  green: "Geweldig",
  amber: "Goed, maar…",
  red:   "Zwaar",
};

export async function exportScenePdf(
  scene: SceneRecord,
  opts?: { profileA?: Profile; profileB?: Profile }
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");

  const W = 148;
  const H = 210;
  const margin = 14;
  const right = W - margin;
  const usableWidth = W - margin * 2;
  const contentBottom = H - 34;

  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const { registerPdfFonts } = await import("./pdfFonts");
  await registerPdfFonts(doc);

  const displayTitle = scene.title.trim() || "Scène";
  doc.setProperties({
    title: `KinkSync Scène: ${displayTitle}`,
    creator: "KinkSync (kinksync.be)",
  });

  const fillPaper = () => {
    doc.setFillColor(...hexToRgb(LEDGER_PALETTE.paper));
    doc.rect(0, 0, W, H, "F");
  };
  fillPaper();

  const intensityColor = (value: SceneItem["intensity"]): [number, number, number] =>
    hexToRgb(value === "zacht" ? LEDGER_PALETTE.zacht : value === "midden" ? LEDGER_PALETTE.midden : LEDGER_PALETTE.intens);
  const intensityLabel = (value: SceneItem["intensity"]): string =>
    value === "zacht" ? "Zacht" : value === "midden" ? "Midden" : "Intens";

  const drawBrandEyebrow = (label = "KinkSync · scène") => {
    doc.setFont("body", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...hexToRgb(LEDGER_PALETTE.title));
    doc.text(label, margin, 14);
  };

  const drawSectionHeading = (label: string, y: number): number => {
    doc.setFont("display", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...hexToRgb(LEDGER_PALETTE.body));
    doc.text(label, margin, y);
    y += 3;
    doc.setDrawColor(...hexToRgb(LEDGER_PALETTE.line));
    doc.setLineWidth(0.2);
    doc.line(margin, y, right, y);
    return y + 5;
  };

  const addActivityPage = (): number => {
    doc.addPage();
    fillPaper();
    drawBrandEyebrow();
    doc.setFont("body", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...hexToRgb(LEDGER_PALETTE.muted));
    doc.text(displayTitle, right, 14, { align: "right", maxWidth: 72 });
    return drawSectionHeading("Activiteiten · vervolg", 24);
  };

  // ── 1. Editorial header ──────────────────────────────────────────────────
  let y = 14;
  drawBrandEyebrow();
  y += 11;

  doc.setFont("display", "bold");
  doc.setFontSize(23);
  doc.setTextColor(...hexToRgb(LEDGER_PALETTE.title));
  const titleLines = doc.splitTextToSize(displayTitle, usableWidth) as string[];
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7.8 + 1;

  const aName = opts?.profileA?.name ?? scene.profileAName;
  const bName = opts?.profileB?.name ?? scene.profileBName;
  const participantLine = formatSceneParticipantLine(displayTitle, aName, bName);
  if (participantLine) {
    doc.setFont("body", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...hexToRgb(LEDGER_PALETTE.body));
    doc.text(participantLine, margin, y);
    y += 5.5;
  }

  const meta: string[] = [];
  if (scene.plannedDate) meta.push(formatSceneDisplayDate(scene.plannedDate));
  if (scene.plannedTime) meta.push(scene.plannedTime);
  if (meta.length) {
    doc.setFont("body", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...hexToRgb(LEDGER_PALETTE.muted));
    doc.text(meta.join(" · "), margin, y);
    y += 7;
  } else {
    y += 2;
  }

  doc.setDrawColor(...hexToRgb(LEDGER_PALETTE.title));
  doc.setLineWidth(0.55);
  doc.line(margin, y, margin + 18, y);
  y += 7;

  // ── 2. Safeword, clear but not alarm-like ────────────────────────────────
  if (scene.safeword?.trim()) {
    const safeLines = doc.splitTextToSize(scene.safeword.trim(), usableWidth - 14) as string[];
    const boxH = 11 + safeLines.length * 4.5;
    doc.setFillColor(...hexToRgb(LEDGER_PALETTE.safeBg));
    doc.setDrawColor(...hexToRgb(LEDGER_PALETTE.safeBorder));
    doc.setLineWidth(0.25);
    doc.roundedRect(margin, y, usableWidth, boxH, 2, 2, "FD");
    doc.setFillColor(...hexToRgb(LEDGER_PALETTE.safeFg));
    doc.rect(margin, y, 2, boxH, "F");

    doc.setFont("body", "bold");
    doc.setFontSize(6.7);
    doc.setTextColor(...hexToRgb(LEDGER_PALETTE.safeFg));
    doc.text("Safeword", margin + 6, y + 5);

    doc.setFont("body", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...hexToRgb(LEDGER_PALETTE.body));
    doc.text(safeLines, margin + 6, y + 10.5);
    y += boxH + 8;
  }

  // ── 3. Activities: editorial rows, no dashboard cards ────────────────────
  y = drawSectionHeading("Activiteiten", y);

  for (const item of scene.items) {
    const titleWidth = usableWidth - (item.duration?.trim() ? 28 : 8);
    doc.setFont("body", "bold");
    doc.setFontSize(9.5);
    const nameLines = doc.splitTextToSize(item.name, titleWidth - 5) as string[];

    doc.setFont("body", "normal");
    doc.setFontSize(7);
    const tagLines = item.tags?.length
      ? (doc.splitTextToSize(item.tags.join(" · "), usableWidth - 9) as string[])
      : [];

    doc.setFont("body", "italic");
    doc.setFontSize(8);
    const noteLines = item.note?.trim()
      ? (doc.splitTextToSize(item.note.trim(), usableWidth - 9) as string[])
      : [];

    const rowH = 3 + nameLines.length * 4.1 + 3.6 + tagLines.length * 3.2 + noteLines.length * 3.7 + 3;
    if (y + rowH > contentBottom) y = addActivityPage();

    const rowTop = y;
    const ic = intensityColor(item.intensity);
    doc.setFillColor(...ic);
    doc.rect(margin, rowTop - 2.3, 1.6, Math.max(6.5, rowH - 3.5), "F");

    doc.setFont("body", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...hexToRgb(LEDGER_PALETTE.body));
    doc.text(nameLines, margin + 5, y);

    if (item.duration?.trim()) {
      doc.setFont("body", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...hexToRgb(LEDGER_PALETTE.muted));
      doc.text(item.duration.trim(), right, y, { align: "right" });
    }
    y += nameLines.length * 4.1;

    doc.setFont("body", "bold");
    doc.setFontSize(6.7);
    doc.setTextColor(...ic);
    doc.text(intensityLabel(item.intensity), margin + 5, y);
    y += 3.6;

    if (tagLines.length) {
      doc.setFont("body", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...hexToRgb(LEDGER_PALETTE.muted));
      doc.text(tagLines, margin + 5, y);
      y += tagLines.length * 3.2;
    }

    if (noteLines.length) {
      doc.setFont("body", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...hexToRgb(LEDGER_PALETTE.muted));
      doc.text(noteLines, margin + 5, y);
      y += noteLines.length * 3.7;
    }

    y += 2.2;
    doc.setDrawColor(...hexToRgb(LEDGER_PALETTE.line));
    doc.setLineWidth(0.15);
    doc.line(margin + 5, y, right, y);
    y += 3.2;
  }

  // ── 4. Quiet summary anchored to the page bottom ─────────────────────────
  const summary = summarizeIntensities(scene.items);
  const summaryY = H - 24;
  doc.setDrawColor(...hexToRgb(LEDGER_PALETTE.line));
  doc.setLineWidth(0.2);
  doc.line(margin, summaryY - 4, right, summaryY - 4);

  doc.setFont("body", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...hexToRgb(LEDGER_PALETTE.body));
  doc.text(summary.total === 1 ? "1 activiteit" : `${summary.total} activiteiten`, margin, summaryY);

  if (summary.total > 0) {
    const mix = [
      summary.zacht ? `${summary.zacht} zacht` : null,
      summary.midden ? `${summary.midden} midden` : null,
      summary.intens ? `${summary.intens} intens` : null,
    ].filter((part): part is string => part !== null).join(" · ");
    doc.setFont("body", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(...hexToRgb(LEDGER_PALETTE.muted));
    doc.text(mix, right, summaryY, { align: "right" });
  }

  // ── 5. Aftercare in the same editorial vocabulary ────────────────────────
  if (scene.aftercare) {
    const af = scene.aftercare;
    const aftercarePage = () => {
      doc.addPage();
      fillPaper();
      drawBrandEyebrow("KinkSync · aftercare");
      let nextY = 28;
      doc.setFont("display", "bold");
      doc.setFontSize(20);
      doc.setTextColor(...hexToRgb(LEDGER_PALETTE.title));
      doc.text("Aftercare", margin, nextY);
      nextY += 11;
      return nextY;
    };

    y = aftercarePage();
    const trafficLabel = TRAFFIC_LABEL[af.trafficLight] ?? af.trafficLight;
    const trafficColor = af.trafficLight === "green"
      ? LEDGER_PALETTE.green
      : af.trafficLight === "amber"
        ? LEDGER_PALETTE.amber
        : LEDGER_PALETTE.red;

    doc.setFillColor(...hexToRgb(trafficColor));
    doc.rect(margin, y - 3, 1.6, 6, "F");
    doc.setFont("body", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...hexToRgb(trafficColor));
    doc.text(trafficLabel, margin + 5, y);
    y += 11;

    const writeAftercareSection = (heading: string, text: string) => {
      if (!text.trim()) return;
      if (y > contentBottom - 14) y = aftercarePage();

      doc.setFont("display", "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(...hexToRgb(LEDGER_PALETTE.body));
      doc.text(heading, margin, y);
      y += 6;

      doc.setFont("body", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...hexToRgb(LEDGER_PALETTE.body));
      const lines = doc.splitTextToSize(text.trim(), usableWidth) as string[];
      for (const line of lines) {
        if (y > contentBottom) {
          y = aftercarePage();
          doc.setFont("body", "normal");
          doc.setFontSize(9);
          doc.setTextColor(...hexToRgb(LEDGER_PALETTE.body));
        }
        doc.text(line, margin, y);
        y += 4.6;
      }
      y += 8;
    };

    writeAftercareSection("Wat werkte goed", af.wentWell);
    writeAftercareSection("Onthouden voor volgende keer", af.remember);
  }

  // ── 6. Consistent quiet footer on every page ─────────────────────────────
  const now = new Date();
  const exportStamp = `Geëxporteerd ${String(now.getDate()).padStart(2,"0")}-${String(now.getMonth()+1).padStart(2,"0")}-${now.getFullYear()} · ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    const footerLineY = H - 14;
    doc.setDrawColor(...hexToRgb(LEDGER_PALETTE.line));
    doc.setLineWidth(0.15);
    doc.line(margin, footerLineY, right, footerLineY);

    doc.setFont("body", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...hexToRgb(LEDGER_PALETTE.title));
    doc.text("KinkSync", margin, footerLineY + 5);

    doc.setFont("body", "normal");
    doc.setFontSize(6.2);
    doc.setTextColor(...hexToRgb(LEDGER_PALETTE.muted));
    if (pageCount > 1) doc.text(`${page} / ${pageCount}`, W / 2, footerLineY + 5, { align: "center" });
    doc.text(exportStamp, right, footerLineY + 5, { align: "right" });
  }

  try {
    doc.save(formatSceneFilename(scene.title, scene.plannedDate));
  } catch {
    // niet fataal
  }
}
