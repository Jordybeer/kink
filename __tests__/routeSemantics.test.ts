import { describe, expect, it } from "vitest";
import { routeChromeSemantics } from "@/lib/routeSemantics";

describe("route chrome semantics", () => {
  it("keeps canonical and legacy profile pages in the same tab section", () => {
    expect(routeChromeSemantics("/profile").bottomNavSection).toBe("profile");
    expect(routeChromeSemantics("/profile/alex").bottomNavSection).toBe("profile");
    expect(routeChromeSemantics("/profile/alex").hideBottomNav).toBe(false);
  });

  it("treats the questionnaire as focused and returns to the offline-safe profile shell", () => {
    const route = routeChromeSemantics("/profile/alex%20one/questions");
    expect(route.hideBottomNav).toBe(true);
    expect(route.title).toBe("Vragenlijst");
    expect(route.back).toBe("/profile?id=alex%20one");
  });

  it("gives contract history and documents one consistent navigation language without hiding existing tabs", () => {
    expect(routeChromeSemantics("/contracts/series/history")).toMatchObject({
      title: "Contractgeschiedenis",
      back: "/contracts/series",
      hideBottomNav: false,
    });
    expect(routeChromeSemantics("/contracts/series/versions/v1")).toMatchObject({
      title: "Getekend document",
      back: "/contracts/series/history",
      hideBottomNav: false,
    });
    expect(routeChromeSemantics("/timeline")).toMatchObject({
      title: "Contractgeschiedenis",
      back: "/contracts",
      hideBottomNav: false,
    });
  });
});
