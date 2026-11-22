import type { FolioProfile } from "./fixtures";

const PARTS = ["avatar", "name", "role", "rule"] as const;
type Part = typeof PARTS[number];
export type Anchor = { part: Part; element: HTMLElement; rect: DOMRect };
export type Flight = { part: Part; ink: HTMLElement; origin: DOMRect };

export function measureAnchors(screen: HTMLElement, id: string): Anchor[] {
  return PARTS.flatMap(part => {
    const element = screen.querySelector<HTMLElement>(`[data-folio-${part}~="${CSS.escape(id)}"]`);
    if (!element) return [];
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height || rect.top < 0 || rect.bottom > innerHeight || rect.left < 0 || rect.right > innerWidth + 1) return [];
    // A fixed header, sheet or scrolled-away source cannot lend its identity.
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    if (!hit || !element.parentElement?.contains(hit)) return [];
    return [{ part, element, rect }];
  });
}

// The inert layer contains only four allowlisted pieces of the synthetic identity.
// Keep the actual links, headings and reading content in the route that owns them.
export function createInk(part: Part, profile: FolioProfile) {
  const ink = document.createElement("span");
  ink.dataset.folioFlight = part;
  ink.textContent = { avatar: profile.name.charAt(0), name: profile.name, role: profile.role, rule: "" }[part];
  return ink;
}

export function dressInk(ink: HTMLElement, { element, rect }: Anchor) {
  const style = getComputedStyle(element);
  Object.assign(ink.style, {
    width: `${rect.width}px`, height: `${rect.height}px`,
    fontFamily: style.fontFamily, fontWeight: style.fontWeight, fontStyle: style.fontStyle,
    fontSize: style.fontSize, lineHeight: style.lineHeight, letterSpacing: style.letterSpacing,
    color: style.color, textShadow: style.textShadow,
    backgroundColor: style.backgroundColor, backgroundImage: style.backgroundImage,
    borderRadius: style.borderRadius,
  });
}

export function pose(rect: DOMRect, base: DOMRect, part: Part) {
  const sx = rect.width / base.width;
  const sy = part === "rule" ? 1 : rect.height / base.height;
  return `translate3d(${rect.left}px, ${rect.top}px, 0) scale(${sx}, ${sy})`;
}
