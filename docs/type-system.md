# The Type System — house rules for every letter on the premises

Phase 28 (2026-07-09) put the whole wardrobe under contract. This file is the source of truth: if a size or face isn't sanctioned here, it doesn't get worn. Drift now has something concrete to violate.

## The two voices

| Voice | Font | Role |
|-------|------|------|
| **Display** | Cormorant Garamond via `var(--font-display)`, always *italic*, weight 400–500 | Titles, section headers, profile/kink names in hero positions, empty-state voices, primary CTA labels. The seductive voice. |
| **Body/UI** | DM Sans via `var(--font-sans)` | Everything else — body copy, buttons, labels, metadata, pills. The one giving clear instructions. |

**Never** serif on form labels, body paragraphs, or metadata. **Never** upright Cormorant — the italic is the identity.

## The size scale (Tailwind classes only — no arbitrary `text-[Npx]` for new work)

| Class | px | Role |
|-------|----|------|
| `text-4xl`–`text-2xl` | 36–24 | Page heroes, deck kink name, portrait names |
| `text-xl` / `text-lg` | 20/18 | Sheet + card titles, CTA serif labels |
| `text-base` | 16 | Section headers (Cormorant italic), prominent UI |
| `text-sm` | 14 | Body copy, list row names, control labels (SegmentedPill, ContextMenu, Accordion, Sheet options, FAB labels) |
| `text-xs` | 12 | **The floor for readable copy** — metadata, hints, counts, chart axes (uppercase tracking-widest sanctioned there only) |

## Sanctioned sub-floor exemptions (grandfathered, do not multiply)

- **Microbadge pills** (`rounded-full`/`rounded border` status/count chips): `text-[10px]`/`text-[11px]` native size — decorative density, not reading copy.
- **`font-mono` session log lines**: `text-[10px]` — diagnostics, deliberately dense.
- **TabBar labels**: `text-[10px]` under icons — platform convention.
- **QRModal check glyph**: `text-[8px]` — a drawn glyph, not text.

Anything sub-12px that a user must *read* (counts, "N resultaten", interactive status pill labels) is a bug — Phase 28 swept exactly those.

## Readability floor (mobile, 375px)

- Metadata ≥ 12px (`text-xs`), body ≥ 14px (`text-sm`).
- All `input`/`textarea`/`select` render ≥ 16px — enforced globally in `globals.css` (iOS Safari zoom guard, Phase 13). Don't undercut it with inline styles.
- Prose keeps default Tailwind leading (≥ 1.4). `leading-tight` only on single-line truncated serif titles.
- Contrast: AA everywhere — colour tokens verified in Phases 3e + 24c; new tokens must pass before shipping (`corrections.md` 2026-06-20).

## How to add type without getting spanked

1. Pick a role from the tables above; use its class. No inline `fontSize`.
2. New role that genuinely fits nothing? Add it *here* first, then use it.
3. Serif is a privilege, not a default — it marks moments, not furniture.
