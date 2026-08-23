"use client";

import { CheckCircle, FileText, QrCode } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import type { Profile } from "@/types";
import Sheet, { SheetContent } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { useStore } from "@/lib/store";
import { useContractStore } from "@/lib/contractStore";
import type { ContractSeries } from "@/lib/contractLifecycle";
import type { ContractContentWithHandwriting } from "@/lib/contractHandwriting";
import { hasRequiredHandwrittenSignatures } from "@/lib/contractHandwriting";
import { ensureContractPdfArtifact } from "@/lib/contractDocument";
import {
  createContractReceipt,
  createContractRequest,
  requestInstruction,
  verifyAndApplyContractResponse,
} from "@/lib/contractProtocol";
import {
  activateLocalDevContract,
  canSelfSignLocalDevContract,
} from "@/lib/devLocalContract";
import { syncDevTestToolsFromLocation } from "@/lib/devTestTools";
import { decodeContractEnvelope, encodeContractEnvelope } from "@/lib/contractQr";
import ContractQrDisplay from "@/components/contract/ContractQrDisplay";
import ContractQrScannerSheet from "@/components/contract/ContractQrScannerSheet";

interface Props {
  open: boolean;
  onClose: () => void;
  profileA: Profile;
  profileB: Profile;
  content: ContractContentWithHandwriting;
}

type Phase = "intro" | "request" | "receipt";

function isOwned(profile: Profile): boolean {
  return profile.origin !== "shared" && profile.isImported !== true;
}

export default function ContractSigningSheet({ open, onClose, profileA, profileB, content }: Props) {
  const saveDraft = useContractStore((state) => state.saveDraft);
  const upsertSeries = useContractStore((state) => state.upsertSeries);
  const sealProfileConsent = useStore((state) => state.sealProfileConsent);
  const { showToast } = useToast();
  const [phase, setPhase] = useState<Phase>("intro");
  const [encoded, setEncoded] = useState<string | null>(null);
  const [currentSeries, setCurrentSeries] = useState<ContractSeries | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devTestToolsEnabled, setDevTestToolsEnabled] = useState(false);
  const ownedProfiles = [profileA, profileB].filter(isOwned);
  const canStartQrSigning = ownedProfiles.length === 1;
  const canLocalDevSign = devTestToolsEnabled && canSelfSignLocalDevContract(profileA, profileB);

  useEffect(() => {
    if (!open) return;
    setPhase("intro");
    setEncoded(null);
    setCurrentSeries(null);
    setScannerOpen(false);
    setBusy(false);
    setError(null);
    setDevTestToolsEnabled(syncDevTestToolsFromLocation());
  }, [open]);

  function assertHandwrittenSignatures() {
    if (!hasRequiredHandwrittenSignatures(content)) {
      throw new Error("Beide handgeschreven handtekeningen zijn verplicht voordat dit contract kan worden bewaard of digitaal bevestigd.");
    }
  }

  async function persistDraft(closeAfter: boolean) {
    assertHandwrittenSignatures();
    const result = await saveDraft({ profileA, profileB, content });
    if (closeAfter) {
      showToast({ message: "Concept met beide handgeschreven handtekeningen opgeslagen.", variant: "success" });
      onClose();
    }
    return result.series;
  }

  async function startLocalDevSigning() {
    setBusy(true);
    setError(null);
    try {
      assertHandwrittenSignatures();
      if (!devTestToolsEnabled || !canSelfSignLocalDevContract(profileA, profileB)) {
        throw new Error("Lokale testondertekening is hier niet beschikbaar.");
      }

      const actor = await sealProfileConsent(profileA.id);
      const responder = await sealProfileConsent(profileB.id);
      if (!actor || !responder) {
        throw new Error("Beide lokale profielen moeten cryptografisch kunnen worden bevestigd.");
      }

      const ownerKeys = useStore.getState().profileOwnerKeys;
      const actorKey = ownerKeys.find((key) => key.profileId === actor.id);
      const responderKey = ownerKeys.find((key) => key.profileId === responder.id);
      if (!actorKey || !responderKey) {
        throw new Error("De lokale eigendomssleutel van één van de profielen ontbreekt.");
      }

      const draft = await saveDraft({ profileA: actor, profileB: responder, content });
      const result = await activateLocalDevContract({
        series: draft.series,
        actor,
        responder,
        actorKey,
        responderKey,
      });

      // Dev mode may skip the second device, never the durable signed artifact.
      await ensureContractPdfArtifact(result.series, result.versionId);
      upsertSeries(result.series);
      showToast({
        message: "Testcontract actief. Je kunt nu scènes en de volledige lifecycle testen.",
        variant: "success",
      });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "De lokale testondertekening is mislukt.");
    } finally {
      setBusy(false);
    }
  }

  async function startSigning() {
    setBusy(true);
    setError(null);
    try {
      assertHandwrittenSignatures();
      const owned = [profileA, profileB].filter(isOwned);
      if (owned.length !== 1) {
        throw new Error("Voor QR-bevestiging moet dit toestel exact één van beide profielen bezitten.");
      }
      const actor = owned[0];
      const counterparty = actor.id === profileA.id ? profileB : profileA;
      const draft = await persistDraft(false);
      const sealed = await sealProfileConsent(actor.id);
      if (!sealed) throw new Error(`${actor.name} kon niet cryptografisch worden bevestigd.`);
      const ownerKey = useStore.getState().profileOwnerKeys.find((key) => key.profileId === actor.id);
      if (!ownerKey) throw new Error("De eigendomssleutel van het lokale profiel ontbreekt.");
      const result = await createContractRequest({
        series: draft,
        action: "activate",
        actor: sealed,
        counterparty,
        ownerKey,
      });
      upsertSeries(result.series);
      setCurrentSeries(result.series);
      setEncoded(encodeContractEnvelope(result.envelope));
      setPhase("request");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "De ondertekening kon niet worden gestart.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResponse(raw: string) {
    if (!currentSeries) return;
    setScannerOpen(false);
    setBusy(true);
    setError(null);
    try {
      const request = currentSeries.pendingRequest;
      if (!request) throw new Error("Het openstaande contractverzoek ontbreekt.");
      const envelope = decodeContractEnvelope(raw);
      const applied = await verifyAndApplyContractResponse({ currentSeries, envelope });
      if (!envelope.responderProof) throw new Error("De bevestiging van de tweede partij ontbreekt.");
      const actor = [profileA, profileB].find((profile) => profile.id === request.actorProfileId);
      if (!actor || !isOwned(actor)) throw new Error("Het eigen profiel van de aanvrager ontbreekt.");
      const ownerKey = useStore.getState().profileOwnerKeys.find((key) => key.profileId === actor.id);
      if (!ownerKey) throw new Error("De eigendomssleutel van de aanvrager ontbreekt.");
      const receipt = await createContractReceipt({
        series: applied,
        request,
        responseProof: envelope.responderProof,
        actor,
        ownerKey,
      });
      // A newly active version must never be persisted without its definitive
      // human-readable artifact. If PDF capture fails, the pending request
      // remains available for a safe retry instead of recording half a result.
      await ensureContractPdfArtifact(receipt.series, request.versionId);
      upsertSeries(receipt.series);
      setCurrentSeries(receipt.series);
      setEncoded(encodeContractEnvelope(receipt.envelope));
      setPhase("receipt");
      showToast({
        message: "Contract actief. De getekende PDF staat vast in de contractgeschiedenis.",
        variant: "success",
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Het antwoord kon niet worden gecontroleerd.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Sheet open={open} onClose={onClose} scrollable aria-label="Contract opslaan en ondertekenen">
        <SheetContent
          showHandle={false}
          className="max-h-[calc(100dvh-env(safe-area-inset-top))] overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4"
        >
          {phase === "intro" && (
            <div>
              <div
                className="mx-auto flex h-11 w-11 items-center justify-center rounded-full"
                style={{ background: "var(--surface2)", color: "var(--accent)" }}
              >
                <FileText size={20} aria-hidden="true" />
              </div>
              <h2 className="mt-3 text-center text-lg font-semibold">Contract bewaren</h2>
              <p className="mt-2 text-center text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
                Beide handgeschreven handtekeningen zijn onderdeel van exact deze versie. Bewaar haar als concept, of laat je partner dezelfde versie op diens eigen toestel digitaal bevestigen.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void persistDraft(true).catch((caught) => setError(caught instanceof Error ? caught.message : "Opslaan mislukt."))}
                  className="focus-ring min-h-11 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                >
                  Opslaan als concept
                </button>
                {canLocalDevSign ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void startLocalDevSigning()}
                    className="focus-ring min-h-11 rounded-xl text-sm font-semibold disabled:opacity-50"
                    style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
                  >
                    {busy ? "Lokaal bevestigen…" : "Beide lokale profielen bevestigen"}
                  </button>
                ) : canStartQrSigning ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void startSigning()}
                    className="focus-ring flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                    style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
                  >
                    <QrCode size={18} aria-hidden="true" />
                    {busy ? "QR maken…" : "QR voor partner tonen"}
                  </button>
                ) : null}
              </div>

              {canLocalDevSign ? (
                <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
                  <p className="text-xs font-medium" style={{ color: "var(--accent)" }}>Testmodus</p>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
                    Beide profielen zijn lokaal aangemaakt. Hiermee doorloop je dezelfde cryptografische contractflow zonder een tweede toestel.
                  </p>
                </div>
              ) : !canStartQrSigning ? (
                <div
                  className="mt-4 rounded-xl p-3"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                >
                  <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                    QR-bevestiging gebeurt op het eigen toestel van beide personen
                  </p>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
                    {ownedProfiles.length === 2
                      ? "Beide profielen zijn op dit toestel aangemaakt. Voor echte QR-bevestiging moet het partnerprofiel afkomstig zijn van diens eigen toestel. Importeer eerst het gedeelde partnerprofiel; daarna kan KinkSync de QR maken."
                      : "Dit toestel bezit geen van beide profielen. Open het contract op het eigen toestel van één deelnemer om een contract-QR te maken."}
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {phase === "request" && encoded && currentSeries?.pendingRequest && (
            <ContractQrDisplay
              encoded={encoded}
              title="Laat je partner scannen"
              instruction={requestInstruction(currentSeries.pendingRequest.action)}
              onScanResponse={() => setScannerOpen(true)}
              scanLabel="Bevestiging van partner scannen"
            />
          )}

          {phase === "receipt" && encoded && (
            <div>
              <ContractQrDisplay
                encoded={encoded}
                title="Contract actief"
                instruction="Laat je partner deze korte afrondings-QR scannen. Daarna staat op beide toestellen vast dat exact deze contractversie werd ontvangen en opgeslagen."
              />
              <div className="mt-4 flex items-start gap-2 rounded-xl p-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <CheckCircle size={18} weight="fill" aria-hidden="true" className="mt-0.5 flex-none" style={{ color: "var(--yes)" }} />
                <p className="text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
                  Deze contractversie bevat beide handgeschreven én beide cryptografische handtekeningen. De definitieve PDF is lokaal aan precies deze versie gekoppeld.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="focus-ring mt-4 min-h-11 w-full rounded-xl text-sm font-semibold"
                style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
              >
                Gereed
              </button>
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-center leading-relaxed" style={{ color: "var(--hard-no)" }} role="alert">
              {error}
            </p>
          )}
        </SheetContent>
      </Sheet>

      <ContractQrScannerSheet
        open={scannerOpen}
        title="Bevestiging van partner scannen"
        onClose={() => setScannerOpen(false)}
        onEncoded={(value) => void handleResponse(value)}
      />
    </>
  );
}
