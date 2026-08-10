import { describe, expect, it } from "vitest";
import type { Profile, ProfileOwnerKey } from "@/types";
import {
  generateProfileOwnerKey,
  signProfileConsent,
} from "@/lib/consentProof";
import { prepareBackupRestore } from "@/lib/backupRestore";
import {
  decodeSharedProfileTransfer,
  decodeSwitchProfileShare,
  encodeSwitchProfileShareTransport,
} from "@/lib/profileSwitchShare";
import { encodeProfileV3 } from "@/lib/profileShareV3";
import {
  addProfileQrPart,
  buildProfileQrSet,
  parseProfileQrPart,
  type ProfileQrAssembly,
} from "@/lib/profileQr";
import { parseSharePaste } from "@/lib/parseSharePaste";

const GROUP_ID = "switch-group-1";

function baseProfile(
  id: string,
  role: "Dominant" | "Submissive",
  perspective: "dominant" | "submissive",
): Profile {
  return {
    id,
    verificationCode: perspective === "dominant"
      ? "KS-7H3P-9Q2M-A4BC"
      : "KS-8J4R-2T6W-B5CD",
    name: "Alex",
    role,
    personGroupId: GROUP_ID,
    perspective,
    origin: "own",
    experienceLevel: "gevorderd",
    customKinks: [],
    createdAt: 100,
    updatedAt: 200,
    entries: perspective === "dominant"
      ? {
          pegging_give: { status: "yes", comment: "geven blijft apart" },
          hidden_dom: { status: "hard_no", comment: "privé dom", privateResponse: true },
        }
      : {
          pegging_receive: { status: "willing", comment: "ontvangen blijft apart" },
          hidden_sub: { status: "yes", comment: "privé sub", privateResponse: true },
        },
  };
}

async function seal(profile: Profile): Promise<{ profile: Profile; ownerKey: ProfileOwnerKey }> {
  const ownerKey = await generateProfileOwnerKey(profile.id);
  const signed = await signProfileConsent(profile, ownerKey);
  return {
    profile: { ...profile, consentProof: signed.proof },
    ownerKey: signed.ownerKey,
  };
}

async function sealedSwitch() {
  const dominant = await seal(baseProfile("switch-dom", "Dominant", "dominant"));
  const submissive = await seal(baseProfile("switch-sub", "Submissive", "submissive"));
  return {
    dominant: dominant.profile,
    submissive: submissive.profile,
    ownerKeys: [dominant.ownerKey, submissive.ownerKey],
  };
}

function base64UrlToText(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
    + "=".repeat((4 - (value.length % 4)) % 4);
  return decodeURIComponent(escape(atob(padded)));
}

function textToBase64Url(value: string): string {
  const binary = unescape(encodeURIComponent(value));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

describe("Switch profile sharing", () => {
  it("exports and imports one Switch transfer with two independent perspectives", async () => {
    const source = await sealedSwitch();
    const transport = await encodeSwitchProfileShareTransport(
      source.dominant,
      source.submissive,
      { ownerKeys: source.ownerKeys },
    );
    const decoded = await decodeSharedProfileTransfer(transport.encoded);

    expect(decoded.isSwitch).toBe(true);
    expect(decoded.profiles).toHaveLength(2);
    const [dominant, submissive] = decoded.profiles;
    expect(dominant.role).toBe("Dominant");
    expect(dominant.perspective).toBe("dominant");
    expect(submissive.role).toBe("Submissive");
    expect(submissive.perspective).toBe("submissive");
    expect(dominant.personGroupId).toBe(GROUP_ID);
    expect(submissive.personGroupId).toBe(GROUP_ID);
    expect(dominant.switchShareProof).toEqual(submissive.switchShareProof);
    expect(dominant.entries.pegging_give?.status).toBe("yes");
    expect(dominant.entries.pegging_receive).toBeUndefined();
    expect(submissive.entries.pegging_receive?.status).toBe("willing");
    expect(submissive.entries.pegging_give).toBeUndefined();
    expect(dominant.entries.hidden_dom).toBeUndefined();
    expect(submissive.entries.hidden_sub).toBeUndefined();
  });

  it("re-shares an imported Switch without either private owner key", async () => {
    const source = await sealedSwitch();
    const first = await encodeSwitchProfileShareTransport(
      source.dominant,
      source.submissive,
      { ownerKeys: source.ownerKeys },
    );
    const imported = await decodeSwitchProfileShare(first.encoded);
    const second = await encodeSwitchProfileShareTransport(imported[0], imported[1]);
    const decodedAgain = await decodeSwitchProfileShare(second.encoded);

    expect(decodedAgain.map((profile) => profile.perspective)).toEqual(["dominant", "submissive"]);
    expect(decodedAgain[0].entries.pegging_give?.status).toBe("yes");
    expect(decodedAgain[1].entries.pegging_receive?.status).toBe("willing");
  });

  it("keeps the Switch identity proof valid when only one perspective gets a newer signed version", async () => {
    const source = await sealedSwitch();
    const first = await encodeSwitchProfileShareTransport(
      source.dominant,
      source.submissive,
      { ownerKeys: source.ownerKeys },
    );
    const dominantKey = source.ownerKeys.find((key) => key.profileId === source.dominant.id);
    expect(dominantKey).toBeDefined();
    const changedDominant = {
      ...source.dominant,
      updatedAt: source.dominant.updatedAt + 1,
      entries: {
        ...source.dominant.entries,
        pegging_give: { status: "willing" as const, comment: "nieuwe Dom-versie" },
      },
    };
    const resealed = await signProfileConsent(changedDominant, dominantKey!);
    const updatedDominant = { ...changedDominant, consentProof: resealed.proof };

    const second = await encodeSwitchProfileShareTransport(
      updatedDominant,
      source.submissive,
      { linkProof: first.linkProof },
    );
    const decoded = await decodeSwitchProfileShare(second.encoded);

    expect(second.linkProof).toEqual(first.linkProof);
    expect(decoded[0].entries.pegging_give?.status).toBe("willing");
    expect(decoded[1].entries.pegging_receive?.status).toBe("willing");
  });

  it("rejects a valid but unrelated submissive profile spliced into the Switch envelope", async () => {
    const source = await sealedSwitch();
    const transport = await encodeSwitchProfileShareTransport(
      source.dominant,
      source.submissive,
      { ownerKeys: source.ownerKeys },
    );
    const unrelated = await seal({
      ...baseProfile("other-sub", "Submissive", "submissive"),
      personGroupId: "other-group",
      name: "Alex",
    });
    const envelope = JSON.parse(base64UrlToText(transport.encoded.slice(3))) as Record<string, unknown>;
    envelope.s = await encodeProfileV3(unrelated.profile);
    const tampered = `5r.${textToBase64Url(JSON.stringify(envelope))}`;

    await expect(decodeSwitchProfileShare(tampered)).rejects.toThrow("Switch-koppeling");
  });

  it("survives backup sanitization without allowing an unsigned local group injection", async () => {
    const source = await sealedSwitch();
    const transport = await encodeSwitchProfileShareTransport(
      source.dominant,
      source.submissive,
      { ownerKeys: source.ownerKeys },
    );
    const imported = await decodeSwitchProfileShare(transport.encoded);
    const restored = await prepareBackupRestore({ source: "shared", profiles: imported });

    expect(restored.profiles).toHaveLength(2);
    expect(restored.profiles[0].personGroupId).toBe(GROUP_ID);
    expect(restored.profiles[1].personGroupId).toBe(GROUP_ID);
    expect(restored.profiles.map((profile) => profile.perspective)).toEqual(["dominant", "submissive"]);
  });

  it("drops an orphan Switch proof instead of preserving unverified linkage metadata", async () => {
    const source = await sealedSwitch();
    const transport = await encodeSwitchProfileShareTransport(
      source.dominant,
      source.submissive,
      { ownerKeys: source.ownerKeys },
    );
    const [dominantOnly] = await decodeSwitchProfileShare(transport.encoded);
    const restored = await prepareBackupRestore({ source: "shared", profiles: [dominantOnly] });

    expect(restored.profiles).toHaveLength(1);
    expect(restored.profiles[0].personGroupId).toBeUndefined();
    expect(restored.profiles[0].perspective).toBeUndefined();
    expect(restored.profiles[0].switchShareProof).toBeUndefined();
  });

  it("keeps the Switch payload opaque through multi-QR reassembly", async () => {
    const source = await sealedSwitch();
    const transport = await encodeSwitchProfileShareTransport(
      source.dominant,
      source.submissive,
      { ownerKeys: source.ownerKeys },
    );
    expect(parseSharePaste(transport.encoded).kind).toBe("profile");

    const qrSet = buildProfileQrSet("https://example.test", transport.encoded);
    expect(qrSet.qrTooLarge).toBe(false);
    if (qrSet.frames.length === 1) {
      expect(parseSharePaste(qrSet.frames[0].value)).toMatchObject({ kind: "profile", encoded: transport.encoded });
      return;
    }

    let assembly: ProfileQrAssembly | null = null;
    let completed = "";
    for (const frame of [...qrSet.frames].reverse()) {
      const raw = new URL(frame.value).hash.replace(/^#p3m=/, "");
      const part = parseProfileQrPart(raw);
      expect(part).not.toBeNull();
      const result = addProfileQrPart(assembly, part!);
      if (result.status === "progress") assembly = result.assembly;
      if (result.status === "complete") completed = result.payload;
    }
    expect(completed).toBe(transport.encoded);
    const decoded = await decodeSwitchProfileShare(completed);
    expect(decoded).toHaveLength(2);
  });
});
