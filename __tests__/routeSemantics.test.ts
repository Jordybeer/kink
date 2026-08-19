import { describe, expect, it } from "vitest";
import { routeChromeSemantics } from "@/lib/routeSemantics";

describe("route chrome semantics", () => {
  it("houdt canonical en legacy profielroutes in dezelfde profieltab", () => {
    expect(routeChromeSemantics("/profile").bottomNavSection).toBe("profile");
    expect(routeChromeSemantics("/profile/alex").bottomNavSection).toBe("profile");
    expect(routeChromeSemantics("/profile/alex").hideBottomNav).toBe(false);
  });

  it("behandelt de vragenlijst als focusroute met offline-veilige terugweg", () => {
    const route = routeChromeSemantics("/profile/alex%20one/questions");
    expect(route.hideBottomNav).toBe(true);
    expect(route.title).toBe("Vragenlijst");
    expect(route.back).toBe("/profile?id=alex%20one");
  });

  it("gebruikt één taal voor contractgeschiedenis en documenten", () => {
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

  it("noemt de editor contract opstellen en laat sceneplanner focus-mode", () => {
    expect(routeChromeSemantics("/contract")).toMatchObject({
      title: "Contract opstellen",
      back: "/compare",
    });
    expect(routeChromeSemantics("/scene")).toMatchObject({
      hideBottomNav: true,
      back: "/scenes",
    });
  });
});
