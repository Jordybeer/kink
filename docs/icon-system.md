# Icon system

## Source of truth

KinkSync uses `@phosphor-icons/react` for every generic interface icon. Do not add Lucide, React Icons, Heroicons, Font Awesome, Iconify, Icons8 PNGs, hand-drawn interface SVGs, or emoji as controls.

Two explicit exceptions exist:

- a dedicated, decorative brand mark such as `components/brand/FetLifeMark.tsx`;
- SVG used as an actual data visualisation, not as an interface icon.

Both exceptions must be explicitly accessible: decorative SVG uses `aria-hidden="true"`; informative visualisation uses `role="img"` and `aria-label`.

## Accessibility

Every Phosphor instance must declare its purpose:

- decorative beside visible text or inside a labelled control: `aria-hidden="true"`;
- independently informative: a concise `aria-label`;
- icon-only buttons and links: the interactive element itself also requires a specific `aria-label`.

Never rely on the icon name, `title`, colour, or shape as the only accessible description.

## Visual policy

- regular weight is the default;
- bold or fill is reserved for selected states and strong status signals;
- 16–18 px for ordinary controls;
- 20–24 px for standalone navigation or empty-state emphasis;
- keep a minimum 44 px interactive target even when the visible icon is smaller;
- use `currentColor` through Phosphor rather than hardcoded icon colours.

## Enforcement

Run:

```sh
npm run icons:check
```

The check is part of both `lint` and `prebuild`, so violations block CI and preview/production builds.
