import { describe, expect, it } from "vitest";
import { routeChromeSemantics } from "@/lib/routeSemantics";

describe("route chrome semantics", () => {
  it("groepeert Home en profiel onder Ik", () => {
    expect(routeChromeSemantics("/").bottomNavSection).toBe("self");
    expect(routeChromeSemantics("/profile").bottomNavSection).toBe("self");
    expect(routeChromeSemantics("/profile/alex").bottomNavSection).toBe("self");
    expect(routeChromeSemantics("/profile/alex").hideBottomNav).toBe(false);
  });

  it("groepeert vergelijken en afspraken onder Samen", () => {
    expect(routeChromeSemantics("/compare").bottomNavSection).toBe("together");
    expect(routeChromeSemantics("/contracts").bottomNavSection).toBe("together");
    expect(routeChromeSemantics("/contracts/series/history").bottomNavSection).toBe("together");
    expect(routeChromeSemantics("/contracts/series/versions/v1").bottomNavSection).toBe("together");
    expect(routeChromeSemantics("/timeline").bottomNavSection).toBe("together");
  });

  it("groepeert scènes onder Momenten zonder de focusflows open te trekken", () => {
    expect(routeChromeSemantics("/scenes").bottomNavSection).toBe("moments");
    expect(routeChromeSemantics("/scene")).toMatchObject({
      hideBottomNav: true,
      back: "/scenes",
      bottomNavSection: null,
    });
    expect(routeChromeSemantics("/intimacy")).toMatchObject({
      title: "Intimiteit",
      back: "/",
      hideBottomNav: true,
      bottomNavSection: null,
    });
  });

  it("behandelt de vragenlijst als focusroute met offline-veilige terugweg", () => {
    const route = routeChromeSemantics("/profile/alex%20one/questions");
    expect(route.hideBottomNav).toBe(true);
    expect(route.title).toBe("Vragenlijst");
    expect(route.back).toBe("/profile?id=alex%20one");
  });

  it("houdt bestaande parent-links intact", () => {
    expect(routeChromeSemantics("/contracts/series/history")).toMatchObject({
      title: "Contractgeschiedenis",
      back: "/contracts/series",
    });
    expect(routeChromeSemantics("/contracts/series/versions/v1")).toMatchObject({
      title: "Getekend document",
      back: "/contracts/series/history",
    });
    expect(routeChromeSemantics("/contract")).toMatchObject({
      title: "Contract opstellen",
      back: "/compare",
      bottomNavSection: "together",
    });
  });
});
