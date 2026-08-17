import { describe, expect, it } from "vitest";
import {
  findDefaultContractPair,
  newContractHref,
  sortContractsNewestFirst,
} from "@/lib/contractOverview";
import type { ContractSnapshot, Profile } from "@/types";

function profile(
  id: string,
  name: string,
  personGroupId?: string,
): Profile {
  return {
    id,
    name,
    role: "Switch",
    personGroupId,
    experienceLevel: "ervaren",
    customKinks: [],
    createdAt: 1,
    updatedAt: 1,
    entries: {},
  };
}

function contract(
  id: string,
  date: number,
  profileAId: string,
  profileBId: string,
  profileAName = "Mira",
  profileBName = "Noiva",
): ContractSnapshot {
  return {
    id,
    date,
    profileAId,
    profileBId,
    profileAName,
    profileBName,
    matchCount: 3,
    hardLimitCount: 0,
    softLimitCount: 1,
    discussCount: 2,
  };
}

describe("contract overview helpers", () => {
  it("pairs the pinned profile with a different person", () => {
    const profiles = [
      profile("alex-dom", "Alex", "alex"),
      profile("alex-sub", "Alex", "alex"),
      profile("sam", "Sam"),
    ];

    expect(findDefaultContractPair(profiles, "alex-sub")?.map((item) => item.id))
      .toEqual(["alex-sub", "sam"]);
  });

  it("never treats two perspectives of one person as a contract pair", () => {
    const profiles = [
      profile("alex-dom", "Alex", "alex"),
      profile("alex-sub", "Alex", "alex"),
    ];

    expect(findDefaultContractPair(profiles, null)).toBeNull();
    expect(newContractHref(profiles, null)).toBe("/compare");
  });

  it("builds a direct contract route when a valid pair exists", () => {
    const profiles = [profile("mijn profiel", "Mira"), profile("partner/1", "Noor")];

    expect(newContractHref(profiles, "mijn profiel"))
      .toBe("/contract?a=mijn%20profiel&b=partner%2F1");
  });

  it("sorts unique profile combinations newest first without mutating store order", () => {
    const contracts = [
      contract("older", 100, "mira", "noiva-dom"),
      contract("newer", 200, "mira", "sam", "Mira", "Sam"),
    ];

    expect(sortContractsNewestFirst(contracts).map((item) => item.id))
      .toEqual(["newer", "older"]);
    expect(contracts.map((item) => item.id)).toEqual(["older", "newer"]);
  });

  it("keeps only the latest contract for the same profiles, even when A and B are reversed", () => {
    const contracts = [
      contract("older", 100, "mira", "noiva-dom"),
      contract("latest", 300, "noiva-dom", "mira", "Noiva", "Mira"),
    ];

    expect(sortContractsNewestFirst(contracts).map((item) => item.id))
      .toEqual(["latest"]);
  });

  it("keeps a separate latest contract when the same person uses another role profile", () => {
    const contracts = [
      contract("dom-older", 100, "mira", "noiva-dom"),
      contract("sub-latest", 250, "mira", "noiva-sub"),
      contract("dom-latest", 300, "mira", "noiva-dom"),
    ];

    expect(sortContractsNewestFirst(contracts).map((item) => item.id))
      .toEqual(["dom-latest", "sub-latest"]);
  });
});
