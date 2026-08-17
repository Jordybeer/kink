"use client";

import { CheckCircle, FileText, QrCode } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import type { Profile } from "@/types";
import Sheet, { SheetContent } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { useStore } from "@/lib/store";
import { useContractStore } from "@/lib/contractStore";
import type { ContractSeries, ContractVersionContent } from "@/lib/contractLifecycle";
import {
  createContractReceipt,
  createContractRequest,
  requestInstruction,
  verifyAndApplyContractResponse,
} from "@/lib/contractProtocol";
import { decodeContractEnvelope, encodeContractEnvelope } from "@/lib/contractQr";
import ContractQrDisplay from "@/components/contract/ContractQrDisplay";
import ContractQrScannerSheet from "@/components/contract/ContractQrScannerSheet";

interface Props {
  open: boolean;
  onClose: () => void;
  profileA: Profile;
  profileB: Profile;
  content: ContractVersionContent;
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

  useEffect(() => {
    if (!open) return;
    setPhase("intro");
    setEncoded(null);
    setCurrentSeries(null);
    setScannerOpen(false);
    setBusy(false);
    setError(null);
  }, [open]);

  async function persistDraft(closeAfter: boolean) {
    const result = await saveDraft({ profileA, profileB, content });
    if (closeAfter) {
      showToast({ message: "Concept opgeslagen. Je kunt het later verder bespreken.", variant: "success" });
      onClose();
    }
    return result.series;
  }

  async function startSigning() {
    setBusy(true);
    setError(null);
    try {
      const owned = [profileA, profileB].filter(isOwned);
      if (owned.length !== 1) {
        throw new Error("Open dit contract op het eigen toestel van één deelnemer. De andere deelnemer bevestigt daarna op diens eigen toestel via QR.");
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
      upsertSeries(receipt.series);
      setCurrentSeries(receipt.series);
      setEncoded(encodeContractEnvelope(receipt.envelope));
      setPhase("receipt");
      showToast({ message: "Contract actief. Laat de tweede partij nog het korte afrondingsbewijs scannen.", variant: "success" });
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
                Bewaar dit eerst als concept, of start de digitale ondertekening. Activeren vereist twee eigen toestellen en twee profielgebonden handtekeningen.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void persistDraft(true)}
                  className="focus-ring min-h-11 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                >
                  Opslaan als concept
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void startSigning()}
                  className="focus-ring flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
                >
                  <QrCode size={18} aria-hidden="true" />
                  {busy ? "Voorbereiden…" : "Digitaal ondertekenen"}
                </button>
              </div>
            </div>
          )}

          {phase === "request" && encoded && currentSeries?.pendingRequest && (
            <ContractQrDisplay
              encoded={encoded}
              title="Tweede handtekening"
              instruction={requestInstruction(currentSeries.pendingRequest.action)}
              onScanResponse={() => setScannerOpen(true)}
            />
          )}

          {phase === "receipt" && encoded && (
            <div>
              <ContractQrDisplay
                encoded={encoded}
                title="Contract actief"
                instruction="Laat de andere persoon deze korte QR scannen. Daarna staat op beide toestellen vast dat het antwoord werd ontvangen en opgeslagen."
              />
              <div className="mt-4 flex items-start gap-2 rounded-xl p-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <CheckCircle size={18} weight="fill" aria-hidden="true" className="mt-0.5 flex-none" style={{ color: "var(--yes)" }} />
                <p className="text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
                  Het contract is al actief. Deze laatste scan synchroniseert alleen het cryptografische ontvangstbewijs op het tweede toestel.
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
        title="Antwoord van tweede partij scannen"
        onClose={() => setScannerOpen(false)}
        onEncoded={(value) => void handleResponse(value)}
      />
    </>
  );
}
