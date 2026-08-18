import { describe, expect, it } from "vitest";
import type {
  ContractPendingRequest,
  ContractSeries,
  ContractSignatureProof,
  ContractVersion,
  ContractVersionContent,
} from "@/lib/contractLifecycle";
import {
  CONTRACT_REQUEST_CLOCK_SKEW_MS,
  CONTRACT_REQUEST_TTL_MS,
  authorizeContractRequestCreation,
  authorizeContractResponse,
  authorizeIncomingContractRequest,
  contractRequestEventType,
  validateContractRequestTiming,
} from "@/lib/contractStateMachine";

const PROOF = {
  profileId: "a",
  keyId: "key-a",
  publicKeyJwk: { kty: "EC", crv: "P-256", x: "x", y: "y" },
  signedAt: 1,
  payloadHash: "hash",
  signature: "sig",
} as ContractSignatureProof;

const CONTENT = { schema: 1 } as ContractVersionContent;

function signedVersion(id = "v1", contentHash = "h1"): ContractVersion {
  return {
    id,
    number: 1,
    createdAt: 1,
    updatedAt: 1,
    contentHash,
    content: CONTENT,
    summary: { matchCount: 0, hardLimitCount: 0, softLimitCount: 0, discussCount: 0 },
    state: "signed",
    signatures: [PROOF, { ...PROOF, profileId: "b", keyId: "key-b" }],
  };
}

function baseSeries(status: ContractSeries["status"] = "active", tail = "tail-current"): ContractSeries {
  return {
    id: "series-1",
    pairKey: "a|b",
    participants: [
      { profileId: "a", profileName: "A", role: "Dominant", verificationCode: "a", keyId: "key-a" },
      { profileId: "b", profileName: "B", role: "Submissive", verificationCode: "b", keyId: "key-b" },
    ],
    status,
    createdAt: 1,
    updatedAt: 1,
    currentVersionId: "v1",
    versions: [signedVersion()],
    events: tail
      ? [{
          id: "event-tail",
          type: "activated",
          createdAt: 1,
          actorProfileId: "b",
          actorName: "B",
          counterpartyProfileId: "a",
          requestId: "previous-request",
          eventHash: tail,
        }]
      : [],
  };
}

function request(overrides: Partial<ContractPendingRequest> = {}, now = 1_000_000): ContractPendingRequest {
  return {
    requestId: "request-1",
    action: "pause",
    seriesId: "series-1",
    versionId: "v1",
    contentHash: "h1",
    createdAt: now - 1_000,
    expiresAt: now - 1_000 + CONTRACT_REQUEST_TTL_MS,
    actorProfileId: "a",
    counterpartyProfileId: "b",
    previousEventHash: "tail-current",
    proof: PROOF,
    ...overrides,
  };
}

function transportForRequest(req: ContractPendingRequest): ContractSeries {
  const series = baseSeries(req.action === "pause" ? "paused" : "active", req.previousEventHash ?? "");
  series.pendingRequest = req;
  if (req.action === "activate") {
    series.status = "active";
    series.draftVersionId = req.versionId;
    series.versions = [
      {
        ...signedVersion(req.versionId, req.contentHash),
        state: "pending_signature",
        signatures: [PROOF],
      },
      ...series.versions.filter((version) => version.id !== req.versionId),
    ];
  }
  return series;
}

describe("contract state machine", () => {
  it("bounds request timestamps without extending consent through attacker-chosen lifetime", () => {
    const now = 10_000_000;
    expect(validateContractRequestTiming({
      createdAt: now - 1_000,
      expiresAt: now - 1_000 + CONTRACT_REQUEST_TTL_MS,
    }, now)).toEqual({ ok: true });

    expect(validateContractRequestTiming({
      createdAt: now,
      expiresAt: now + CONTRACT_REQUEST_TTL_MS + 1,
    }, now)).toEqual({ ok: false, reason: "invalid_lifetime" });

    expect(validateContractRequestTiming({
      createdAt: now + CONTRACT_REQUEST_CLOCK_SKEW_MS + 1,
      expiresAt: now + CONTRACT_REQUEST_CLOCK_SKEW_MS + 1 + CONTRACT_REQUEST_TTL_MS,
    }, now)).toEqual({ ok: false, reason: "future_request" });

    expect(validateContractRequestTiming({
      createdAt: now - CONTRACT_REQUEST_TTL_MS,
      expiresAt: now,
    }, now)).toEqual({ ok: false, reason: "expired_request" });
  });

  it("encodes the lifecycle transition rules in one place", () => {
    expect(authorizeContractRequestCreation({
      series: baseSeries("active"), action: "pause", actorProfileId: "a", counterpartyProfileId: "b",
    })).toEqual({ ok: true });
    expect(authorizeContractRequestCreation({
      series: baseSeries("paused"), action: "resume", actorProfileId: "a", counterpartyProfileId: "b",
    })).toEqual({ ok: true });
    expect(authorizeContractRequestCreation({
      series: baseSeries("stopped"), action: "reactivate", actorProfileId: "a", counterpartyProfileId: "b",
    })).toEqual({ ok: true });
    expect(authorizeContractRequestCreation({
      series: baseSeries("active"), action: "resume", actorProfileId: "a", counterpartyProfileId: "b",
    })).toEqual({ ok: false, reason: "invalid_transition" });
    expect(authorizeContractRequestCreation({
      series: baseSeries("stopped"), action: "pause", actorProfileId: "a", counterpartyProfileId: "b",
    })).toEqual({ ok: false, reason: "invalid_transition" });
  });

  it("lets an immediate stop supersede a still-open consent-expanding request", () => {
    const now = 1_000_000;
    const local = baseSeries("resume_pending", "tail-current");
    local.pendingRequest = request({ action: "resume", requestId: "resume-open" }, now);

    expect(authorizeContractRequestCreation({
      series: local,
      action: "stop",
      actorProfileId: "a",
      counterpartyProfileId: "b",
      now,
    })).toEqual({ ok: true });

    const stop = request({ action: "stop", requestId: "stop-now" }, now);
    const transport = transportForRequest(stop);
    transport.status = "stopped";
    expect(authorizeIncomingContractRequest({ localSeries: local, transportSeries: transport, request: stop, now }))
      .toEqual({ ok: true });
  });

  it("rejects stale and forked incoming requests even when their outer transport series looks valid", () => {
    const now = 1_000_000;
    const stale = request({ previousEventHash: "tail-old" }, now);
    const transport = transportForRequest(stale);
    const local = baseSeries("active", "tail-new");

    expect(authorizeIncomingContractRequest({ localSeries: local, transportSeries: transport, request: stale, now }))
      .toEqual({ ok: false, reason: "stale_tail" });

    const current = request({ action: "resume" }, now);
    const withPending = baseSeries("paused", "tail-current");
    withPending.pendingRequest = request({ requestId: "other-request", action: "resume" }, now);
    const resumeTransport = transportForRequest(current);
    resumeTransport.status = "resume_pending";
    expect(authorizeIncomingContractRequest({
      localSeries: withPending,
      transportSeries: resumeTransport,
      request: current,
      now,
    })).toEqual({ ok: false, reason: "pending_request" });
  });

  it("never bootstraps positive lifecycle actions from transport state alone", () => {
    const now = 1_000_000;
    const resume = request({ action: "resume" }, now);
    const transport = transportForRequest(resume);
    transport.status = "resume_pending";

    expect(authorizeIncomingContractRequest({ localSeries: null, transportSeries: transport, request: resume, now }))
      .toEqual({ ok: false, reason: "bootstrap_not_allowed" });
  });

  it("requires exact local participant and version identity", () => {
    const now = 1_000_000;
    const req = request({}, now);
    const transport = transportForRequest(req);

    const wrongPair = baseSeries("active");
    wrongPair.participants[1] = { ...wrongPair.participants[1], profileId: "mallory" };
    expect(authorizeIncomingContractRequest({ localSeries: wrongPair, transportSeries: transport, request: req, now }))
      .toEqual({ ok: false, reason: "invalid_series" });

    const wrongVersion = baseSeries("active");
    wrongVersion.currentVersionId = "other";
    expect(authorizeIncomingContractRequest({ localSeries: wrongVersion, transportSeries: transport, request: req, now }))
      .toEqual({ ok: false, reason: "invalid_version" });
  });

  it("binds a response to the exact pending request event instead of only its request id", () => {
    const now = 1_000_000;
    const req = request({}, now);
    const current = baseSeries("paused", "tail-before-request");
    current.pendingRequest = req;
    current.events.push({
      id: "request-event",
      type: contractRequestEventType(req.action),
      createdAt: req.proof.signedAt,
      actorProfileId: req.actorProfileId,
      actorName: "A",
      counterpartyProfileId: req.counterpartyProfileId,
      requestId: req.requestId,
      previousEventHash: "different-tail",
      eventHash: "request-tail",
    });

    expect(authorizeContractResponse({ currentSeries: current, request: req, now }))
      .toEqual({ ok: false, reason: "stale_tail" });
  });
});
