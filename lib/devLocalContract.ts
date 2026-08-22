import type { Profile, ProfileOwnerKey } from "@/types";
import type { ContractAction, ContractSeries } from "@/lib/contractLifecycle";
import {
  createContractReceipt,
  createContractRequest,
  createContractResponse,
  verifyAndApplyContractReceipt,
  verifyAndApplyContractResponse,
} from "@/lib/contractProtocol";

export function canSelfSignLocalDevContract(profileA: Profile, profileB: Profile): boolean {
  return profileA.id !== profileB.id
    && profileA.origin === "own"
    && profileB.origin === "own"
    && profileA.isImported !== true
    && profileB.isImported !== true;
}

export async function completeLocalDevContractAction(input: {
  series: ContractSeries;
  action: ContractAction;
  actor: Profile;
  responder: Profile;
  actorKey: ProfileOwnerKey;
  responderKey: ProfileOwnerKey;
  reason?: "Tijdelijk gepauzeerd" | "Dynamiek beëindigd";
  note?: string;
}): Promise<{ series: ContractSeries; versionId: string }> {
  const {
    series,
    action,
    actor,
    responder,
    actorKey,
    responderKey,
    reason,
    note,
  } = input;
  if (!canSelfSignLocalDevContract(actor, responder)) {
    throw new Error("Testondertekening is alleen beschikbaar voor twee profielen die op dit toestel zijn aangemaakt.");
  }
  if (actorKey.profileId !== actor.id || responderKey.profileId !== responder.id) {
    throw new Error("De lokale eigendomssleutels horen niet bij deze profielen.");
  }

  const signing = await createContractRequest({
    series,
    action,
    actor,
    counterparty: responder,
    ownerKey: actorKey,
    ...(reason ? { reason } : {}),
    ...(note?.trim() ? { note: note.trim() } : {}),
  });
  const request = signing.series.pendingRequest;
  if (!request) throw new Error("Het lokale testverzoek kon niet worden aangemaakt.");

  const response = await createContractResponse({
    envelope: signing.envelope,
    trustedActor: actor,
    responder,
    ownerKey: responderKey,
    ...(action === "activate" ? {} : { currentSeries: series }),
  });
  const applied = await verifyAndApplyContractResponse({
    currentSeries: signing.series,
    envelope: response.envelope,
  });
  const responderProof = response.envelope.responderProof;
  if (!responderProof) throw new Error("De lokale bevestiging van het tweede profiel ontbreekt.");

  const receipt = await createContractReceipt({
    series: applied,
    request,
    responseProof: responderProof,
    actor,
    ownerKey: actorKey,
  });

  // Even in dev mode, prove both protocol views converge before persisting the
  // initiator copy. This keeps the helper a transport shortcut, not a state bypass.
  await verifyAndApplyContractReceipt({
    currentSeries: response.series,
    envelope: receipt.envelope,
  });

  return { series: receipt.series, versionId: request.versionId };
}

export function activateLocalDevContract(input: {
  series: ContractSeries;
  actor: Profile;
  responder: Profile;
  actorKey: ProfileOwnerKey;
  responderKey: ProfileOwnerKey;
}) {
  return completeLocalDevContractAction({ ...input, action: "activate" });
}
