import type { Profile, KinkEntry, KinkStatus, CustomKink } from "@/types";
import { KINKS } from "@/lib/kinks";

// ── v1 encoding (full JSON, used for copy-link) ──────────────────────────────

function compactEntry(entry: KinkEntry): Record<string, unknown> | null {
  const out: Record<string, unknown> = {};
  if (entry.status != null)        out.status = entry.status;
  if (entry.direction)             out.direction = entry.direction;
  if (entry.statusGive != null)    out.statusGive = entry.statusGive;
  if (entry.statusReceive != null) out.statusReceive = entry.statusReceive;
  if (entry.desire != null)        out.desire = entry.desire;
  if (entry.experienced != null)   out.experienced = entry.experienced;
  if (entry.comment)               out.comment = entry.comment;
  if (entry.tags?.length)          out.tags = entry.tags;
  // score is deprecated — never encoded
  return Object.keys(out).length > 0 ? out : null;
}

export function encodeProfile(profile: Profile, opts?: { includeFetLife?: boolean }): string {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { avatarDataUrl, fetLifeUsername, ...rest } = profile;

  const compactedEntries: Record<string, unknown> = {};
  for (const [id, entry] of Object.entries(rest.entries)) {
    const compact = compactEntry(entry);
    if (compact) compactedEntries[id] = compact;
  }

  const payload = {
    ...(opts?.includeFetLife && fetLifeUsername ? { ...rest, fetLifeUsername } : rest),
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
  y: "yes", g: "willing", m: "maybe", n: "no", H: "hard_no",
};

export function encodeProfileCompact(profile: Profile, opts?: { includeFetLife?: boolean }): string {
  // One char per kink in KINKS order — status only (desire/experienced omitted to keep QR scannable)
  const s = KINKS.map(k => {
    const st = profile.entries[k.id]?.status;
    return (st ? S_ENC[st] : undefined) ?? " ";
  }).join("");

  const ck = (profile.customKinks ?? []).map(c => {
    const e = profile.entries[c.id];
    const sc = (e?.status ? S_ENC[e.status] : undefined) ?? " ";
    return [c.id, c.name, sc];
  });

  const sg = KINKS.map(k => { const st = profile.entries[k.id]?.statusGive; return st ? (S_ENC[st] ?? " ") : " "; }).join("");
  const sr = KINKS.map(k => { const st = profile.entries[k.id]?.statusReceive; return st ? (S_ENC[st] ?? " ") : " "; }).join("");
  const DIR_ENC: Record<string, string> = { give: "g", receive: "r", both: "b" };
  const dr = KINKS.map(k => DIR_ENC[profile.entries[k.id]?.direction ?? ""] ?? " ").join("");

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
  if (sg.trim()) payload.sg = sg;
  if (sr.trim()) payload.sr = sr;
  if (dr.trim()) payload.dr = dr;
  if (profile.relationshipStatus) payload.rs = profile.relationshipStatus;
  if (opts?.includeFetLife && profile.fetLifeUsername) payload.fl = profile.fetLifeUsername;
  if (ck.length) payload.ck = ck;

  return toBase64Url(JSON.stringify(payload));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function decodeProfileCompactFromParsed(p: Record<string, any>): Profile {
  const entries: Record<string, KinkEntry> = {};

  for (let i = 0; i < KINKS.length; i++) {
    const status = S_DEC[p.s?.[i] ?? ""] ?? null;
    const statusGive = S_DEC[p.sg?.[i] ?? ""] ?? null;
    const statusReceive = S_DEC[p.sr?.[i] ?? ""] ?? null;
    const desire = p.d?.[i] !== "0" && p.d?.[i] ? parseInt(p.d[i]) : null;
    const experienced = p.x?.[i] === "1" ? true : p.x?.[i] === "0" ? false : null;
    const DIR_DEC: Record<string, import("@/types").KinkDirection> = { g: "give", r: "receive", b: "both" };
    const direction: import("@/types").KinkDirection = DIR_DEC[p.dr?.[i] ?? ""] ??
      ((statusGive !== null || statusReceive !== null)
        ? (statusGive && statusReceive ? "both" : statusGive ? "give" : "receive")
        : null);
    if (status !== null || statusGive !== null || statusReceive !== null || desire !== null || experienced !== null || direction !== null) {
      const entry: import("@/types").KinkEntry = { status, desire, experienced, score: null, comment: "" };
      if (statusGive !== null) entry.statusGive = statusGive;
      if (statusReceive !== null) entry.statusReceive = statusReceive;
      if (direction !== null) entry.direction = direction;
      entries[KINKS[i].id] = entry;
    }
  }

  const customKinks: CustomKink[] = [];
  for (const [id, name, sc, desireNum, exp] of (p.ck ?? [])) {
    customKinks.push({ id, name });
    const status = S_DEC[sc] ?? null;
    const desire = desireNum || null;
    const experienced = exp === true ? true : exp === false ? false : null;
    if (status !== null || desire !== null || experienced !== null) {
      entries[id] = { status, desire, experienced, score: null, comment: "" };
    }
  }

  return {
    id: p.id,
    name: p.n,
    role: p.r,
    experienceLevel: p.e,
    ...(p.rs ? { relationshipStatus: p.rs } : {}),
    ...(p.fl ? { fetLifeUsername: p.fl } : {}),
    customKinks,
    createdAt: p.ca,
    updatedAt: p.ua,
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
  return parsed as Profile;
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
