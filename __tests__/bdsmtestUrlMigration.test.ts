import { describe, expect, it } from "vitest";
import { migrateStoredBdsmtestUrlV25 } from "@/lib/storeCore";
import type { Profile } from "@/types";

function profile(bdsmtestUrl?: string): Profile {
  return {
    id: "p1",
    name: "Val",
    role: "Domme",
    experienceLevel: "ervaren",
    customKinks: [],
    createdAt: 1,
    updatedAt: 2,
    entries: {},
    ...(bdsmtestUrl !== undefined ? { bdsmtestUrl } : {}),
  } as Profile;
}

describe("migrateStoredBdsmtestUrlV25", () => {
  it("laat een canonieke bdsmtest.org-resultaatlink met rust", () => {
    const state = { profiles: [profile("https://bdsmtest.org/r/abc")] };
    migrateStoredBdsmtestUrlV25(state, 24);
    expect(state.profiles[0].bdsmtestUrl).toBe("https://bdsmtest.org/r/abc");
  });

  it("maakt een oude www/http/tracking-link canoniek", () => {
    const state = { profiles: [profile("http://www.bdsmtest.org/r/abc?utm_source=old#result")] };
    migrateStoredBdsmtestUrlV25(state, 24);
    expect(state.profiles[0].bdsmtestUrl).toBe("https://bdsmtest.org/r/abc");
  });

  it("gooit een vreemd protocol dat vóór de fix is opgeslagen alsnog weg", () => {
    const state = { profiles: [profile("javascript:alert(1)")] };
    migrateStoredBdsmtestUrlV25(state, 24);
    expect(state.profiles[0].bdsmtestUrl).toBeUndefined();
  });

  it("gooit een look-alike domein alsnog weg", () => {
    const state = { profiles: [profile("https://bdsmtest.org.kwaad.example/r/abc")] };
    migrateStoredBdsmtestUrlV25(state, 24);
    expect(state.profiles[0].bdsmtestUrl).toBeUndefined();
  });

  it("gooit een andere route op hetzelfde domein weg", () => {
    const state = { profiles: [profile("https://bdsmtest.org/about")] };
    migrateStoredBdsmtestUrlV25(state, 24);
    expect(state.profiles[0].bdsmtestUrl).toBeUndefined();
  });

  it("raakt profielen zonder link niet aan", () => {
    const original = profile();
    const state = { profiles: [original] };
    migrateStoredBdsmtestUrlV25(state, 24);
    expect(state.profiles[0]).toBe(original);
  });

  it("doet niets meer zodra de opslag al op v25 staat", () => {
    const state = { profiles: [profile("javascript:alert(1)")] };
    migrateStoredBdsmtestUrlV25(state, 25);
    expect(state.profiles[0].bdsmtestUrl).toBe("javascript:alert(1)");
  });
});
