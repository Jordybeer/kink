import { describe, expect, it } from "vitest";
import { DIRECTIONAL_KINK_PAIRS, partnerDirectionalKinkId } from "@/lib/directionality";

describe("taxonomy directionality additions", () => {
  it("keeps oral and manual stimulation as explicit give/receive pairs", () => {
    expect(DIRECTIONAL_KINK_PAIRS).toHaveLength(55);
    expect(DIRECTIONAL_KINK_PAIRS).toContainEqual({
      conceptId: "oral_sex",
      giveId: "oral_sex_give",
      receiveId: "oral_sex_receive",
    });
    expect(DIRECTIONAL_KINK_PAIRS).toContainEqual({
      conceptId: "manual_stimulation",
      giveId: "manual_stimulation_give",
      receiveId: "manual_stimulation_receive",
    });
    expect(partnerDirectionalKinkId("oral_sex_give")).toBe("oral_sex_receive");
    expect(partnerDirectionalKinkId("manual_stimulation_receive")).toBe("manual_stimulation_give");
  });
});
