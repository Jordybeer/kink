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
| `text-base` | 16 | Default prose/body, form content, section headers (Cormorant italic), prominent UI |
| `text-sm` | 14 | Secondary copy, metadata that matters, list row names, control labels, tabs and compact actions |
| `text-xs` | 12 | **Tertiary floor only** — optional hints, timestamps, counts, chart axes and eyebrows. Never sustained prose or a required action label. |

The old habit of using `text-xs` for ordinary content made technically valid text feel needlessly small on a real phone. Prefer semantic hierarchy over density: if a user must read it to understand, decide or act, start at 14px; ordinary prose starts at 16px.

## Sanctioned sub-floor exemptions (grandfathered, do not multiply)

- **Microbadge pills** (`rounded-full`/`rounded border` status/count chips): `text-[10px]`/`text-[11px]` only when the text is genuinely decorative/tertiary and not required to understand the state.
- **`font-mono` session log lines**: `text-[10px]` — diagnostics, deliberately dense.
- **QRModal check glyph**: `text-[8px]` — a drawn glyph, not text.

Navigation labels are **not** a sub-floor exemption. Fixed bottom/tab navigation should render at least 12px; normal interactive labels and actions render at least 14px.

Anything sub-12px that a user must *read* (counts, "N resultaten", interactive status pill labels) is a bug. Anything at 12px that carries sustained prose, a decision or an action is also a bug.

## Readability floor (mobile, 375px)

- Default prose/body ≥ 16px (`text-base`). Compact supporting body may use 14px (`text-sm`).
- Meaningful metadata, labels and normal actions ≥ 14px (`text-sm`). Tertiary metadata may use 12px (`text-xs`).
- Bottom/tab navigation labels ≥ 12px.
- All `input`/`textarea`/`select` render ≥ 16px — enforced globally in `globals.css` (iOS Safari zoom guard, Phase 13). Don't undercut it with inline styles.
- Prose keeps default Tailwind leading (≥ 1.4). `leading-tight` only on single-line truncated serif titles.
- Contrast: AA everywhere — colour tokens verified in Phases 3e + 24c; new tokens must pass before shipping (`corrections.md` 2026-06-20).

## How to add type without getting spanked

1. Pick a role from the tables above; use its class. No inline `fontSize`.
2. New role that genuinely fits nothing? Add it *here* first, then use it.
3. Serif is a privilege, not a default — it marks moments, not furniture.
