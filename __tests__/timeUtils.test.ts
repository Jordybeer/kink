import { describe, it, expect } from "vitest";
import { formatTime, parseTime, parseDurationMinutes, formatDurationMinutes } from "@/lib/timeUtils";

describe("formatTime", () => {
  it('formatTime(8, 5) === "08:05"', () => expect(formatTime(8, 5)).toBe("08:05"));
  it('formatTime(23, 45) === "23:45"', () => expect(formatTime(23, 45)).toBe("23:45"));
  it('formatTime(0, 0) === "00:00"', () => expect(formatTime(0, 0)).toBe("00:00"));
});

describe("parseTime", () => {
  it('parseTime("08:05") === {hour:8, minute:5}', () =>
    expect(parseTime("08:05")).toEqual({ hour: 8, minute: 5 }));
  it('parseTime("23:45") === {hour:23, minute:45}', () =>
    expect(parseTime("23:45")).toEqual({ hour: 23, minute: 45 }));
  it('parseTime("8:5") === null (strict HH:mm)', () =>
    expect(parseTime("8:5")).toBeNull());
  it('parseTime("24:00") === null', () => expect(parseTime("24:00")).toBeNull());
  it('parseTime("12:60") === null', () => expect(parseTime("12:60")).toBeNull());
  it('parseTime("") === null', () => expect(parseTime("")).toBeNull());
  it('parseTime("abc") === null', () => expect(parseTime("abc")).toBeNull());
});

describe("parseDurationMinutes", () => {
  it('parseDurationMinutes("30 min") === 30', () =>
    expect(parseDurationMinutes("30 min")).toBe(30));
  it('parseDurationMinutes("45min") === 45', () =>
    expect(parseDurationMinutes("45min")).toBe(45));
  it('parseDurationMinutes("") === null', () =>
    expect(parseDurationMinutes("")).toBeNull());
  it('parseDurationMinutes("morgen") === null', () =>
    expect(parseDurationMinutes("morgen")).toBeNull());
});

describe("formatDurationMinutes", () => {
  it('formatDurationMinutes(30) === "30 min"', () =>
    expect(formatDurationMinutes(30)).toBe("30 min"));
});
