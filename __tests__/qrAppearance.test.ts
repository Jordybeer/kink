import { describe, expect, it } from "vitest";
import { QR_COLOURS, qrRenderOptions } from "@/lib/qrAppearance";

describe("qrRenderOptions", () => {
  it("houdt rastermaat, marge, foutcorrectie en vaste kleuren stabiel", () => {
    expect(QR_COLOURS).toEqual({
      dark: "#17121AFF",
      light: "#FFFFFFFF",
    });

    expect(qrRenderOptions(280, "M")).toEqual({
      width: 280,
      margin: 2,
      errorCorrectionLevel: "M",
      color: QR_COLOURS,
    });
  });
});
