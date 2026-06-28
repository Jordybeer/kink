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
export function parseBdsmtestOutput(text: string): BdsmtestScore[] {
  const results: BdsmtestScore[] = [];
  for (const line of text.split("\n")) {
    const match = line.trim().match(/^(\d+)%\s+(.+)$/);
    if (!match) continue;
    const pct = parseInt(match[1], 10);
    const role = match[2].trim();
    if (role && pct >= 0 && pct <= 100) {
      results.push({ role, pct });
    }
  }
  return results.sort((a, b) => b.pct - a.pct);
}
