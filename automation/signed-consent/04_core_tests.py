from pathlib import Path
from textwrap import dedent

ROOT = Path('.')

def write(path: str, content: str) -> None:
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(dedent(content).lstrip(), encoding='utf-8')

def replace_once(path: str, old: str, new: str) -> None:
    p = ROOT / path
    text = p.read_text(encoding='utf-8')
    if text.count(old) != 1:
        raise RuntimeError(f'{path}: expected one match, found {text.count(old)} for {old[:80]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

write('__tests__/consentCrypto.test.ts', r'''
import { describe, expect, it } from "vitest";
import type { Profile } from "@/types";
import {
  createProfileConsentSeal,
  generateProfileOwnershipKey,
  sanitizeProfileOwnershipKey,
  verifyProfileConsentSeal,
} from "@/lib/consentCrypto";
import { getProfileAlias } from "@/lib/profileAlias";

function profile(): Profile {
  return {
    id: "owner-1",
    verificationCode: "KS-7H3P-9Q2M-A4BC",
    consentRevision: 4,
    sourceTrust: "self",
    name: "Alex",
    role: "Switch",
    experienceLevel: "ervaren",
    customKinks: [],
    createdAt: 100,
    updatedAt: 200,
    entries: {
      rope: { status: "yes", desire: 5, comment: "langzaam", tags: ["vraag eerst"] },
      hidden: { status: "hard_no", comment: "lokaal", privateResponse: true },
    },
  };
}

describe("signed profile consent", () => {
  it("confirms an unchanged consent version and rejects tampering", async () => {
    const original = profile();
    const key = await generateProfileOwnershipKey(original.id);
    const seal = await createProfileConsentSeal(original, key, 1234);
    const sealed = { ...original, consentSeal: seal };
    expect((await verifyProfileConsentSeal(sealed)).status).toBe("confirmed");

    const tampered: Profile = {
      ...sealed,
      entries: { ...sealed.entries, rope: { ...sealed.entries.rope, status: "hard_no" } },
    };
    expect((await verifyProfileConsentSeal(tampered)).status).toBe("invalid");
  });

  it("does not let a hidden answer affect the shared seal", async () => {
    const original = profile();
    const key = await generateProfileOwnershipKey(original.id);
    const seal = await createProfileConsentSeal(original, key, 1234);
    const changedHidden: Profile = {
      ...original,
      consentSeal: seal,
      entries: { ...original.entries, hidden: { ...original.entries.hidden, status: "yes" } },
    };
    expect((await verifyProfileConsentSeal(changedHidden)).status).toBe("confirmed");
  });

  it("keeps a readable alias stable without using it as the security identity", () => {
    expect(getProfileAlias(profile())).toMatch(/^[a-z]+-[a-z]+-[a-z]+$/);
    expect(getProfileAlias(profile())).toBe(getProfileAlias(profile()));
  });

  it("accepts a well-shaped ownership key for encrypted backup restore", async () => {
    const key = await generateProfileOwnershipKey("owner-1");
    expect(sanitizeProfileOwnershipKey(key)).toEqual(key);
    expect(sanitizeProfileOwnershipKey({ ...key, privateKey: { kty: "EC" } })).toBeNull();
  });
});
''')

write('__tests__/consentLedger.test.ts', r'''
import { describe, expect, it } from "vitest";
import type { Profile, SceneRecord } from "@/types";
import { createProfileConsentSeal, generateProfileOwnershipKey } from "@/lib/consentCrypto";
import {
  createSceneConsentLedger,
  createSignedSceneConsentEvent,
  verifySceneConsentEvent,
  verifySceneConsentLedger,
} from "@/lib/consentLedger";

function profile(id: string, name: string): Profile {
  return {
    id,
    verificationCode: id === "a" ? "KS-7H3P-9Q2M-A4BC" : "KS-8J4R-5T6V-W7XY",
    consentRevision: 2,
    sourceTrust: "self",
    origin: "own",
    name,
    role: "Switch",
    experienceLevel: "ervaren",
    customKinks: [],
    createdAt: 100,
    updatedAt: 200,
    entries: { rope: { status: "yes", comment: "" } },
  };
}

describe("append-only scene consent", () => {
  it("freezes both profiles and chains signed changes without rewriting the past", async () => {
    const a = profile("a", "Alex");
    const b = profile("b", "Bo");
    const keyA = await generateProfileOwnershipKey(a.id);
    const keyB = await generateProfileOwnershipKey(b.id);
    a.consentSeal = await createProfileConsentSeal(a, keyA, 1000);
    b.consentSeal = await createProfileConsentSeal(b, keyB, 1000);
    const ledger = await createSceneConsentLedger(a, b, "scene-1", [keyA, keyB], 1100);
    const scene: SceneRecord = {
      id: "scene-1",
      title: "Test",
      profileAId: a.id,
      profileBId: b.id,
      profileAName: a.name,
      profileBName: b.name,
      items: [],
      status: "planned",
      createdAt: 1000,
      updatedAt: 1000,
      consentLedger: ledger,
    };
    const event = await createSignedSceneConsentEvent(scene, a, keyA, {
      kind: "withdrawn",
      kinkId: "rope",
      kinkName: "Rope bondage",
      note: "Stop",
    }, 1200);
    scene.consentLedger = { ...ledger, events: [event] };
    expect(await verifySceneConsentEvent(event)).toBe(true);
    expect(await verifySceneConsentLedger(scene.consentLedger)).toBe(true);

    const tampered = { ...event, note: "toch toegestaan" };
    expect(await verifySceneConsentEvent(tampered)).toBe(false);
  });
});
''')
