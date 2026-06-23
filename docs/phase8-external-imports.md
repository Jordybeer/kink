# Phase 8 — External Imports: Exploration Doc

> Research-first. No code until this doc is read and agreed. Each section ends with a recommended action and an open question for the user.

---

## 1. BDSMtest.org meaningful use

### Current state
We link out to `bdsmtest.org` from the profile page. Users see their archetype percentages there but nothing flows back into KinkSync.

### Options considered

**A — User pastes their result URL / percentage text**
BDSMtest gives each result a unique URL like `bdsmtest.org/result/XXXX`. The page shows a list of archetypes with percentages (e.g. "Master/Mistress 94%, Dominant 88%, …"). A user could paste that URL or copy the text.

- Parse the text with a small regex: `(\w[\w /]+?)\s+(\d+)%` → `[{ archetype: string, pct: number }]`
- Map archetypes → suggested kink defaults using a lookup table (see section 4 below)
- Surface as a "seed your profile from BDSMtest" onboarding CTA

**B — Scrape the result page on paste of URL**
If the user pastes their result URL, we `fetch()` the page and parse the DOM.
- Blocked by CORS unless we proxy — **requires a backend route**, which violates the no-backend constraint. Skip.

**C — Display alongside DNA bar**
Show a "BDSMtest archetypes" strip on the profile page, stored in the profile object.
- Adds a new field to `Profile` type and the Zustand store.
- Deferred until we know users want it. Don't build until option A is validated.

### Recommended action
Implement option A: a text-paste input that tokenizes archetype lines and seeds kink statuses. One-page flow, no backend, no new store fields until we decide what to persist.

### Open question
> Do you want archetype→kink suggestions to *replace* unrated kinks, or *pre-fill* only empty slots (leaving existing ratings alone)?

---

## 2. FetLife kinks import (paste text)

### Current state
No integration. FetLife has no public API.

### Option A — Paste kink list text
FetLife's "My Fetishes" page shows a plain list: one fetish per line, e.g.:
```
Bondage
Impact play
Wax play
```

Flow:
1. User copies their FetLife fetish list and pastes into a textarea.
2. We tokenize by newline, trim, and fuzzy-match each item against `lib/kinks.ts` names.
3. Matches above a threshold (e.g. Jaro-Winkler ≥ 0.85) get pre-filled to `"willing"` (conservative default).
4. Near-matches surface in a review step: "Did you mean _Wax & temperature play_? Yes / No".
5. Unmatched terms are added as custom kinks.

### Fuzzy matching
No package needed — implement `jaroWinkler(a, b): number` in `lib/kinkAliases.ts` (≈ 40 lines). Pure function, fully testable.

### Recommended action
Build `lib/kinkAliases.ts` with:
1. `jaroWinkler(a, b)` — pure string similarity
2. `matchKinkByName(term, kinks, threshold?)` — returns best match or null
3. A seed alias table for the most common FetLife spellings that don't fuzzy-match (e.g. "CBT" → "cock and ball torture", "CNC" → "consensual non-consent")

Test coverage: 100% on the pure functions. No React until the matching logic is solid.

### Open question
> What default status should a FetLife import assign? `"willing"` (conservative) or `"maybe"` (exploratory)?

---

## 3. Duplicate matching (`lib/kinkAliases.ts`)

### Problem
If the user has rated "bondage" via the main list, and the FetLife import also matches "bondage", we'd double-count or silently overwrite.

### Rules
- **Import never overwrites an existing rating.** If `profile.entries[kink.id]?.status` is non-null, skip.
- **Custom kinks deduplicate by name (case-insensitive).** Before adding a custom kink, check if one with the same normalised name already exists.
- **The alias table prevents double-matching.** E.g. if "Rope bondage" and "Shibari" both match `bondage_rope`, only one entry gets created.

### Alias table structure (`lib/kinkAliases.ts`)
```ts
export const KINK_ALIASES: Record<string, string[]> = {
  bondage_rope: ["shibari", "kinbaku", "rope bondage", "rope play"],
  impact_play:  ["spanking", "flogging", "caning", "whipping", "paddling"],
  wax_play:     ["wax", "temperature play", "fire play"],
  // …
};
```

`matchKinkByName` checks aliases first (exact match on alias list), then falls back to fuzzy.

### Open question
> How many aliases should we seed? Suggest starting with the top 20 most common FetLife terms that don't match verbatim, and growing from there.

---

## 4. Archetype → kink mapping (BDSMtest)

BDSMtest archetypes to seed on import (high percentage → mark kinks as `"yes"`, mid → `"willing"`, low → skip):

| Archetype | Suggested kinks to seed |
|---|---|
| Dominant | bondage, control, discipline, service_receiving |
| Submissive | bondage, obedience, service_giving |
| Master/Mistress | ownership, protocol, 24/7, total_power_exchange |
| Slave | service_giving, obedience, total_power_exchange |
| Sadist | impact_play, pain_giving, humiliation_giving |
| Masochist | impact_play, pain_receiving, endurance |
| Brat | resistance, teasing, bratting |
| Brat Tamer | discipline, control |
| Voyeur | watching, exhibitionism_adjacent |
| Exhibitionist | performance, public_play |
| Rope Bunny | bondage_rope, restraint_receiving |
| Rigger | bondage_rope, restraint_giving |
| Switch | (all of the above at "maybe" threshold) |

This table is a starting point. Needs review against `lib/kinks.ts` IDs before coding.

### Open question
> Should we show the archetype mapping before applying it ("here's what we'd pre-fill — accept?"), or apply silently and let the user edit?

---

## 5. Identity-vs-dynamic kink split

### Problem
Some kinks describe *who someone is* ("voyeur identity") vs. *what they do in a scene* ("voyeur play"). Mixing these in the same list makes the DNA bar misleading — a person who identifies as an exhibitionist isn't necessarily rating every scene activity.

### Proposed approach
Add `identity?: boolean` flag to `Kink` in `lib/kinks.ts` for entries like:
- "voyeur" (as identity)
- "exhibitionist" (as identity)
- "Dominant" / "submissive" (role identity — already captured in `Profile.role`)

Surface identity kinks in a separate "Wie ik ben" (Who I am) strip on `ProfileHero`, distinct from the kink activity DNA.

### Scope
- `lib/kinks.ts` — add `identity?: boolean` to affected entries
- `types/index.ts` — add field to `Kink` type
- `components/ProfileHero.tsx` — render identity strip
- `app/profile/[id]/page.tsx` — filter identity kinks out of the main list or show separately

### Open question
> How many kinks are "identity" kinks? Estimate ~8–15 in the current list. Should we audit them together before adding the flag?

---

## Recommended execution order

| # | Item | Prerequisite |
|---|---|---|
| 1 | `lib/kinkAliases.ts` — alias table + fuzzy match | None — pure logic, start here |
| 2 | FetLife paste import UI | kinkAliases.ts complete |
| 3 | BDSMtest text-paste import | kinkAliases.ts complete |
| 4 | Identity kink flag | Design review with user |
| 5 | Archetype→kink seeding | BDSMtest import + alias table |

None of these require a backend. All state stays in Zustand/localStorage.
