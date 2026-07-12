import type { jsPDF as JsPdfType } from "jspdf";
import type { Profile } from "@/types";
import { CATEGORIES, getKinksByCategoryAndLevel } from "@/lib/kinks";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/statusLabels";
import { hexToRgb, PDF_DARK_PAGE, PDF_STATUS_ON_DARK } from "@/lib/pdfPalette";

// The profile export's printing press — moved whole out of
// app/profile/[id]/page.tsx, same discipline as lib/contractPdf: pure
// builder, page keeps the doc.save().

export async function buildProfilePdf(profile: Profile, maxLevel: number): Promise<{ doc: JsPdfType; filename: string }> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { registerPdfFonts } = await import("@/lib/pdfFonts");
  await registerPdfFonts(doc);

  // The export introduces itself in the reader's title bar.
  doc.setProperties({
    title: `KinkSync Profiel — ${profile.name}`,
    creator: "KinkSync (kinksync.be)",
  });
  const W = 210;
  const margin = 20;
  const lineW = W - margin * 2;
  let y = 20;

  const accent = hexToRgb(PDF_DARK_PAGE.accent);
  const dark = hexToRgb(PDF_DARK_PAGE.bg);
  const muted = hexToRgb(PDF_DARK_PAGE.muted);
  const light = hexToRgb(PDF_DARK_PAGE.light);

  doc.setFillColor(...dark);
  doc.rect(0, 0, W, 297, "F");
  doc.setFont("display", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...accent);
  doc.text("KinkSync", W / 2, y, { align: "center" });
  y += 5;
  doc.setFontSize(8);
  doc.setFont("body", "normal");
  doc.setTextColor(...muted);
  doc.text("kinksync.be", W / 2, y, { align: "center" });
  y += 7;
  doc.setFontSize(12);
  doc.setFont("body", "bold");
  doc.setTextColor(...light);
  doc.text(`${profile.name} — ${profile.role}`, W / 2, y, { align: "center" });
  y += 5;
  doc.setFontSize(9);
  doc.setFont("body", "normal");
  doc.setTextColor(...muted);
  doc.text(`${profile.experienceLevel} · Gegenereerd op ${new Date().toLocaleDateString("nl-NL")}`, W / 2, y, { align: "center" });
  y += 5;
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.4);
  doc.line(margin, y, W - margin, y);
  y += 6;

  const STATUS_COLORS_PDF = Object.fromEntries(
    STATUS_ORDER.map((s) => [s, hexToRgb(PDF_STATUS_ON_DARK[s])])
  ) as Record<string, [number, number, number]>;

  for (const cat of CATEGORIES) {
    const kinks = getKinksByCategoryAndLevel(cat, maxLevel);
    const active = kinks.filter((k) => profile.entries[k.id]?.status);
    if (!active.length) continue;
    if (y > 260) { doc.addPage(); doc.setFillColor(...dark); doc.rect(0, 0, W, 297, "F"); y = 20; }
    doc.setFont("body", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...accent);
    doc.text(cat.toUpperCase(), margin, y);
    y += 5;
    for (const k of active) {
      if (y > 265) { doc.addPage(); doc.setFillColor(...dark); doc.rect(0, 0, W, 297, "F"); y = 20; }
      const e = profile.entries[k.id];
      const color = e.status ? STATUS_COLORS_PDF[e.status] : muted;
      doc.setFont("body", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...color);
      const statusLabel = e.status ? `[${STATUS_LABEL[e.status]}]` : "";
      const tags = (e.tags ?? []).length ? ` [${e.tags!.join(", ")}]` : "";
      doc.text(`• ${k.name}`, margin + 2, y);
      doc.setTextColor(...muted);
      doc.text(`${statusLabel}${tags}`, margin + 2 + doc.getTextWidth(`• ${k.name}`) + 3, y);
      y += 4.5;
      if (e.comment) {
        doc.setFont("body", "italic");
        doc.setFontSize(8);
        doc.setTextColor(...muted);
        const commentLines = doc.splitTextToSize(`  ${e.comment}`, lineW - 5);
        doc.text(commentLines, margin + 4, y);
        y += commentLines.length * 4;
      }
    }
    y += 3;
  }

  const customKinksList = profile.customKinks ?? [];
  const activeCustom = customKinksList.filter((ck) => profile.entries[ck.id]?.status);
  if (activeCustom.length) {
    if (y > 260) { doc.addPage(); doc.setFillColor(...dark); doc.rect(0, 0, W, 297, "F"); y = 20; }
    doc.setFont("body", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...accent);
    doc.text("MEER (EIGEN KINKS)", margin, y);
    y += 5;
    for (const ck of activeCustom) {
      const e = profile.entries[ck.id];
      const color = e?.status ? STATUS_COLORS_PDF[e.status] : muted;
      doc.setFont("body", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...color);
      const statusLabel = e?.status ? `[${STATUS_LABEL[e.status]}]` : "";
      doc.text(`• ${ck.name}  ${statusLabel}`, margin + 2, y);
      y += 4.5;
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("body", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text(`${i} / ${pageCount}`, W - margin, 290, { align: "right" });
  }
  
  return { doc, filename: `${profile.name}-kinks.pdf` };
}
