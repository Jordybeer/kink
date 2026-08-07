import {
  parseProfileQrBundlePart,
  parseProfileQrPart,
  type ProfileQrBundlePart,
  type ProfileQrPart,
} from "@/lib/profileQr";
import { PROFILE_SHARE_INPUT_MAX_CHARS } from "@/lib/importLimits";

export type ParsedShare =
  | { kind: "profile"; encoded: string }
  | { kind: "profilePart"; part: ProfileQrPart }
  | { kind: "profileBundlePart"; part: ProfileQrBundlePart }
  | { kind: "invalid" };

const BASE64URL_RE = /^[A-Za-z0-9+/=_-]+$/;

function parseHash(hash: string): ParsedShare | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const p3 = params.get("p3");
  if (p3) return { kind: "profile", encoded: p3 };
  const p3m = params.get("p3m");
  if (p3m) {
    const part = parseProfileQrPart(p3m);
    return part ? { kind: "profilePart", part } : { kind: "invalid" };
  }
  const p3b = params.get("p3b");
  if (p3b) {
    const part = parseProfileQrBundlePart(p3b);
    return part ? { kind: "profileBundlePart", part } : { kind: "invalid" };
  }
  return null;
}

export function parseSharePaste(raw: string): ParsedShare {
  if (raw.length > PROFILE_SHARE_INPUT_MAX_CHARS) return { kind: "invalid" };
  const input = raw.trim();
  if (!input) return { kind: "invalid" };

  try {
    const url = new URL(input);
    const p = url.searchParams.get("p");
    if (p) return { kind: "profile", encoded: p };
    const fromHash = parseHash(url.hash);
    if (fromHash) return fromHash;
  } catch {
    // Not a URL. Continue with the compact profile formats.
  }

  const hashOnly = input.startsWith("#") ? parseHash(input) : null;
  if (hashOnly) return hashOnly;

  if (input.startsWith("3d.") || input.startsWith("3r.") || input.startsWith("4r.")) {
    return { kind: "profile", encoded: input };
  }

  if (input.startsWith("p3m=")) {
    const part = parseProfileQrPart(input.slice(4));
    return part ? { kind: "profilePart", part } : { kind: "invalid" };
  }

  if (input.startsWith("p3b=")) {
    const part = parseProfileQrBundlePart(input.slice(4));
    return part ? { kind: "profileBundlePart", part } : { kind: "invalid" };
  }

  if (input.length >= 24 && BASE64URL_RE.test(input)) {
    return { kind: "profile", encoded: input };
  }

  return { kind: "invalid" };
}
