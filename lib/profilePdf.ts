import type { jsPDF as JsPdfType } from "jspdf";
import type { Profile } from "@/types";
import { CATEGORIES, getKinksByCategoryAndLevel, kinkCategoryLabel } from "@/lib/kinks";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/statusLabels";
import { profileExportResponse, type ProfileExportResponse } from "@/lib/privateResponses";
import { hexToRgb, PDF_DARK_PAGE, PDF_STATUS_ON_DARK } from "@/lib/pdfPalette";

// The profile export's printing press — moved whole out of
// app/profile/[id]/page.tsx, same discipline as lib/contractPdf: pure
// builder, page keeps the doc.save().

interface ProfilePdfOptions {
  includePrivateResponses?: boolean;
}

type VisibleExportResponse = Extract<ProfileExportResponse, { kind: "visible" }>;

interface ExportRow {
  name: string;
  response: VisibleExportResponse;
}

export async function buildProfilePdf(
  profile: Profile,
  maxLevel: number,
  options: ProfilePdfOptions = {},
): Promise<{ doc: JsPdfType; filename: string }> {
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

  const paintPage = () => {
    doc.setFillColor(...dark);
    doc.rect(0, 0, W, 297, "F");
  };
  const addPage = () => {
    doc.addPage();
    paintPage();
    y = 20;
  };

  paintPage();
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

  const printRow = (row: ExportRow) => {
    if (y > 265) addPage();
    const { response } = row;
    const color = response.status ? STATUS_COLORS_PDF[response.status] : light;
    doc.setFont("body", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...color);
    const statusLabel = response.status ? `[${STATUS_LABEL[response.status]}]` : "";
    const tags = response.tags.length ? ` [${response.tags.join(", ")}]` : "";
    doc.text(`• ${row.name}`, margin + 2, y);
    doc.setTextColor(...muted);
    doc.text(`${statusLabel}${tags}`, margin + 2 + doc.getTextWidth(`• ${row.name}`) + 3, y);
    y += 4.5;
    if (response.comment) {
      doc.setFont("body", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...muted);
      const commentLines = doc.splitTextToSize(`  ${response.comment}`, lineW - 5);
      doc.text(commentLines, margin + 4, y);
      y += commentLines.length * 4;
    }
  };

  for (const cat of CATEGORIES) {
    const rows: ExportRow[] = getKinksByCategoryAndLevel(cat, maxLevel)
      .map((kink) => {
        const entry = profile.entries[kink.id];
        if (!entry?.status) return null;
        const response = profileExportResponse(entry, options.includePrivateResponses);
        return response.kind === "visible" ? { name: kink.name, response } : null;
      })
      .filter((row): row is ExportRow => row !== null);

    if (!rows.length) continue;
    if (y > 260) addPage();
    doc.setFont("body", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...accent);
    doc.text(kinkCategoryLabel(cat).toUpperCase(), margin, y);
    y += 5;
    rows.forEach(printRow);
    y += 3;
  }

  const customRows: ExportRow[] = (profile.customKinks ?? [])
    .map((custom) => {
      const entry = profile.entries[custom.id];
      if (!entry?.status) return null;
      const response = profileExportResponse(entry, options.includePrivateResponses);
      return response.kind === "visible" ? { name: custom.name, response } : null;
    })
    .filter((row): row is ExportRow => row !== null);

  if (customRows.length) {
    if (y > 260) addPage();
    doc.setFont("body", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...accent);
    doc.text("MEER (EIGEN KINKS)", margin, y);
    y += 5;
    customRows.forEach(printRow);
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
