# Reusable UX Assertion Checklist

Apply these assertions to every page visited unless a persona overrides them.

## Global (every page)
- [ ] No uncaught JS errors in the browser console
- [ ] No React hydration warnings
- [ ] No layout overflow — no horizontal scrollbar at 390px viewport width
- [ ] BottomNav visible and all 3 tabs tappable (Home / Vergelijk / Sessie)
- [ ] Dark theme applied (`<html data-theme="midnight">` or another valid theme value)
- [ ] No content clipped or cut off at bottom (FAB / BottomNav overlap check)

## Typography & color
- [ ] `--no` kink pills are amber, not red
- [ ] `--hard-no` kink pills are red and visually distinct from `--no`
- [ ] No text smaller than 12px rendered
- [ ] All interactive elements have visible focus ring on keyboard nav

## Touch targets
- [ ] KinkRow pills are at least 44px tall in normal mode
- [ ] Session live-rating pills are at least 44px tall
- [ ] BottomNav items are at least 44px tall

## Accessibility
- [ ] `<h1>` present and unique per page
- [ ] All images have `alt` attributes
- [ ] Disabled CTAs use `aria-disabled` not `aria-hidden`

## Reporting format
Output a JSON block at the end:
```json
{
  "persona": "<name>",
  "pages_visited": [],
  "pass": 0,
  "fail": 0,
  "observations": [],
  "top_3_recommendations": []
}
```
