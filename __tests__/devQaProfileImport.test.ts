import { describe, expect, it } from "vitest";
import {
  parseDevQaKinkList,
  qaProfileNameFromFilename,
} from "@/lib/devQaProfileImport";

describe("dev QA kink-list import", () => {
  it("maps fixture statuses onto current catalog entries and keeps conditions as comments", () => {
    const result = parseDevQaKinkList([
      {
        id: "spanking_hand_give",
        name: "Ignored fixture name",
        status: "WILLING",
        conditions: ["controlled intensity"],
      },
      {
        id: "rope_bondage_receive",
        status: "YES",
        conditions: [],
      },
      {
        id: "definitely_not_in_catalog",
        status: "MAYBE",
      },
    ]);

    expect(result.sourceCount).toBe(3);
    expect(result.matchedCount).toBe(2);
    expect(result.unknownIds).toEqual(["definitely_not_in_catalog"]);
    expect(result.entries.spanking_hand_give).toEqual({
      status: "willing",
      comment: "controlled intensity",
    });
    expect(result.entries.rope_bondage_receive).toEqual({
      status: "yes",
      comment: "",
    });
  });

  it("normalizes every supported flat-file status", () => {
    const result = parseDevQaKinkList([
      { id: "spanking_hand_give", status: "YES" },
      { id: "spanking_hand_receive", status: "WILLING" },
      { id: "flogging_give", status: "MAYBE" },
      { id: "flogging_receive", status: "NO" },
      { id: "punching_give", status: "HARD_NO" },
    ]);

    expect(result.entries.spanking_hand_give.status).toBe("yes");
    expect(result.entries.spanking_hand_receive.status).toBe("willing");
    expect(result.entries.flogging_give.status).toBe("maybe");
    expect(result.entries.flogging_receive.status).toBe("no");
    expect(result.entries.punching_give.status).toBe("hard_no");
  });

  it("skips malformed and duplicate rows instead of letting fixture metadata mutate the catalog", () => {
    const result = parseDevQaKinkList([
      { id: "spanking_hand_give", status: "YES" },
      { id: "spanking_hand_give", status: "HARD_NO" },
      { id: "flogging_give", status: "NOT_A_STATUS" },
      null,
    ]);

    expect(result.matchedCount).toBe(1);
    expect(result.invalidCount).toBe(3);
    expect(result.entries.spanking_hand_give.status).toBe("yes");
  });

  it("rejects non-list files and files without a current catalog match", () => {
    expect(() => parseDevQaKinkList({ profiles: [] })).toThrow(/lijst/i);
    expect(() => parseDevQaKinkList([{ id: "old_removed_kink", status: "YES" }])).toThrow(/catalogus/i);
  });

  it("derives a friendly QA profile name from the file name", () => {
    expect(qaProfileNameFromFilename("Mara-kinksync.json")).toBe("Mara");
    expect(qaProfileNameFromFilename("qa_fixture.JSON")).toBe("qa_fixture");
  });
});
