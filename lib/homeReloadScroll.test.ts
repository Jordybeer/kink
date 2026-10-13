import { afterEach, describe, expect, it, vi } from "vitest";
import { resetHomeScrollOnReload } from "./homeReloadScroll";

function browser(type = "reload", pathname = "/", hash = "") {
  const target = new EventTarget();
  let scrollY = 80;
  const frames: FrameRequestCallback[] = [];
  const location = { pathname, hash };
  vi.stubGlobal("window", {
    location,
    performance: { getEntriesByType: () => [{ type }] },
    scrollTo: ({ top }: ScrollToOptions) => { scrollY = top ?? scrollY; },
    requestAnimationFrame: (callback: FrameRequestCallback) => frames.push(callback),
    cancelAnimationFrame: (id: number) => { frames[id - 1] = () => {}; },
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
  });
  return {
    location,
    get y() { return scrollY; },
    restore: () => { scrollY = 80; },
    show: (persisted = false) => {
      target.dispatchEvent(Object.assign(new Event("pageshow"), { persisted }));
      frames.splice(0).forEach((callback) => callback(0));
    },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("Home reload scroll", () => {
  it("starts at the masthead and overrides late browser restoration at pageshow", () => {
    const page = browser();
    resetHomeScrollOnReload();
    expect(page.y).toBe(0);
    page.restore();
    page.show();
    expect(page.y).toBe(0);
    page.restore();
    page.show();
    expect(page.y).toBe(80);
  });

  it.each([
    ["navigate", "/", ""],
    ["back_forward", "/", ""],
    ["reload", "/profile/pw-alex-001", ""],
    ["reload", "/", "#details"],
  ])("preserves %s at %s%s", (type, path, hash) => {
    const page = browser(type, path, hash);
    resetHomeScrollOnReload();
    page.show();
    expect(page.y).toBe(80);
  });

  it("preserves a restored page from the back/forward cache", () => {
    const page = browser();
    resetHomeScrollOnReload();
    page.restore();
    page.show(true);
    expect(page.y).toBe(80);
  });

  it("does not reset another route if navigation wins the loading race", () => {
    const page = browser();
    resetHomeScrollOnReload();
    page.location.pathname = "/profile/pw-alex-001";
    page.restore();
    page.show();
    expect(page.y).toBe(80);
  });

  it("removes the pending restoration handler on cleanup", () => {
    const page = browser();
    const cleanup = resetHomeScrollOnReload();
    cleanup?.();
    page.restore();
    page.show();
    expect(page.y).toBe(80);
  });
});
