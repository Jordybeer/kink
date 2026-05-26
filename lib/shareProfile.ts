import type { Profile } from "@/types";

export function encodeProfile(profile: Profile, opts?: { includeFetLife?: boolean }): string {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { avatarDataUrl, fetLifeUsername, ...rest } = profile;
  const stripped = opts?.includeFetLife && fetLifeUsername
    ? { ...rest, fetLifeUsername }
    : rest;
  const json = JSON.stringify(stripped);
  return btoa(
    encodeURIComponent(json).replace(
      /%([0-9A-F]{2})/g,
      (_, p1) => String.fromCharCode(parseInt(p1, 16))
    )
  );
}

export function decodeProfile(encoded: string): Profile {
  const json = decodeURIComponent(
    Array.from(atob(encoded))
      .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("")
  );
  return JSON.parse(json) as Profile;
}
