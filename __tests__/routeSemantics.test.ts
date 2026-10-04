import { describe, expect, it } from "vitest";
import { routeChromeSemantics } from "@/lib/routeSemantics";

describe("route chrome semantics", () => {
  it("houdt profielroutes in de persoonlijke ruimte", () => {
    expect(routeChromeSemantics("/profile").bottomNavSection).toBe("space");
    expect(routeChromeSemantics("/profile/alex").bottomNavSection).toBe("space");
    expect(routeChromeSemantics("/profile/alex").hideBottomNav).toBe(false);
    expect(routeChromeSemantics("/profile/alex").back).toBe("/space");
  });

  it("koppelt de drie experimentele hoofdbestemmingen aan stabiele tabs", () => {
    expect(routeChromeSemantics("/").bottomNavSection).toBe("space");
    expect(routeChromeSemantics("/space").bottomNavSection).toBe("space");
    expect(routeChromeSemantics("/together").bottomNavSection).toBe("together");
    expect(routeChromeSemantics("/moments").bottomNavSection).toBe("moments");
  });

  it("houdt bestaande functies bij hun nieuwe bovenliggende ruimte", () => {
    expect(routeChromeSemantics("/compare").bottomNavSection).toBe("together");
    expect(routeChromeSemantics("/contracts").bottomNavSection).toBe("together");
    expect(routeChromeSemantics("/contract").bottomNavSection).toBe("together");
    expect(routeChromeSemantics("/scenes").bottomNavSection).toBe("moments");
    expect(routeChromeSemantics("/profile").bottomNavSection).toBe("space");
  });

  it("houdt intimiteit als rustige focusroute onder Momenten", () => {
    expect(routeChromeSemantics("/intimacy")).toMatchObject({
      title: "Intimiteit",
      back: "/moments",
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

  it("houdt contractdetailroutes visueel bij Samen", () => {
    expect(routeChromeSemantics("/contracts/series/history")).toMatchObject({
      title: "Contractgeschiedenis",
      back: "/contracts/series",
      hideBottomNav: false,
      bottomNavSection: "together",
    });
    expect(routeChromeSemantics("/contracts/series/versions/v1")).toMatchObject({
      title: "Getekend document",
      back: "/contracts/series/history",
      hideBottomNav: false,
      bottomNavSection: "together",
    });
    expect(routeChromeSemantics("/timeline")).toMatchObject({
      title: "Contractgeschiedenis",
      back: "/contracts",
      hideBottomNav: false,
      bottomNavSection: "together",
    });
  });

  it("stuurt editors terug naar hun experimentele bovenliggende ruimte", () => {
    expect(routeChromeSemantics("/contract")).toMatchObject({
      title: "Contract opstellen",
      back: "/together",
      bottomNavSection: "together",
    });
    expect(routeChromeSemantics("/scene")).toMatchObject({
      hideBottomNav: true,
      back: "/moments",
    });
  });
});
