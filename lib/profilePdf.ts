import type { jsPDF as JsPdfType } from "jspdf";
import type { Profile } from "@/types";
import { CATEGORIES, getKinksByCategoryAndLevel, kinkCategoryLabel } from "@/lib/kinks";
import { STATUS_LABEL } from "@/lib/statusLabels";
import { profileExportResponse, type ProfileExportResponse } from "@/lib/privateResponses";
import { hexToRgb, PDF_PAPER_PALETTE, PDF_STATUS_ON_PAPER } from "@/lib/pdfPalette";

interface ProfilePdfOptions {
  includePrivateResponses?: boolean;
}

type VisibleExportResponse = Extract<ProfileExportResponse, { kind: "visible" }>;

interface ExportRow {
  name: string;
  response: VisibleExportResponse;
}

interface ExportSection {
  label: string;
  rows: ExportRow[];
}

interface MeasuredRow {
  nameLines: string[];
  tagLines: string[];
  commentLines: string[];
  height: number;
}

const PAPER_LINE = "#e5e7eb";

export async function buildProfilePdf(
  profile: Profile,
  maxLevel: number,
  options: ProfilePdfOptions = {},
): Promise<{ doc: JsPdfType; filename: string }> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { registerPdfFonts } = await import("@/lib/pdfFonts");
  await registerPdfFonts(doc);

  doc.setProperties({
    title: `KinkSync profiel: ${profile.name}`,
    creator: "KinkSync (kinksync.be)",
  });

  const sections: ExportSection[] = CATEGORIES.map((category) => ({
    label: kinkCategoryLabel(category),
    rows: getKinksByCategoryAndLevel(category, maxLevel)
      .map((kink) => {
        const entry = profile.entries[kink.id];
        if (!entry?.status) return null;
        const response = profileExportResponse(entry, options.includePrivateResponses);
        return response.kind === "visible" ? { name: kink.name, response } : null;
      })
      .filter((row): row is ExportRow => row !== null),
  })).filter((section) => section.rows.length > 0);

  const customRows: ExportRow[] = (profile.customKinks ?? [])
    .map((custom) => {
      const entry = profile.entries[custom.id];
      if (!entry?.status) return null;
      const response = profileExportResponse(entry, options.includePrivateResponses);
      return response.kind === "visible" ? { name: custom.name, response } : null;
    })
    .filter((row): row is ExportRow => row !== null);

  if (customRows.length > 0) sections.push({ label: "Eigen onderwerpen", rows: customRows });

  const rowCount = sections.reduce((total, section) => total + section.rows.length, 0);
  const W = 210;
  const H = 297;
  const margin = 16;
  const gap = 8;
  const columnWidth = (W - margin * 2 - gap) / 2;
  const contentBottom = H - 20;
  const paper = hexToRgb(PDF_PAPER_PALETTE.paper);
  const accent = hexToRgb(PDF_PAPER_PALETTE.accent);
  const ink = hexToRgb(PDF_PAPER_PALETTE.ink);
  const muted = hexToRgb(PDF_PAPER_PALETTE.muted);
  const line = hexToRgb(PAPER_LINE);

  const paintPage = () => {
    doc.setFillColor(...paper);
    doc.rect(0, 0, W, H, "F");
  };

  const drawBrandEyebrow = (label = "KinkSync · profiel") => {
    doc.setFont("body", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(...accent);
    doc.text(label, margin, 15);
  };

  const drawFirstHeader = (): number => {
    drawBrandEyebrow();
    let headerY = 27;

    doc.setFont("display", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...ink);
    const titleLines = doc.splitTextToSize(profile.name, W - margin * 2) as string[];
    doc.text(titleLines, margin, headerY);
    headerY += titleLines.length * 7.6 + 1.5;

    const identity = [profile.role, profile.experienceLevel, profile.relationshipStatus]
      .filter((value): value is string => Boolean(value?.trim()));
    if (identity.length > 0) {
      doc.setFont("body", "normal");
      doc.setFontSize(9.4);
      doc.setTextColor(...ink);
      doc.text(identity.join(" · "), margin, headerY);
      headerY += 5.2;
    }

    doc.setFont("body", "normal");
    doc.setFontSize(8.4);
    doc.setTextColor(...muted);
    const generated = new Date().toLocaleDateString("nl-NL");
    doc.text(`${rowCount} beoordeelde voorkeuren · Gegenereerd ${generated}`, margin, headerY);
    headerY += 4.8;

    doc.setFontSize(7.8);
    doc.text(
      options.includePrivateResponses
        ? "Privé export · Privé antwoorden inbegrepen"
        : "Privé export · Alleen zichtbare antwoorden",
      margin,
      headerY,
    );
    headerY += 5;

    doc.setDrawColor(...accent);
    doc.setLineWidth(0.5);
    doc.line(margin, headerY, margin + 20, headerY);
    return headerY + 7;
  };

  const drawContinuationHeader = (): number => {
    drawBrandEyebrow("KinkSync · profiel · vervolg");
    doc.setFont("body", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...muted);
    doc.text(profile.name, W - margin, 15, { align: "right", maxWidth: 85 });
    return 25;
  };

  const columnX = (column: 0 | 1): number => margin + column * (columnWidth + gap);

  const drawSectionHeading = (label: string, x: number, top: number): number => {
    doc.setFont("display", "bold");
    doc.setFontSize(11.2);
    doc.setTextColor(...ink);
    doc.text(label, x, top + 3.7, { maxWidth: columnWidth });
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.35);
    doc.line(x, top + 6, x + 12, top + 6);
    return top + 10;
  };

  const measureRow = (row: ExportRow): MeasuredRow => {
    const statusWidth = 27;
    const nameWidth = columnWidth - statusWidth - 6;

    doc.setFont("body", "bold");
    doc.setFontSize(9.4);
    const nameLines = doc.splitTextToSize(row.name, nameWidth) as string[];

    doc.setFont("body", "normal");
    doc.setFontSize(7.5);
    const tagLines = row.response.tags.length > 0
      ? doc.splitTextToSize(row.response.tags.join(" · "), columnWidth - 6) as string[]
      : [];

    doc.setFont("body", "italic");
    doc.setFontSize(8.2);
    const commentLines = row.response.comment
      ? doc.splitTextToSize(row.response.comment, columnWidth - 6) as string[]
      : [];

    const nameHeight = Math.max(4.2, nameLines.length * 4.2);
    const tagHeight = tagLines.length * 3.3;
    const commentHeight = commentLines.length * 3.7;
    return {
      nameLines,
      tagLines,
      commentLines,
      height: 4 + nameHeight + tagHeight + commentHeight + 2.8,
    };
  };

  const drawRow = (row: ExportRow, measured: MeasuredRow, x: number, top: number) => {
    const status = row.response.status;
    const statusColor = status ? hexToRgb(PDF_STATUS_ON_PAPER[status]) : muted;
    const textY = top + 4.2;

    doc.setFillColor(...statusColor);
    doc.rect(x, top + 1, 1.25, Math.max(5.5, measured.height - 2), "F");

    doc.setFont("body", "bold");
    doc.setFontSize(9.4);
    doc.setTextColor(...ink);
    doc.text(measured.nameLines, x + 4, textY);

    doc.setFont("body", "bold");
    doc.setFontSize(7.8);
    doc.setTextColor(...statusColor);
    doc.text(status ? STATUS_LABEL[status] : "", x + columnWidth, textY, { align: "right" });

    let cursor = textY + measured.nameLines.length * 4.2;
    if (measured.tagLines.length > 0) {
      doc.setFont("body", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...muted);
      doc.text(measured.tagLines, x + 4, cursor);
      cursor += measured.tagLines.length * 3.3;
    }

    if (measured.commentLines.length > 0) {
      doc.setFont("body", "italic");
      doc.setFontSize(8.2);
      doc.setTextColor(...muted);
      doc.text(measured.commentLines, x + 4, cursor);
    }

    doc.setDrawColor(...line);
    doc.setLineWidth(0.15);
    doc.line(x + 4, top + measured.height - 0.8, x + columnWidth, top + measured.height - 0.8);
  };

  paintPage();
  let column: 0 | 1 = 0;
  let columnTop = drawFirstHeader();
  let y = columnTop;

  const advanceColumn = (continuationLabel?: string) => {
    if (column === 0) {
      column = 1;
      y = columnTop;
    } else {
      doc.addPage();
      paintPage();
      column = 0;
      columnTop = drawContinuationHeader();
      y = columnTop;
    }

    if (continuationLabel) {
      y = drawSectionHeading(continuationLabel, columnX(column), y);
    }
  };

  if (rowCount === 0) {
    doc.setFont("body", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...muted);
    doc.text("Nog geen beoordeelde voorkeuren om te exporteren.", margin, y + 4);
  } else {
    for (const section of sections) {
      const firstMeasured = measureRow(section.rows[0]);
      if (y + 10 + firstMeasured.height > contentBottom) advanceColumn();
      y = drawSectionHeading(section.label, columnX(column), y);

      for (let index = 0; index < section.rows.length; index += 1) {
        const row = section.rows[index];
        const measured = index === 0 ? firstMeasured : measureRow(row);
        if (y + measured.height > contentBottom) {
          advanceColumn(`${section.label} · vervolg`);
        }
        drawRow(row, measured, columnX(column), y);
        y += measured.height;
      }
      y += 4;
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...line);
    doc.setLineWidth(0.15);
    doc.line(margin, H - 13, W - margin, H - 13);
    doc.setFont("body", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(...muted);
    doc.text(`Privé · ${profile.name}`, margin, H - 9);
    doc.text(`${page} / ${pageCount}`, W - margin, H - 9, { align: "right" });
  }

  return { doc, filename: `${profile.name}-kinks.pdf` };
}
