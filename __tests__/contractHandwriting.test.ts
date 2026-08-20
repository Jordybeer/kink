import { describe, expect, it } from "vitest";
import type { ContractVersionContent } from "@/lib/contractLifecycle";
import { hashContractContent } from "@/lib/contractLifecycle";
import {
  hasRequiredHandwrittenSignatures,
  isValidHandwrittenSignature,
  type ContractContentWithHandwriting,
  type HandwrittenSignature,
} from "@/lib/contractHandwriting";

function bitmap(fill: number): string {
  return Buffer.alloc(2400, fill).toString("base64url");
}

function signature(fill: number, capturedAt: number): HandwrittenSignature {
  return { schema: 1, width: 240, height: 80, bitmap: bitmap(fill), capturedAt };
}

function baseContent(): ContractVersionContent {
  const profileA = { profileId: "a", profileName: "Alex", role: "Dominant", verificationCode: "va" };
  const profileB = { profileId: "b", profileName: "Sam", role: "Submissive", verificationCode: "vb" };
  return {
    schema: 1,
    profileA,
    profileB,
    preamble: "Exact deze afspraken.",
    createdAt: 1_700_000_000_000,
    signalsA: { green: "Groen", amber: "Oranje", red: "Rood", black: "Zwart" },
    signalsB: { green: "Groen", amber: "Oranje", red: "Rood", black: "Zwart" },
    aftercareA: ["Knuffelen"],
    aftercareB: [],
    shared: [],
    softLimits: [],
    hardLimits: [],
    hardLimitDetails: [],
    discuss: [],
  };
}

describe("handwritten contract signatures", () => {
  it("requires two structurally valid handwritten signatures", () => {
    const first = signature(0xff, 10);
    const second = signature(0x55, 11);
    expect(isValidHandwrittenSignature(first)).toBe(true);
    expect(hasRequiredHandwrittenSignatures(baseContent())).toBe(false);

    const complete: ContractContentWithHandwriting = {
      ...baseContent(),
      handwrittenSignatures: { profileA: first, profileB: second },
    };
    expect(hasRequiredHandwrittenSignatures(complete)).toBe(true);
  });

  it("makes the handwritten signature part of the canonical contract hash", async () => {
    const first: ContractContentWithHandwriting = {
      ...baseContent(),
      handwrittenSignatures: {
        profileA: signature(0xff, 10),
        profileB: signature(0x55, 11),
      },
    };
    const altered: ContractContentWithHandwriting = {
      ...first,
      handwrittenSignatures: {
        ...first.handwrittenSignatures!,
        profileB: signature(0x33, 11),
      },
    };

    expect(await hashContractContent(first)).not.toBe(await hashContractContent(altered));
  });

  it("rejects malformed or truncated bitmap data", () => {
    expect(isValidHandwrittenSignature({
      schema: 1,
      width: 240,
      height: 80,
      bitmap: Buffer.alloc(3).toString("base64url"),
      capturedAt: 12,
    })).toBe(false);
  });
});
