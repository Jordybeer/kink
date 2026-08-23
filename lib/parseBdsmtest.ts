import type { BdsmtestScore } from "@/types";
import { sanitizeBdsmtestUrl } from "@/lib/profileSanitizePrimitives";

export const MAX_BDSMTEST_COPY_CHARS = 16_384;
const MAX_ROWS = 50;
const MAX_ROLE_LEN = 64;
const CONTROL_RE = /[\u0000-\u001F\u007F]/;
const URLISH_RE = /^(?:[a-z][a-z0-9+.-]*:|www\.)/i;
const ENCODED_LINE_BREAK_RE = /%0[ad]/i;
const SCORE_RE = /^(\d{1,3})%\s+(.+)$/;
const SCOREISH_RE = /^-?\d+%/;

export type BdsmtestCopyAllError =
  | "too-large"
  | "missing-url"
  | "multiple-urls"
  | "invalid-url"
  | "missing-results"
  | "invalid-results";

export type BdsmtestCopyAllResult =
  | { ok: true; url: string; scores: BdsmtestScore[] }
  | { ok: false; error: BdsmtestCopyAllError };

function cleanRole(raw: string): string | null {
  const role = raw.trim();
  if (!role || role.length > MAX_ROLE_LEN || CONTROL_RE.test(role) || /[<>]/.test(role)) return null;
  return role;
}

/**
 * iOS can receive BDSMTest's `Copy all` payload as one URI-encoded line. Decode
 * that concrete shape once, then send the resulting lines through the same
 * strict URL and score validation as ordinary clipboard text.
 */
function normalizeCopyAllInput(input: string): string {
  const normalized = input.replace(/\r\n?/g, "\n");
  const decoded = normalized
    .split("\n")
    .map((rawLine) => {
      const line = rawLine.trim();
      if (!URLISH_RE.test(line) || !ENCODED_LINE_BREAK_RE.test(line)) return rawLine;

      try {
        return decodeURIComponent(line);
      } catch {
        return rawLine;
      }
    })
    .join("\n");

  return decoded.replace(/\r\n?/g, "\n");
}

/**
 * Parses score lines only. Kept for compatibility with older callers while the
 * stricter Copy all parser owns the external paste boundary.
 */
export function parseBdsmtestOutput(text: string): BdsmtestScore[] {
  if (text.length > MAX_BDSMTEST_COPY_CHARS) return [];
  const byRole = new Map<string, number>();

  for (const rawLine of text.replace(/\r\n?/g, "\n").split("\n")) {
    if (byRole.size >= MAX_ROWS) break;
    const line = rawLine.trim();
    const match = line.match(SCORE_RE);
    if (!match) continue;
    const pct = Number.parseInt(match[1], 10);
    const role = cleanRole(match[2]);
    if (!role || pct < 0 || pct > 100) continue;
    if (!byRole.has(role)) byRole.set(role, pct);
  }

  return Array.from(byRole, ([role, pct]) => ({ role, pct }))
    .sort((a, b) => b.pct - a.pct);
}

/**
 * Parses the full clipboard output from bdsmtest.org without touching the
 * network. Free text around the payload is ignored, but URL-looking and score-
 * looking lines are treated strictly so malformed or hostile input cannot hide
 * inside an otherwise plausible paste.
 */
export function parseBdsmtestCopyAll(input: string): BdsmtestCopyAllResult {
  if (input.length > MAX_BDSMTEST_COPY_CHARS) return { ok: false, error: "too-large" };

  const normalizedInput = normalizeCopyAllInput(input);
  const urls = new Set<string>();
  const byRole = new Map<string, number>();
  let invalidUrl = false;
  let invalidScore = false;

  for (const rawLine of normalizedInput.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    if (URLISH_RE.test(line)) {
      const clean = sanitizeBdsmtestUrl(line);
      if (!clean) invalidUrl = true;
      else urls.add(clean);
      continue;
    }

    const scoreMatch = line.match(SCORE_RE);
    if (!scoreMatch) {
      if (SCOREISH_RE.test(line)) invalidScore = true;
      continue;
    }

    const pct = Number.parseInt(scoreMatch[1], 10);
    const role = cleanRole(scoreMatch[2]);
    if (!role || pct < 0 || pct > 100) {
      invalidScore = true;
      continue;
    }

    const previous = byRole.get(role);
    if (previous !== undefined && previous !== pct) {
      invalidScore = true;
      continue;
    }
    if (byRole.size >= MAX_ROWS && previous === undefined) {
      invalidScore = true;
      continue;
    }
    byRole.set(role, pct);
  }

  if (invalidUrl) return { ok: false, error: "invalid-url" };
  if (urls.size === 0) return { ok: false, error: "missing-url" };
  if (urls.size > 1) return { ok: false, error: "multiple-urls" };
  if (invalidScore) return { ok: false, error: "invalid-results" };
  if (byRole.size === 0) return { ok: false, error: "missing-results" };

  const scores = Array.from(byRole, ([role, pct]) => ({ role, pct }))
    .sort((a, b) => b.pct - a.pct);
  return { ok: true, url: [...urls][0], scores };
}
