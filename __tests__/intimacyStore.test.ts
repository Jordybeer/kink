import { beforeEach, describe, expect, it } from "vitest";
import { useIntimacyStore } from "@/lib/intimacyStore";

beforeEach(() => {
  useIntimacyStore.setState({ entries: [] });
});

describe("intimacy store", () => {
  it("keeps planning separate from completed history", () => {
    const id = useIntimacyStore.getState().addEntry({
      status: "planned",
      date: "2026-08-30",
      time: "20:30",
      title: "Date night",
    });

    const planned = useIntimacyStore.getState().entries.find((entry) => entry.id === id);
    expect(planned?.status).toBe("planned");
    expect(planned?.completedAt).toBeUndefined();

    useIntimacyStore.getState().completeEntry(id);
    const completed = useIntimacyStore.getState().entries.find((entry) => entry.id === id);
    expect(completed?.status).toBe("completed");
    expect(completed?.completedAt).toBeTypeOf("number");
  });

  it("can log an already completed moment directly", () => {
    const id = useIntimacyStore.getState().addEntry({
      status: "completed",
      date: "2026-08-22",
      note: "Goed om te onthouden",
    });

    const entry = useIntimacyStore.getState().entries.find((candidate) => candidate.id === id);
    expect(entry?.status).toBe("completed");
    expect(entry?.completedAt).toBeTypeOf("number");
  });

  it("deletes only the requested entry", () => {
    const first = useIntimacyStore.getState().addEntry({ status: "completed", date: "2026-08-20" });
    const second = useIntimacyStore.getState().addEntry({ status: "completed", date: "2026-08-21" });

    useIntimacyStore.getState().deleteEntry(first);
    expect(useIntimacyStore.getState().entries.map((entry) => entry.id)).toEqual([second]);
  });
});
