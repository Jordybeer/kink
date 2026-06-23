// Parse a pasted share string into the same shapes the camera scanner accepts.
// Used by both the live camera path (lib used inside QRScanner.scan) and the
// paste-fallback textarea (PWA users who can't grant camera permission).

export type ParsedShare =
  | { kind: "session"; code: string }
  | { kind: "profile"; encoded: string }
  | { kind: "invalid" };

const SESSION_TOKEN_RE = /^KINKSYNC:([A-Z2-9]{6})$/;
const SESSION_CODE_RE = /^[A-Z2-9]{6}$/;
const BASE64URL_RE = /^[A-Za-z0-9+/=_-]+$/;

export function parseSharePaste(raw: string): ParsedShare {
  const input = raw.trim();
  if (!input) return { kind: "invalid" };

  const tokenMatch = input.match(SESSION_TOKEN_RE);
  if (tokenMatch) return { kind: "session", code: tokenMatch[1] };

  // Try URL-shaped inputs: /session?join=CODE first, then ?p=PAYLOAD anywhere.
  try {
    const url = new URL(input);
    const join = url.searchParams.get("join");
    if (join && SESSION_CODE_RE.test(join)) {
      return { kind: "session", code: join };
    }
    const p = url.searchParams.get("p");
    if (p) return { kind: "profile", encoded: p };
  } catch {
    // Not a URL — keep going.
  }

  // Bare session code, e.g. user typed only the 6 chars.
  if (SESSION_CODE_RE.test(input)) return { kind: "session", code: input };

  // Last resort: a bare base64url-shaped payload. The caller still has to run
  // decodeAny on it before trusting; we only filter obvious garbage here.
  if (input.length >= 24 && BASE64URL_RE.test(input)) {
    return { kind: "profile", encoded: input };
  }

  return { kind: "invalid" };
}
