export interface PdfPreviewEnvironment {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
}

export function shouldUseCanonicalPdfPreview(environment: PdfPreviewEnvironment): boolean {
  const nativeIOS = /iPad|iPhone|iPod/i.test(environment.userAgent);
  const desktopClassIPad = environment.platform === "MacIntel" && environment.maxTouchPoints > 1;
  return nativeIOS || desktopClassIPad;
}
