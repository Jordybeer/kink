import { describe, expect, it } from "vitest";
import { routeChromeSemantics } from "@/lib/routeSemantics";

describe("route chrome semantics", () => {
  it("houdt canonical en legacy profielroutes in dezelfde profieltab", () => {
    expect(routeChromeSemantics("/profile").bottomNavSection).toBe("profile");
    expect(routeChromeSemantics("/profile/alex").bottomNavSection).toBe("profile");
    expect(routeChromeSemantics("/profile/alex").hideBottomNav).toBe(false);
  });

  it("koppelt de vijf primaire PWA-bestemmingen aan stabiele tabs", () => {
    expect(routeChromeSemantics("/").bottomNavSection).toBe("home");
    expect(routeChromeSemantics("/compare").bottomNavSection).toBe("compare");
    expect(routeChromeSemantics("/contracts").bottomNavSection).toBe("contracts");
    expect(routeChromeSemantics("/scenes").bottomNavSection).toBe("scenes");
    expect(routeChromeSemantics("/profile").bottomNavSection).toBe("profile");
  });

  it("behandelt de vragenlijst als focusroute met offline-veilige terugweg", () => {
    const route = routeChromeSemantics("/profile/alex%20one/questions");
    expect(route.hideBottomNav).toBe(true);
    expect(route.title).toBe("Vragenlijst");
    expect(route.back).toBe("/profile?id=alex%20one");
  });

  it("houdt contractdetailroutes visueel bij de contracttab", () => {
    expect(routeChromeSemantics("/contracts/series/history")).toMatchObject({
      title: "Contractgeschiedenis",
      back: "/contracts/series",
      hideBottomNav: false,
      bottomNavSection: "contracts",
    });
    expect(routeChromeSemantics("/contracts/series/versions/v1")).toMatchObject({
      title: "Getekend document",
      back: "/contracts/series/history",
      hideBottomNav: false,
      bottomNavSection: "contracts",
    });
    expect(routeChromeSemantics("/timeline")).toMatchObject({
      title: "Contractgeschiedenis",
      back: "/contracts",
      hideBottomNav: false,
      bottomNavSection: "contracts",
    });
  });

  it("noemt de editor contract opstellen en laat sceneplanner focus-mode", () => {
    expect(routeChromeSemantics("/contract")).toMatchObject({
      title: "Contract opstellen",
      back: "/compare",
      bottomNavSection: "contracts",
    });
    expect(routeChromeSemantics("/scene")).toMatchObject({
      hideBottomNav: true,
      back: "/scenes",
    });
  });
});
