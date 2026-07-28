import type { Profile, KinkEntry, KinkStatus, CustomKink } from "@/types";
import { KINKS } from "@/lib/kinks";
import { sanitizeBdsmtestScores, sanitizeProfileFull } from "@/lib/sanitizeProfile";
import { clamp, MAX_CUSTOM_KINKS, MAX_ID_LEN, MAX_KINK_ID_LEN, MAX_KINK_NAME_LEN, MAX_NAME_LEN, MAX_ROLE_LEN, VALID_LEVELS } from "@/lib/sessionImport";

interface ShareProfileOptions {
  includeFetLife?: boolean;
  includePrivateResponses?: boolean;
}

// ── v1 encoding (full JSON, used for copy-link) ──────────────────────────────

function compactEntry(
  entry: KinkEntry,
  includePrivateResponses = false,
): Record<string, unknown> | null {
  if (entry.privateResponse === true && !includePrivateResponses) return null;

  const out: Record<string, unknown> = {};
  if (entry.status != null)             out.status = entry.status;
  if (entry.desire != null)             out.desire = entry.desire;
  if (entry.experienced != null)        out.experienced = entry.experienced;
  if (entry.comment)                    out.comment = entry.comment;
  if (entry.tags?.length)               out.tags = entry.tags;
  if (entry.curious === true)           out.curious = true;
  if (entry.privateResponse === true)   out.privateResponse = true;
  // score is deprecated — never encoded
  return Object.keys(out).length > 0 ? out : null;
}

export function encodeProfile(profile: Profile, opts?: ShareProfileOptions): string {
  // privateNote is called private for a reason — it never rides a share link.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { avatarDataUrl, fetLifeUsername, privateNote, ...rest } = profile;
  const includePrivateResponses = opts?.includePrivateResponses === true;

  const compactedEntries: Record<string, unknown> = {};
  for (const [id, entry] of Object.entries(rest.entries)) {
    const compact = compactEntry(entry, includePrivateResponses);
    if (compact) compactedEntries[id] = compact;
  }

  const customKinks = (rest.customKinks ?? []).filter(
    (kink) => includePrivateResponses || rest.entries[kink.id]?.privateResponse !== true,
  );
  const base = opts?.includeFetLife && fetLifeUsername
    ? { ...rest, fetLifeUsername }
    : rest;
  const payload = {
    ...base,
    customKinks,
    entries: compactedEntries,
  };

  const json = JSON.stringify(payload);
  return toBase64Url(json);
}

export function decodeProfile(encoded: string): Profile {
  return JSON.parse(fromBase64Url(encoded)) as Profile;
}

// ── v2 encoding (compact fixed-position, used for QR codes) ──────────────────

const S_ENC: Partial<Record<NonNullable<KinkStatus>, string>> = {
  yes: "y", willing: "g", maybe: "m", no: "n", hard_no: "H",
};
const S_DEC: Record<string, KinkStatus> = {
  y: "yes", g: "willing", c: "maybe", m: "maybe", n: "no", H: "hard_no",
};

export function encodeProfileCompact(profile: Profile, opts?: ShareProfileOptions): string {
  const includePrivateResponses = opts?.includePrivateResponses === true;
  const mayShare = (entry: KinkEntry | undefined) =>
    includePrivateResponses || entry?.privateResponse !== true;

  // One char per kink in KINKS order — status only (desire/experienced omitted to keep QR scannable)
  const s = KINKS.map(k => {
    const entry = profile.entries[k.id];
    if (!mayShare(entry)) return " ";
    const status = entry?.status;
    return (status ? S_ENC[status] : undefined) ?? " ";
  }).join("");
  const p = includePrivateResponses
    ? KINKS.map(k => profile.entries[k.id]?.privateResponse ? "1" : " ").join("")
    : "";

  const shareableCustomKinks = (profile.customKinks ?? []).filter(
    (custom) => mayShare(profile.entries[custom.id]),
  );
  const ck = shareableCustomKinks.map(c => {
    const entry = profile.entries[c.id];
    const statusCode = (entry?.status ? S_ENC[entry.status] : undefined) ?? " ";
    return [c.id, c.name, statusCode];
  });
  const pk = includePrivateResponses
    ? shareableCustomKinks
        .filter(c => profile.entries[c.id]?.privateResponse)
        .map(c => c.id)
    : [];

  const payload: Record<string, unknown> = {
    v: 2,
    id: profile.id,
    n: profile.name,
    r: profile.role,
    e: profile.experienceLevel,
    ca: profile.createdAt,
    ua: profile.updatedAt,
    s,
  };
  if (p.includes("1")) payload.p = p;
  if (profile.relationshipStatus) payload.rs = profile.relationshipStatus;
  if (opts?.includeFetLife && profile.fetLifeUsername) payload.fl = profile.fetLifeUsername;
  if (ck.length) payload.ck = ck;
  if (pk.length) payload.pk = pk;
  if (profile.bdsmtestScores?.length) payload.bs = profile.bdsmtestScores;

  return toBase64Url(JSON.stringify(payload));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function decodeProfileCompactFromParsed(p: Record<string, any>): Profile {
  const entries: Record<string, KinkEntry> = {};

  for (let i = 0; i < KINKS.length; i++) {
    let status = S_DEC[p.s?.[i] ?? ""] ?? null;
    // Legacy QR codes may encode sg/sr/dr — collapse into status for backward compat
    const statusGive = S_DEC[p.sg?.[i] ?? ""] ?? null;
    const statusReceive = S_DEC[p.sr?.[i] ?? ""] ?? null;
    if (status === null && (statusGive !== null || statusReceive !== null)) {
      const ORDER: import("@/types").KinkStatus[] = ["hard_no", "no", "maybe", "willing", "yes"];
      status = ORDER.find(s => s === statusGive || s === statusReceive) ?? statusGive ?? statusReceive;
    }
    const desire = p.d?.[i] !== "0" && p.d?.[i] ? parseInt(p.d[i]) : null;
    const experienced = p.x?.[i] === "1" ? true : p.x?.[i] === "0" ? false : null;
    const privateResponse = p.p?.[i] === "1";
    if (status !== null || desire !== null || experienced !== null || privateResponse) {
      entries[KINKS[i].id] = {
        status,
        desire,
        experienced,
        comment: "",
        ...(privateResponse ? { privateResponse: true } : {}),
      };
    }
  }

  const privateCustomIds = new Set(
    (Array.isArray(p.pk) ? p.pk : []).filter((id: unknown): id is string => typeof id === "string")
  );
  const customKinks: CustomKink[] = [];
  for (const row of (Array.isArray(p.ck) ? p.ck : [])) {
    if (customKinks.length >= MAX_CUSTOM_KINKS) break;
    if (!Array.isArray(row)) continue;
    const [id, name, sc, desireNum, exp] = row;
    if (typeof id !== "string" || typeof name !== "string") continue;
    const cleanId = clamp(id, MAX_KINK_ID_LEN);
    const cleanName = clamp(name, MAX_KINK_NAME_LEN);
    if (!cleanId || !cleanName) continue;
    customKinks.push({ id: cleanId, name: cleanName });
    const status = S_DEC[sc] ?? null;
    const desire = typeof desireNum === "number" && Number.isFinite(desireNum) && desireNum
      ? Math.min(5, Math.max(0, Math.round(desireNum))) : null;
    const experienced = exp === true ? true : exp === false ? false : null;
    const privateResponse = privateCustomIds.has(cleanId);
    if (status !== null || desire !== null || experienced !== null || privateResponse) {
      entries[cleanId] = {
        status,
        desire,
        experienced,
        comment: "",
        ...(privateResponse ? { privateResponse: true } : {}),
      };
    }
  }

  // The v2 wire fields get the same frisking as every other door — strings
  // clamped, enums enforced, scores capped. A QR code is still a stranger.
  if (typeof p.id !== "string" || typeof p.n !== "string") {
    throw new Error("Ongeldig profiel — verwacht veld ontbreekt");
  }
  const id = clamp(p.id, MAX_ID_LEN);
  const name = clamp(p.n, MAX_NAME_LEN);
  if (!id || !name) throw new Error("Ongeldig profiel — verwacht veld ontbreekt");
  const bdsmtestScores = sanitizeBdsmtestScores(p.bs);

  return {
    id,
    name,
    role: typeof p.r === "string" ? clamp(p.r, MAX_ROLE_LEN) : "",
    experienceLevel: typeof p.e === "string" && (VALID_LEVELS as readonly string[]).includes(p.e)
      ? (p.e as Profile["experienceLevel"]) : "beginner",
    ...(typeof p.rs === "string" && p.rs.trim() ? { relationshipStatus: clamp(p.rs, 200) } : {}),
    ...(typeof p.fl === "string" && p.fl.trim() ? { fetLifeUsername: clamp(p.fl, 200) } : {}),
    ...(bdsmtestScores ? { bdsmtestScores } : {}),
    customKinks,
    createdAt: typeof p.ca === "number" && Number.isFinite(p.ca) ? p.ca : Date.now(),
    updatedAt: typeof p.ua === "number" && Number.isFinite(p.ua) ? p.ua : Date.now(),
    entries,
    isImported: true,
  };
}

export function decodeProfileCompact(encoded: string): Profile {
  return decodeProfileCompactFromParsed(JSON.parse(fromBase64Url(encoded)));
}

// Decodes either v1 or v2 — use this on the import path
export function decodeAny(encoded: string): Profile {
  const parsed = JSON.parse(fromBase64Url(encoded));
  if (parsed.v === 2) return decodeProfileCompactFromParsed(parsed);
  // v1 payloads used to stroll in on a bare TypeScript cast — now the full
  // bouncer checks every field before the URL's word becomes store truth.
  const clean = sanitizeProfileFull(parsed);
  if (!clean) {
    throw new Error("Ongeldig profiel — verwacht veld ontbreekt");
  }
  return { ...clean, isImported: true };
}

// ── shared UTF-8-safe base64 helpers ─────────────────────────────────────────

function toBase64Url(json: string): string {
  return btoa(
    encodeURIComponent(json).replace(
      /%([0-9A-F]{2})/g,
      (_, p1) => String.fromCharCode(parseInt(p1, 16))
    )
  );
}

function fromBase64Url(encoded: string): string {
  return decodeURIComponent(
    Array.from(atob(encoded))
      .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("")
  );
}
