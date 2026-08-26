import { KINKS } from "@/lib/kinks";
import type { KinkEntry, KinkStatus } from "@/types";

const MAX_IMPORT_ROWS = 1_000;
const MAX_CONDITIONS = 20;
const MAX_CONDITION_LENGTH = 240;

const STATUS_MAP: Record<string, Exclude<KinkStatus, null>> = {
  YES: "yes",
  WILLING: "willing",
  MAYBE: "maybe",
  NO: "no",
  HARD_NO: "hard_no",
};

const CATALOG_IDS = new Set(KINKS.map((kink) => kink.id));

export interface DevQaProfileImport {
  entries: Record<string, KinkEntry>;
  sourceCount: number;
  matchedCount: number;
  invalidCount: number;
  unknownIds: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanConditions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((condition): condition is string => typeof condition === "string")
    .map((condition) => condition.trim().slice(0, MAX_CONDITION_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_CONDITIONS);
}

/**
 * Dev QA convenience importer for the flat catalog-list format used by manual
 * fixtures. Only id/status/conditions are accepted. Names, descriptions,
 * categories and safety copy always come from KinkSync's own current catalog.
 */
export function parseDevQaKinkList(raw: unknown): DevQaProfileImport {
  if (!Array.isArray(raw)) {
    throw new Error("Dit QA-bestand moet een lijst met kink-antwoorden bevatten.");
  }
  if (raw.length === 0) {
    throw new Error("Het QA-bestand is leeg.");
  }
  if (raw.length > MAX_IMPORT_ROWS) {
    throw new Error(`Te veel regels in QA-bestand (max. ${MAX_IMPORT_ROWS}).`);
  }

  const entries: Record<string, KinkEntry> = {};
  const unknownIds: string[] = [];
  const seen = new Set<string>();
  let invalidCount = 0;

  for (const candidate of raw) {
    if (!isRecord(candidate)) {
      invalidCount += 1;
      continue;
    }

    const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
    const rawStatus = typeof candidate.status === "string"
      ? candidate.status.trim().toUpperCase()
      : "";
    const status = STATUS_MAP[rawStatus];

    if (!id || !status || seen.has(id)) {
      invalidCount += 1;
      continue;
    }
    seen.add(id);

    if (!CATALOG_IDS.has(id)) {
      unknownIds.push(id);
      continue;
    }

    const conditions = cleanConditions(candidate.conditions);
    entries[id] = {
      status,
      comment: conditions.join(" · "),
    };
  }

  const matchedCount = Object.keys(entries).length;
  if (matchedCount === 0) {
    throw new Error("Geen antwoorden uit dit bestand komen overeen met de huidige KinkSync-catalogus.");
  }

  return {
    entries,
    sourceCount: raw.length,
    matchedCount,
    invalidCount,
    unknownIds,
  };
}

export function qaProfileNameFromFilename(filename: string): string {
  const withoutExtension = filename.replace(/\.json$/i, "");
  const withoutSuffix = withoutExtension.replace(/[\s_-]*kinksync$/i, "");
  return withoutSuffix.trim().slice(0, 80) || "QA import";
}
