import type {
  ConsentSnapshot,
  ProfileConsentProof,
  SceneRecord,
} from "@/types";
import {
  canonicalJson,
  profileConsentAlias,
  sceneMatchesConsentAgreement,
  verifyConsentLedgerEvent,
  verifyConsentPayload,
} from "@/lib/consentProof";

export type SceneConsentVerification =
  | { status: "valid"; signedByProfileIds: string[] }
  | { status: "invalid"; reason: string };

function publicKeyIdentity(key: JsonWebKey | undefined): string | null {
  if (!key || key.kty !== "EC" || key.crv !== "P-256"
    || typeof key.x !== "string" || typeof key.y !== "string") return null;
  return canonicalJson({ kty: key.kty, crv: key.crv, x: key.x, y: key.y, ext: true });
}

function sameSigningSource(
  keyId: string | undefined,
  publicKey: JsonWebKey | undefined,
  proof: ProfileConsentProof,
): boolean {
  return !!keyId
    && keyId === proof.keyId
    && publicKeyIdentity(publicKey) === publicKeyIdentity(proof.publicKeyJwk);
}

async function verifySnapshot(snapshot: ConsentSnapshot): Promise<string | null> {
  const verification = await verifyConsentPayload(snapshot.payload, snapshot.proof);
  if (verification.status !== "valid") {
    return verification.status === "invalid"
      ? verification.reason
      : "Profielversie mist een bronbevestiging.";
  }

  if (snapshot.profileId !== snapshot.payload.profileId
    || snapshot.profileName !== snapshot.payload.name
    || snapshot.verificationCode !== snapshot.payload.verificationCode) {
    return "De beschrijving van een profielversie is gewijzigd.";
  }

  const expectedAlias = profileConsentAlias({
    id: snapshot.profileId,
    verificationCode: snapshot.verificationCode,
    consentProof: snapshot.proof,
  });
  if (snapshot.alias !== expectedAlias) {
    return "De leesbare bronnaam van een profielversie is gewijzigd.";
  }

  return null;
}

/**
 * Verifies both the cryptographic chain and signer authorisation.
 * A mathematically valid signature from an unrelated key is not consent.
 */
export async function verifySceneConsentRecord(
  scene: SceneRecord,
): Promise<SceneConsentVerification> {
  const snapshots = scene.consentSnapshots;
  const agreement = scene.consentAgreement;
  const events = scene.consentLedger;

  if (!snapshots || !agreement || !events?.length) {
    return { status: "invalid", reason: "De vastgezette toestemmingsgegevens zijn onvolledig." };
  }
  if (!sceneMatchesConsentAgreement(scene)) {
    return { status: "invalid", reason: "De huidige scène wijkt af van de vastgezette afspraak." };
  }

  const snapshotErrorA = await verifySnapshot(snapshots.profileA);
  if (snapshotErrorA) return { status: "invalid", reason: snapshotErrorA };
  const snapshotErrorB = await verifySnapshot(snapshots.profileB);
  if (snapshotErrorB) return { status: "invalid", reason: snapshotErrorB };

  if (agreement.profileAProofHash !== snapshots.profileA.proof.proofHash
    || agreement.profileBProofHash !== snapshots.profileB.proof.proofHash) {
    return { status: "invalid", reason: "De profielversies horen niet bij deze afspraak." };
  }

  const participants = new Map([
    [snapshots.profileA.profileId, snapshots.profileA],
    [snapshots.profileB.profileId, snapshots.profileB],
  ]);
  const latestProof = new Map<string, ProfileConsentProof>([
    [snapshots.profileA.profileId, snapshots.profileA.proof],
    [snapshots.profileB.profileId, snapshots.profileB.proof],
  ]);

  const signedBy = new Set<string>();
  let previousEventHash: string | undefined;
  let laterEventsStarted = false;

  for (const event of events) {
    if (event.sceneId !== scene.id) {
      return { status: "invalid", reason: "Een logregel hoort bij een andere scène." };
    }
    if (event.previousEventHash !== previousEventHash) {
      return { status: "invalid", reason: "De wijzigingsketen is onderbroken of herschikt." };
    }
    if (!await verifyConsentLedgerEvent(event)) {
      return { status: "invalid", reason: "Een digitale handtekening of loghash klopt niet." };
    }

    if (event.type === "locked") {
      if (laterEventsStarted) {
        return { status: "invalid", reason: "Een latere logregel probeert de startafspraak te vervangen." };
      }
      if (!event.agreement || canonicalJson(event.agreement) !== canonicalJson(agreement)) {
        return { status: "invalid", reason: "De ondertekende scène-afspraak komt niet overeen." };
      }

      const signer = [...participants.entries()].find(([, snapshot]) =>
        sameSigningSource(event.keyId, event.publicKeyJwk, snapshot.proof));
      if (!signer) {
        return { status: "invalid", reason: "De startafspraak is niet door een deelnemend profiel ondertekend." };
      }
      signedBy.add(signer[0]);
    } else {
      laterEventsStarted = true;
      if (!event.profileId) {
        return { status: "invalid", reason: "Een wijziging vermeldt niet van wie de toestemming is." };
      }
      const participant = participants.get(event.profileId);
      if (!participant) {
        return { status: "invalid", reason: "Een onbevoegde bron heeft een logregel ondertekend." };
      }
      if (!sameSigningSource(event.keyId, event.publicKeyJwk, participant.proof)) {
        return { status: "invalid", reason: "Een logregel is met een andere bron ondertekend." };
      }
      if (event.agreement) {
        return { status: "invalid", reason: "Een latere logregel probeert de oorspronkelijke afspraak te overschrijven." };
      }

      if (event.type === "changed") {
        if (!event.snapshot || event.snapshot.profileId !== event.profileId) {
          return { status: "invalid", reason: "Een wijziging mist de nieuwe ondertekende profielversie." };
        }
        const snapshotError = await verifySnapshot(event.snapshot);
        if (snapshotError) return { status: "invalid", reason: snapshotError };

        const previousProof = latestProof.get(event.profileId);
        const nextProof = event.snapshot.proof;
        if (!previousProof
          || nextProof.keyId !== previousProof.keyId
          || nextProof.version <= previousProof.version
          || nextProof.previousProofHash !== previousProof.proofHash) {
          return { status: "invalid", reason: "De nieuwe profielversie volgt niet geldig op de vorige versie." };
        }
        latestProof.set(event.profileId, nextProof);
      } else if (event.snapshot) {
        return { status: "invalid", reason: "Een intrekking mag de oude profielversie niet overschrijven." };
      }
    }

    previousEventHash = event.eventHash;
  }

  if (!signedBy.size) {
    return { status: "invalid", reason: "Geen deelnemend profiel heeft de startafspraak ondertekend." };
  }

  return { status: "valid", signedByProfileIds: [...signedBy] };
}
