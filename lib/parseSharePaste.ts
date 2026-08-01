import {
  parseProfileQrBundlePart,
  parseProfileQrPart,
  type ProfileQrBundlePart,
  type ProfileQrPart,
} from "@/lib/profileQr";

export type ParsedShare =
  | { kind: "session"; code: string }
  | { kind: "profile"; encoded: string }
  | { kind: "profilePart"; part: ProfileQrPart }
  | { kind: "profileBundlePart"; part: ProfileQrBundlePart }
  | { kind: "invalid" };

const SESSION_TOKEN_RE = /^KINKSYNC:([A-Z2-9]{6})$/;
const SESSION_CODE_RE = /^[A-Z2-9]{6}$/;
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
  const input = raw.trim();
  if (!input) return { kind: "invalid" };

  const tokenMatch = input.match(SESSION_TOKEN_RE);
  if (tokenMatch) return { kind: "session", code: tokenMatch[1] };

  try {
    const url = new URL(input);
    const join = url.searchParams.get("join");
    if (join && SESSION_CODE_RE.test(join)) {
      return { kind: "session", code: join };
    }
    const p = url.searchParams.get("p");
    if (p) return { kind: "profile", encoded: p };
    const fromHash = parseHash(url.hash);
    if (fromHash) return fromHash;
  } catch {
    // Not a URL — keep going.
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

  if (SESSION_CODE_RE.test(input)) return { kind: "session", code: input };

  if (input.length >= 24 && BASE64URL_RE.test(input)) {
    return { kind: "profile", encoded: input };
  }

  return { kind: "invalid" };
}
