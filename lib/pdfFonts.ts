import type { jsPDF } from "jspdf";

/**
 * Dress a jsPDF document in the house typefaces.
 * "body"    → Instrument Sans (normal / bold / italic)
 * "display" → Fraunces        (normal / bold)
 *
 * The base64 payload lives in pdfFontData.ts and is imported lazily here so
 * the fonts never weigh down the initial bundle — only the moment of export.
 */
export async function registerPdfFonts(doc: jsPDF): Promise<void> {
  const f = await import("./pdfFontData");
  doc.addFileToVFS("InstrumentSans-Regular.ttf", f.INSTRUMENT_REGULAR);
  doc.addFont("InstrumentSans-Regular.ttf", "body", "normal");
  doc.addFileToVFS("InstrumentSans-Bold.ttf", f.INSTRUMENT_BOLD);
  doc.addFont("InstrumentSans-Bold.ttf", "body", "bold");
  doc.addFileToVFS("InstrumentSans-Italic.ttf", f.INSTRUMENT_ITALIC);
  doc.addFont("InstrumentSans-Italic.ttf", "body", "italic");
  doc.addFileToVFS("Fraunces-Regular.ttf", f.FRAUNCES_REGULAR);
  doc.addFont("Fraunces-Regular.ttf", "display", "normal");
  doc.addFileToVFS("Fraunces-Bold.ttf", f.FRAUNCES_BOLD);
  doc.addFont("Fraunces-Bold.ttf", "display", "bold");
}
