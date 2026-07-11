import type { SceneRecord, SceneItem, Profile } from "@/types";
import { hexToRgb, PDF_PAPER_PALETTE } from "@/lib/pdfPalette";

// Shared print palette from lib/pdfPalette; only the scene-specific voices
// (safeword strip, intensity ramp) live here.
const LEDGER_PALETTE = {
  paper:   PDF_PAPER_PALETTE.paper,
  title:   PDF_PAPER_PALETTE.accent,
  body:    PDF_PAPER_PALETTE.ink,
  muted:   PDF_PAPER_PALETTE.muted,
  safeBg:  "#fee2e2",
  safeFg:  "#991b1b",
  zacht:   "#2563eb",
  midden:  "#ea580c",
  intens:  "#991b1b",
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
  const usableWidth = W - margin * 2;
  const usableHeight = H - 20;

  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const { registerPdfFonts } = await import("./pdfFonts");
  await registerPdfFonts(doc);
  doc.setFillColor(...hexToRgb(LEDGER_PALETTE.paper));
  doc.rect(0, 0, W, H, "F");

  let y = margin;

  // ── 1. Header block ──────────────────────────────────────────────────────
  const displayTitle = scene.title.trim() || "Scène";
  doc.setFont("display", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...hexToRgb(LEDGER_PALETTE.title));
  const titleLines = doc.splitTextToSize(displayTitle, usableWidth) as string[];
  doc.text(titleLines, margin, y);
  y += titleLines.length * 8 + 2;

  const aName = opts?.profileA?.name ?? scene.profileAName;
  const bName = opts?.profileB?.name ?? scene.profileBName;
  if (aName || bName) {
    doc.setFont("body", "normal");
    doc.setFontSize(12);
    doc.setTextColor(...hexToRgb(LEDGER_PALETTE.body));
    doc.text(`${aName} — ${bName}`, margin, y);
    y += 6;
  }

  const dateParts: string[] = [];
  if (scene.plannedDate) dateParts.push(scene.plannedDate);
  if (scene.plannedTime) dateParts.push(scene.plannedTime);
  if (dateParts.length) {
    doc.setFont("body", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...hexToRgb(LEDGER_PALETTE.muted));
    doc.text(dateParts.join("  "), margin, y);
    y += 7;
  }

  y += 2;
  doc.setDrawColor(...hexToRgb(LEDGER_PALETTE.muted));
  doc.setLineWidth(0.2);
  doc.line(margin, y, W - margin, y);
  y += 5;

  // ── 2. Safeword strip ────────────────────────────────────────────────────
  if (scene.safeword) {
    doc.setFillColor(...hexToRgb(LEDGER_PALETTE.safeBg));
    doc.rect(0, y, W, 9, "F");
    doc.setFont("body", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...hexToRgb(LEDGER_PALETTE.safeFg));
    doc.text(`SAFEWORD: ${scene.safeword}`, margin, y + 5.5);
    y += 14; // 5mm clear below the strip — 3mm read as the first item glued to it
  }

  // ── 3. Activities ────────────────────────────────────────────────────────
  const intensityColor = (v: SceneItem["intensity"]): [number, number, number] =>
    hexToRgb(v === "zacht" ? LEDGER_PALETTE.zacht : v === "midden" ? LEDGER_PALETTE.midden : LEDGER_PALETTE.intens);
  const intensityLabel = (v: SceneItem["intensity"]): string =>
    v === "zacht" ? "Zacht" : v === "midden" ? "Midden" : "Intens";

  for (const item of scene.items) {
    const noteLines = item.note
      ? (doc.splitTextToSize(item.note, usableWidth - 6) as string[])
      : [];
    const tagLine = item.tags?.length ? item.tags.join("  ·  ") : "";
    const estimatedHeight = 7 + (item.duration ? 0 : 0) + (tagLine ? 4 : 0) + noteLines.length * 3.5 + 4;

    if (y + estimatedHeight > usableHeight) {
      doc.addPage();
      doc.setFillColor(...hexToRgb(LEDGER_PALETTE.paper));
      doc.rect(0, 0, W, H, "F");
      y = margin;
    }

    const ic = intensityColor(item.intensity);
    doc.setFillColor(...ic);
    doc.rect(margin, y - 3, 2, 3.5, "F");

    doc.setFont("body", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...hexToRgb(LEDGER_PALETTE.body));
    doc.text(item.name, margin + 4, y);

    if (item.duration) {
      doc.setFont("body", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...hexToRgb(LEDGER_PALETTE.muted));
      doc.text(item.duration, W - margin, y, { align: "right" });
    }
    y += 4;

    if (tagLine) {
      doc.setFont("body", "italic");
      doc.setFontSize(7);
      doc.setTextColor(...hexToRgb(LEDGER_PALETTE.muted));
      doc.text(tagLine, margin + 4, y);
      y += 4;
    }

    if (noteLines.length) {
      doc.setFont("body", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...hexToRgb(LEDGER_PALETTE.muted));
      doc.text(noteLines, margin + 4, y);
      y += noteLines.length * 3.5 + 1;
    }

    // Intensity label (small, coloured)
    doc.setFont("body", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...ic);
    doc.text(intensityLabel(item.intensity), margin + 4, y);
    y += 5;
  }

  // ── 4. Summary footer ────────────────────────────────────────────────────
  const { sentence } = summarizeIntensities(scene.items);
  const now = new Date();
  const exportStamp = `Geëxporteerd op ${String(now.getDate()).padStart(2,"0")}-${String(now.getMonth()+1).padStart(2,"0")}-${now.getFullYear()} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;

  if (y + 14 > usableHeight) {
    doc.addPage();
    doc.setFillColor(...hexToRgb(LEDGER_PALETTE.paper));
    doc.rect(0, 0, W, H, "F");
    y = margin;
  }

  y += 2;
  doc.setDrawColor(...hexToRgb(LEDGER_PALETTE.muted));
  doc.setLineWidth(0.2);
  doc.line(margin, y, W - margin, y);
  y += 5;

  doc.setFont("body", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...hexToRgb(LEDGER_PALETTE.body));
  doc.text(sentence, margin, y);
  y += 4;
  doc.setTextColor(...hexToRgb(LEDGER_PALETTE.muted));
  doc.text(exportStamp, margin, y);

  // ── 5. Aftercare page ────────────────────────────────────────────────────
  if (scene.aftercare) {
    doc.addPage();
    doc.setFillColor(...hexToRgb(LEDGER_PALETTE.paper));
    doc.rect(0, 0, W, H, "F");
    y = margin;

    const af = scene.aftercare;
    const trafficLabel = TRAFFIC_LABEL[af.trafficLight] ?? af.trafficLight;

    doc.setFont("display", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...hexToRgb(LEDGER_PALETTE.title));
    doc.text("Aftercare", margin, y);
    y += 8;

    doc.setFont("body", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...hexToRgb(LEDGER_PALETTE.body));
    doc.text(trafficLabel, margin, y);
    y += 8;

    if (af.wentWell) {
      doc.setFont("body", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...hexToRgb(LEDGER_PALETTE.muted));
      doc.text("Wat werkte goed", margin, y);
      y += 5;
      doc.setFont("body", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...hexToRgb(LEDGER_PALETTE.body));
      const wentWellLines = doc.splitTextToSize(af.wentWell, usableWidth) as string[];
      doc.text(wentWellLines, margin, y);
      y += wentWellLines.length * 5 + 6;
    }

    if (af.remember) {
      doc.setFont("body", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...hexToRgb(LEDGER_PALETTE.muted));
      doc.text("Onthouden voor volgende keer", margin, y);
      y += 5;
      doc.setFont("body", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...hexToRgb(LEDGER_PALETTE.body));
      const rememberLines = doc.splitTextToSize(af.remember, usableWidth) as string[];
      doc.text(rememberLines, margin, y);
    }
  }

  try {
    doc.save(formatSceneFilename(scene.title, scene.plannedDate));
  } catch {
    // niet fataal
  }
}
