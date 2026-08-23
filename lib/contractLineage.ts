import { canonicalJson, sha256Base64Url } from "@/lib/consentProof";
import type {
  ContractExchangeEnvelope,
  ContractLifecycleEvent,
  ContractReceiptPayload,
} from "@/lib/contractLifecycle";

/**
 * PR-1 wire extension. Keeping the event beside the transport series lets both
 * devices append the exact same lifecycle fact without treating the outer
 * series as authority. Older envelopes simply have no event and fail closed on
 * lifecycle-sensitive paths.
 */
export type ContractLineageEnvelope = ContractExchangeEnvelope & {
  event?: ContractLifecycleEvent;
};

/** The final receipt signs the tail it extends, just like request/response. */
export type ContractLineageReceiptPayload = ContractReceiptPayload & {
  previousEventHash: string;
};

export function lineageEventFromEnvelope(
  envelope: ContractExchangeEnvelope,
): ContractLifecycleEvent | undefined {
  return (envelope as ContractLineageEnvelope).event;
}

export function lineageReceiptPayload(
  receipt: ContractReceiptPayload,
): ContractLineageReceiptPayload | null {
  const candidate = receipt as ContractReceiptPayload & { previousEventHash?: unknown };
  return typeof candidate.previousEventHash === "string" && candidate.previousEventHash
    ? candidate as ContractLineageReceiptPayload
    : null;
}

function eventHashMaterial(event: Omit<ContractLifecycleEvent, "eventHash">) {
  return {
    schema: 1 as const,
    type: event.type,
    createdAt: event.createdAt,
    actorProfileId: event.actorProfileId,
    ...(event.counterpartyProfileId ? { counterpartyProfileId: event.counterpartyProfileId } : {}),
    ...(event.reason ? { reason: event.reason } : {}),
    ...(event.note ? { note: event.note } : {}),
    ...(event.proof ? { proof: event.proof } : {}),
    ...(event.requestId ? { requestId: event.requestId } : {}),
    ...(event.previousEventHash ? { previousEventHash: event.previousEventHash } : {}),
  };
}

/**
 * The security tail deliberately excludes display-only actorName and random id.
 * An intermediary therefore cannot create a different valid tail by rewriting
 * presentation metadata around the same signed lifecycle fact.
 */
export async function hashContractLineageEvent(
  event: Omit<ContractLifecycleEvent, "eventHash">,
): Promise<string> {
  return sha256Base64Url(canonicalJson(eventHashMaterial(event)));
}

export async function createContractLineageEvent(
  event: Omit<ContractLifecycleEvent, "eventHash">,
): Promise<ContractLifecycleEvent> {
  return { ...event, eventHash: await hashContractLineageEvent(event) };
}

export async function verifyContractLineageEvent(
  event: ContractLifecycleEvent,
): Promise<boolean> {
  const { eventHash, ...unsigned } = event;
  return await hashContractLineageEvent(unsigned) === eventHash;
}
