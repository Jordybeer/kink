export const QR_COLOURS = {
  dark: "#17121AFF",
  light: "#FFFFFFFF",
} as const;

export function qrRenderOptions(
  width: number,
  errorCorrectionLevel: "L" | "M" | "Q" | "H",
) {
  return {
    width,
    margin: 2,
    errorCorrectionLevel,
    color: QR_COLOURS,
  } as const;
}
