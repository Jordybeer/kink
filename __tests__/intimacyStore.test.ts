import { beforeEach, describe, expect, it } from "vitest";
import { useIntimacyStore } from "@/lib/intimacyStore";

beforeEach(() => {
  useIntimacyStore.setState({ entries: [] });
});

describe("intimacy store", () => {
  it("keeps planning separate from completed history until the user logs it", () => {
    const id = useIntimacyStore.getState().addEntry({
      status: "planned",
      date: "2026-08-30",
      time: "20:30",
      title: "Date night",
    });

    const planned = useIntimacyStore.getState().entries.find((entry) => entry.id === id);
    expect(planned?.status).toBe("planned");
    expect(planned?.completedAt).toBeUndefined();

    useIntimacyStore.getState().updateEntry(id, {
      status: "completed",
      date: "2026-08-31",
      note: "Een dag later was beter",
    });
    const completed = useIntimacyStore.getState().entries.find((entry) => entry.id === id);
    expect(completed?.status).toBe("completed");
    expect(completed?.date).toBe("2026-08-31");
    expect(completed?.note).toBe("Een dag later was beter");
    expect(completed?.completedAt).toBeTypeOf("number");
  });

  it("can edit a planned moment without turning it into history", () => {
    const id = useIntimacyStore.getState().addEntry({
      status: "planned",
      date: "2026-08-30",
      time: "20:30",
    });

    useIntimacyStore.getState().updateEntry(id, { time: "21:15", title: "Later op de avond" });
    const entry = useIntimacyStore.getState().entries.find((candidate) => candidate.id === id);
    expect(entry?.status).toBe("planned");
    expect(entry?.time).toBe("21:15");
    expect(entry?.title).toBe("Later op de avond");
    expect(entry?.completedAt).toBeUndefined();
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

  it("restores backup entries idempotently and only accepts newer edits", () => {
    const existingId = useIntimacyStore.getState().addEntry({
      status: "planned",
      date: "2026-08-22",
      time: "20:00",
    });
    const existing = useIntimacyStore.getState().entries.find((entry) => entry.id === existingId)!;

    const result = useIntimacyStore.getState().restoreEntries([
      { ...existing, time: "21:00", updatedAt: existing.updatedAt + 10 },
      {
        id: "restored",
        status: "completed",
        date: "2026-08-20",
        createdAt: 1,
        updatedAt: 2,
        completedAt: 2,
      },
    ]);

    expect(result).toEqual({ added: 1, updated: 1, unchanged: 0 });
    expect(useIntimacyStore.getState().entries.find((entry) => entry.id === existingId)?.time).toBe("21:00");

    const again = useIntimacyStore.getState().restoreEntries([
      { ...existing, time: "19:00", updatedAt: existing.updatedAt },
    ]);
    expect(again).toEqual({ added: 0, updated: 0, unchanged: 1 });
    expect(useIntimacyStore.getState().entries.find((entry) => entry.id === existingId)?.time).toBe("21:00");
  });

  it("deletes only the requested entry", () => {
    const first = useIntimacyStore.getState().addEntry({ status: "completed", date: "2026-08-20" });
    const second = useIntimacyStore.getState().addEntry({ status: "completed", date: "2026-08-21" });

    useIntimacyStore.getState().deleteEntry(first);
    expect(useIntimacyStore.getState().entries.map((entry) => entry.id)).toEqual([second]);
  });
});
