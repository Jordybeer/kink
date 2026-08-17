import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prepareAvatarForShare, resizeImage } from "@/lib/imageUtils";

// ---------------------------------------------------------------------------
// resizeImage — crop math and output invariants
// ---------------------------------------------------------------------------
// Vitest runs in node environment; all browser APIs must be stubbed globally.
// FileReader and Image must be stubbed as classes (used with `new`).

const mockDrawImage = vi.fn();
const mockToDataURL = vi.fn(() => "data:image/jpeg;base64,result");
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(() => ({ drawImage: mockDrawImage })),
  toDataURL: mockToDataURL,
};

function setupMocks(imgW: number, imgH: number) {
  vi.stubGlobal("document", {
    createElement(tag: string) {
      if (tag === "canvas") return mockCanvas;
      throw new Error(`createElement(${tag}) not mocked`);
    },
  });

  class MockFileReader {
    onload: ((e: { target: { result: string } }) => void) | null = null;
    onerror: ((e: unknown) => void) | null = null;
    readAsDataURL(_file: unknown) {
      Promise.resolve().then(() =>
        this.onload?.({ target: { result: "data:image/jpeg;base64,raw" } })
      );
    }
  }
  vi.stubGlobal("FileReader", MockFileReader);

  class MockImage {
    width = imgW;
    height = imgH;
    onload: (() => void) | null = null;
    onerror: ((e: unknown) => void) | null = null;
    set src(_: string) {
      Promise.resolve().then(() => this.onload?.());
    }
    get src() { return ""; }
  }
  vi.stubGlobal("Image", MockImage);
}

describe("resizeImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToDataURL.mockReturnValue("data:image/jpeg;base64,result");
    mockCanvas.width = 0;
    mockCanvas.height = 0;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function makeFile() {
    return { name: "test.jpg", type: "image/jpeg" } as File;
  }

  it("produces a 256×256 canvas for landscape input (400×200)", async () => {
    setupMocks(400, 200);
    await resizeImage(makeFile());
    expect(mockCanvas.width).toBe(256);
    expect(mockCanvas.height).toBe(256);
  });

  it("calls drawImage with centered crop for landscape (400×200)", async () => {
    setupMocks(400, 200);
    await resizeImage(makeFile());
    // scale = max(256/400, 256/200) = 1.28
    // w = 400 × 1.28 = 512, h = 200 × 1.28 = 256
    // x = (256 − 512) / 2 = −128, y = (256 − 256) / 2 = 0
    expect(mockDrawImage).toHaveBeenCalledWith(expect.anything(), -128, 0, 512, 256);
  });

  it("calls drawImage with centered crop for portrait (200×400)", async () => {
    setupMocks(200, 400);
    await resizeImage(makeFile());
    // scale = max(256/200, 256/400) = 1.28
    // w = 200 × 1.28 = 256, h = 400 × 1.28 = 512
    // x = (256 − 256) / 2 = 0, y = (256 − 512) / 2 = −128
    expect(mockDrawImage).toHaveBeenCalledWith(expect.anything(), 0, -128, 256, 512);
  });

  it("calls drawImage with no offset for square input (256×256)", async () => {
    setupMocks(256, 256);
    await resizeImage(makeFile());
    // scale = 1.0, w = 256, h = 256, x = 0, y = 0
    expect(mockDrawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 256, 256);
  });

  it("outputs a JPEG data URL via toDataURL('image/jpeg', 0.7)", async () => {
    setupMocks(300, 300);
    const result = await resizeImage(makeFile());
    expect(mockToDataURL).toHaveBeenCalledWith("image/jpeg", 0.7);
    expect(result).toBe("data:image/jpeg;base64,result");
  });

  it("creates a smaller QR-specific avatar without changing the stored image", async () => {
    setupMocks(512, 512);
    const result = await prepareAvatarForShare("data:image/jpeg;base64,raw");
    expect(mockCanvas.width).toBe(160);
    expect(mockCanvas.height).toBe(160);
    expect(mockToDataURL).toHaveBeenCalledWith("image/jpeg", 0.62);
    expect(result).toBe("data:image/jpeg;base64,result");
  });

  it("reduces size and quality again when the first QR avatar is too large", async () => {
    setupMocks(512, 512);
    mockToDataURL
      .mockReturnValueOnce(`data:image/jpeg;base64,${"A".repeat(21_000)}`)
      .mockReturnValueOnce("data:image/jpeg;base64,small");
    const result = await prepareAvatarForShare("data:image/jpeg;base64,raw");
    expect(mockToDataURL).toHaveBeenNthCalledWith(1, "image/jpeg", 0.62);
    expect(mockToDataURL).toHaveBeenNthCalledWith(2, "image/jpeg", 0.52);
    expect(mockCanvas.width).toBe(144);
    expect(result).toBe("data:image/jpeg;base64,small");
  });
});
