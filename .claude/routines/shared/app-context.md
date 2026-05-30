# KinkSync — App Context

## What it is
KinkSync is a privacy-first PWA for couples and partners to map kink compatibility, compare preferences, and generate a BDSM negotiation contract. All data lives client-side in localStorage — there is no backend.

## Tech stack
- Next.js 14 (App Router), TypeScript, Tailwind CSS
- State: Zustand with `persist` middleware
- localStorage key: `kink-profiles` (version 8)
- E2E: Playwright (`pw-audit.mjs`, `e2e/` folder)
- Dev server: `npm run dev` → http://localhost:3000

## State shape (localStorage `kink-profiles`)
```json
{
  "state": {
    "profiles": [],          // Profile[]
    "contracts": [],         // ContractSnapshot[]
    "onboardingComplete": false,
    "profileTourComplete": false,
    "installPromptDismissed": false,
    "theme": "midnight",     // "midnight" | "red" | "forest" | "mono"
    "pinnedProfileId": null
  },
  "version": 8
}
```

## Profile shape
```typescript
{
  id: string;                    // uid — random alphanumeric
  name: string;
  role: string;                  // e.g. "submissive", "dominant", "switch"
  experienceLevel: "beginner" | "gevorderd" | "ervaren" | "diepgaand";
  relationshipStatus?: string;
  fetLifeUsername?: string;
  bdsmtestUrl?: string;
  privateNote?: string;
  avatarDataUrl?: string;
  isImported?: boolean;
  customKinks: { id: string; name: string }[];
  createdAt: number;             // Date.now()
  updatedAt: number;
  entries: Record<string, KinkEntry>;
}
```

## KinkEntry shape
```typescript
{
  status: "yes" | "willing" | "maybe" | "no" | "hard_no" | null;
  statusGive?: KinkStatus;
  statusReceive?: KinkStatus;
  direction?: "give" | "receive" | "both" | null;
  desire?: number | null;       // 1–5
  experienced?: boolean | null;
  score: number | null;         // deprecated, keep for compat
  comment: string;
  tags?: string[];
}
```

## ContractSnapshot shape
```typescript
{
  id: string;
  date: number;
  profileAId?: string;
  profileBId?: string;
  profileAName: string;
  profileBName: string;
  matchCount: number;
  hardLimitCount: number;
  softLimitCount: number;
  discussCount: number;
}
```

## Key routes
| Route | Description |
|---|---|
| `/` | Home — profile list, create form, nav CTAs |
| `/profile/[id]` | Profile detail — kink list, DNA bar, export FAB |
| `/compare` | Side-by-side comparison, heatmap, contract trigger |
| `/contract` | Contract builder + signature canvas |
| `/session` | Live session via WebRTC |

## Themes
Default is `midnight`. The app applies `data-theme` on `<html>`. Dark throughout.

## Important UX facts (from ux.md audit — all resolved)
- BottomNav at z-index 100: Home / Vergelijk / Sessie
- Onboarding overlay at z-index 500
- PWA install banner triggered by `visitCount` in a separate localStorage key (not in `kink-profiles`)
- Profile tour is a separate overlay from onboarding
- `--no` = amber `#fb923c`, `--hard-no` = red (visually distinct)
