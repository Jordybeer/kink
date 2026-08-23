// The monogram wardrobe — a profile without a photo still deserves to be
// dressed. The name picks the outfit deterministically: same name, same
// duotone, every visit, on every surface. A soft key light at the top-left
// keeps the circle from reading as a flat sticker.

const AVATAR_DUOTONES: readonly (readonly [string, string])[] = [
  ["#d4527c", "#8f7ba8"], // raspberry → muted lavender — the house pair
  ["#e0447c", "#af1d73"], // rose → deep berry
  ["#f97316", "#e0447c"], // ember → rose
  ["#7c3aed", "#2563eb"], // violet → indigo
  ["#0ea5e9", "#7c3aed"], // sky → violet
  ["#10b981", "#0e7490"], // jade → deep teal
];

// djb2 — tiny, stable, and spread well enough for six outfits.
export function avatarSeed(name: string): number {
  let h = 5381;
  const s = name.trim().toLowerCase();
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

export function avatarDuotone(name: string): readonly [string, string] {
  return AVATAR_DUOTONES[avatarSeed(name) % AVATAR_DUOTONES.length];
}

/** Inline style for a default (photo-less) avatar circle. */
export function avatarStyle(name: string): React.CSSProperties {
  const seed = avatarSeed(name);
  const [a, b] = avatarDuotone(name);
  // Angle wanders 115°–165° per name — enough variety to feel individual,
  // never so steep the light flips to the wrong shoulder.
  const angle = 115 + (seed % 51);
  return {
    background: `radial-gradient(120% 120% at 28% 18%, rgba(255,255,255,0.30), transparent 45%), linear-gradient(${angle}deg, ${a}, ${b})`,
    color: "#fff",
    textShadow: "0 1px 2px rgba(0,0,0,0.35)",
    fontFamily: "var(--font-display, Georgia, serif)",
    fontWeight: 500,
  };
}