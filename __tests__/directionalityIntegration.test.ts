import { beforeEach, describe, expect, it } from "vitest";
import type { KinkEntry, Profile } from "@/types";
import { directionalComparisonEntries } from "@/lib/directionality";
import { profileMatchScore } from "@/lib/matching";
import { useStore } from "@/lib/store";
import { createConsentSnapshot, generateProfileOwnerKey, signProfileConsent } from "@/lib/consentProof";
import { decodeSharedProfile, encodeProfileV3 } from "@/lib/profileShareV3";
import { addProfileQrPart, buildProfileQrSet, type ProfileQrAssembly } from "@/lib/profileQr";
import { parseSharePaste } from "@/lib/parseSharePaste";

function entry(status: KinkEntry["status"], extra: Partial<KinkEntry> = {}): KinkEntry {
  return { status, comment: "", ...extra };
}

function profile(id: string, entries: Record<string, KinkEntry>): Profile {
  return {
    id, name: id, role: "Switch", perspective: "dominant", origin: "own",
    experienceLevel: "gevorderd", customKinks: [], createdAt: 1, updatedAt: 2, entries,
  };
}

function noise(length: number): string {
  let x = 0x12345678;
  let out = "";
  for (let index = 0; index < length; index += 1) {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    out += String.fromCharCode(33 + ((x >>> 0) % 90));
  }
  return out;
}

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});

describe("directionality consumer contract", () => {
  it("resolves one concrete A entry against B's explicit counterpart and keeps ordinary IDs unchanged", () => {
    const a = { pegging_give: entry("yes"), spanking_hand: entry("willing") };
    const b = { pegging_receive: entry("maybe"), spanking_hand: entry("yes") };

    const pegging = directionalComparisonEntries(a, b, "pegging_give");
    expect(pegging.sourceKinkId).toBe("pegging_give");
    expect(pegging.partnerKinkId).toBe("pegging_receive");
    expect(pegging.sourceEntry.status).toBe("yes");
    expect(pegging.partnerEntry.status).toBe("maybe");

    const goldenA = { watersports_geven: entry("yes") };
    const goldenB = { watersports_ontvangen: entry("willing") };
    const golden = directionalComparisonEntries(goldenA, goldenB, "watersports_geven");
    expect(golden.partnerKinkId).toBe("watersports_ontvangen");
    expect(golden.partnerEntry.status).toBe("willing");

    const spanking = directionalComparisonEntries(a, b, "spanking_hand");
    expect(spanking.partnerKinkId).toBe("spanking_hand");
    expect(spanking.partnerEntry.status).toBe("yes");
  });

  it("keeps compatibility symmetric when both directional sides are explicit", () => {
    const a = profile("A", { pegging_give: entry("yes"), pegging_receive: entry("maybe") });
    const b = profile("B", { pegging_receive: entry("willing"), pegging_give: entry("hard_no") });
    expect(profileMatchScore(a, b)).toEqual(profileMatchScore(b, a));
  });

  it("stores give and receive independently in profile snapshots", () => {
    const id = useStore.getState().createProfile("A", "Dominant");
    useStore.getState().setEntry(id, "pegging_give", { status: "yes" });
    useStore.getState().setEntry(id, "pegging_receive", { status: "hard_no" });
    const snapshot = useStore.getState().saveProfileSnapshot(id)!;
    expect(snapshot.entries.pegging_give?.status).toBe("yes");
    expect(snapshot.entries.pegging_receive?.status).toBe("hard_no");
    expect(snapshot.entries.pegging).toBeUndefined();
  });

  it("records scene usage on A's concrete direction and B's complementary direction generically", () => {
    for (const [kinkId, partnerId] of [
      ["pegging_give", "pegging_receive"],
      ["fisting_anal_give", "fisting_anal_receive"],
    ] as const) {
      useStore.setState(useStore.getInitialState());
      const aId = useStore.getState().createProfile("A", "Dominant");
      const bId = useStore.getState().createProfile("B", "Submissive");
      const sceneId = useStore.getState().saveScene({
        title: "Directionele scène",
        profileAId: aId, profileBId: bId, profileAName: "A", profileBName: "B",
        items: [{ id: kinkId, name: kinkId, kinkId, intensity: "midden", duration: "", note: "", fromKink: true }],
        status: "planned",
      });
      useStore.getState().completeScene(sceneId, { completedAt: Date.now(), trafficLight: "green", wentWell: "", remember: "" });

      const a = useStore.getState().profiles.find((candidate) => candidate.id === aId)!;
      const b = useStore.getState().profiles.find((candidate) => candidate.id === bId)!;
      expect(a.entries[kinkId]?.usedInScene, kinkId).toBe(1);
      expect(b.entries[partnerId]?.usedInScene, partnerId).toBe(1);
    }
  });

  it("keeps both concrete directions separate in a signed consent snapshot", async () => {
    const original = profile("consent-owner", {
      pegging_give: entry("yes", { comment: "geven" }),
      pegging_receive: entry("hard_no", { comment: "ontvangen" }),
    });
    const ownerKey = await generateProfileOwnerKey(original.id);
    const signed = await signProfileConsent(original, ownerKey);
    const snapshot = await createConsentSnapshot({ ...original, consentProof: signed.proof });
    expect(snapshot?.payload.entries.pegging_give?.status).toBe("yes");
    expect(snapshot?.payload.entries.pegging_receive?.status).toBe("hard_no");
    expect(snapshot?.payload.entries.pegging).toBeUndefined();
  });

  it("round-trips both directions through multipart profile QR without inventing legacy pegging", async () => {
    const original = profile("qr-owner", {
      pegging_give: entry("yes", { comment: "geven" }),
      pegging_receive: entry("hard_no", { comment: "ontvangen grens" }),
      fisting_anal_give: entry("willing", { comment: "fisten geven" }),
      fisting_anal_receive: entry("maybe", { comment: "fisten ontvangen" }),
      spanking_hand: entry("maybe", { comment: noise(9000) }),
    });
    const encoded = await encodeProfileV3(original);
    const qr = buildProfileQrSet("https://kink.example", encoded);
    expect(qr.qrValues.length).toBeGreaterThan(1);

    const parts = qr.qrValues.map((value) => {
      const parsed = parseSharePaste(value);
      expect(parsed.kind).toBe("profilePart");
      if (parsed.kind !== "profilePart") throw new Error("profilePart verwacht");
      return parsed.part;
    });
    const order = [parts.at(-1)!, parts[0], parts[0], ...parts.slice(1, -1)];
    let assembly: ProfileQrAssembly | null = null;
    let payload: string | null = null;
    for (const part of order) {
      const result = addProfileQrPart(assembly, part);
      if (result.status === "progress") assembly = result.assembly;
      if (result.status === "complete") payload = result.payload;
    }
    expect(payload).toBe(encoded);
    const decoded = await decodeSharedProfile(payload!);
    expect(decoded.entries.pegging_give?.status).toBe("yes");
    expect(decoded.entries.pegging_receive?.status).toBe("hard_no");
    expect(decoded.entries.fisting_anal_give?.status).toBe("willing");
    expect(decoded.entries.fisting_anal_receive?.status).toBe("maybe");
    expect(decoded.entries.pegging).toBeUndefined();
    expect(decoded.entries.fisting_anal).toBeUndefined();
  });

  it("does not leak or synthesize the private sibling during profile sharing", async () => {
    const original = profile("private-qr", {
      pegging_give: entry("yes"),
      pegging_receive: entry("hard_no", { privateResponse: true }),
    });
    const decoded = await decodeSharedProfile(await encodeProfileV3(original));
    expect(decoded.entries.pegging_give?.status).toBe("yes");
    expect(decoded.entries.pegging_receive).toBeUndefined();
    expect(decoded.entries.pegging).toBeUndefined();
  });
});
