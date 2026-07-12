import type { BdsmtestScore } from "@/types";

/**
 * Parses the plain-text "copy results" output from bdsmtest.org.
 * Expected format (one result per line):
 *   == Results from bdsmtest.org ==
 *   100% Dominant
 *   97% Sadist
 *   ...
 * Lines that don't match the pattern are silently skipped.
 */
const MAX_ROWS = 100;
const MAX_ROLE_LEN = 64;

export function parseBdsmtestOutput(text: string): BdsmtestScore[] {
  const results: BdsmtestScore[] = [];
  for (const line of text.split("\n")) {
    if (results.length >= MAX_ROWS) break; // a paste is a guest, not a flood
    const match = line.trim().match(/^(\d+)%\s+(.+)$/);
    if (!match) continue;
    const pct = parseInt(match[1], 10);
    const role = match[2].trim().slice(0, MAX_ROLE_LEN);
    if (role && pct >= 0 && pct <= 100) {
      results.push({ role, pct });
    }
  }
  return results.sort((a, b) => b.pct - a.pct);
}
