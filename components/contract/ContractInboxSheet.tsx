"use client";

import { Check, QrCode, ShieldCheck } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import Sheet, { SheetContent } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { useStore } from "@/lib/store";
import { useContractStore } from "@/lib/contractStore";
import {
  contractVersionById,
  formatContractTimestamp,
  type ContractExchangeEnvelope,
  type ContractSeries,
} from "@/lib/contractLifecycle";
import {
  createContractResponse,
  verifyAndApplyContractReceipt,
  verifyContractRequest,
} from "@/lib/contractProtocol";
import { decodeContractEnvelope, encodeContractEnvelope } from "@/lib/contractQr";
import ContractQrDisplay from "@/components/contract/ContractQrDisplay";
import ContractQrScannerSheet from "@/components/contract/ContractQrScannerSheet";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Phase = "scan" | "review" | "response" | "complete";

function actionTitle(action: ContractExchangeEnvelope["request"]["action"]): string {
  if (action === "activate") return "Contract ondertekenen";
  if (action === "pause") return "Pauze ontvangen";
  if (action === "resume") return "Contract hervatten";
  if (action === "stop") return "Stopzetting ontvangen";
  return "Contract heractiveren";
}

function actionButton(action: ContractExchangeEnvelope["request"]["action"]): string {
  if (action === "activate") return "Contract ondertekenen";
  if (action === "pause" || action === "stop") return "Ontvangst bevestigen";
  if (action === "resume") return "Hervatting bevestigen";
  return "Heractivering bevestigen";
}

function authoritativeLocalSeries(envelope: ContractExchangeEnvelope): ContractSeries | null {
  const transportSeries = envelope.series;
  if (!transportSeries) return null;
  const local = useContractStore.getState().series;
  return local.find((series) => series.id === envelope.request.seriesId)
    ?? local.find((series) => series.pairKey === transportSeries.pairKey)
    ?? null;
}

export default function ContractInboxSheet({ open, onClose }: Props) {
  const profiles = useStore((state) => state.profiles);
  const sealProfileConsent = useStore((state) => state.sealProfileConsent);
  const upsertSeries = useContractStore((state) => state.upsertSeries);
  const { showToast } = useToast();
  const [phase, setPhase] = useState<Phase>("scan");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [requestEnvelope, setRequestEnvelope] = useState<ContractExchangeEnvelope | null>(null);
  const [responseEncoded, setResponseEncoded] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPhase("scan");
    setScannerOpen(true);
    setRequestEnvelope(null);
    setResponseEncoded(null);
    setBusy(false);
    setError(null);
  }, [open]);

  async function receive(raw: string) {
    setScannerOpen(false);
    setError(null);
    try {
      const envelope = decodeContractEnvelope(raw);
      if (envelope.kind === "receipt") {
        const currentSeries = useContractStore.getState().series.find((series) => series.id === envelope.request.seriesId);
        if (!currentSeries) throw new Error("Het bijbehorende contract staat niet op dit toestel.");
        const applied = await verifyAndApplyContractReceipt({ currentSeries, envelope });
        upsertSeries(applied);
        setRequestEnvelope(envelope);
        setPhase("complete");
        showToast({ message: "Uitwisseling op beide toestellen cryptografisch afgerond.", variant: "success" });
        return;
      }
      if (envelope.kind !== "request" || !envelope.series) {
        throw new Error("Dit verzoek is ongeldig, beschadigd of verlopen.");
      }
      const trustedActor = profiles.find((profile) => profile.id === envelope.request.actorProfileId);
      if (!trustedActor) {
        throw new Error("Importeer eerst het geverifieerde profiel van de andere contractpartij.");
      }
      const currentSeries = authoritativeLocalSeries(envelope);
      if (!await verifyContractRequest(envelope, trustedActor, currentSeries)) {
        throw new Error("Dit verzoek is verouderd, hoort niet bij de actuele contractgeschiedenis of gebruikt een andere profielidentiteit.");
      }
      const responder = profiles.find((profile) => profile.id === envelope.request.counterpartyProfileId);
      if (!responder) throw new Error("Het profiel waarvoor dit verzoek bestemd is staat niet op dit toestel.");
      if (responder.origin === "shared" || responder.isImported === true) {
        throw new Error(`Open dit verzoek op het eigen toestel van ${responder.name}.`);
      }
      setRequestEnvelope(envelope);
      setPhase("review");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "De contractcode kon niet worden gelezen.");
      setPhase("scan");
    }
  }

  async function confirm() {
    if (!requestEnvelope || requestEnvelope.kind !== "request" || !requestEnvelope.series) return;
    setBusy(true);
    setError(null);
    try {
      const responder = profiles.find((profile) => profile.id === requestEnvelope.request.counterpartyProfileId);
      if (!responder) throw new Error("Het eigen profiel ontbreekt.");
      const sealed = await sealProfileConsent(responder.id);
      if (!sealed) throw new Error(`${responder.name} kon niet cryptografisch worden bevestigd.`);
      const ownerKey = useStore.getState().profileOwnerKeys.find((key) => key.profileId === responder.id);
      if (!ownerKey) throw new Error("De eigendomssleutel ontbreekt.");
      const trustedActor = profiles.find((profile) => profile.id === requestEnvelope.request.actorProfileId);
      if (!trustedActor) throw new Error("Het geverifieerde profiel van de andere contractpartij ontbreekt.");
      const currentSeries = authoritativeLocalSeries(requestEnvelope);
      const result = await createContractResponse({
        envelope: requestEnvelope,
        trustedActor,
        responder: sealed,
        ownerKey,
        currentSeries,
      });
      upsertSeries(result.series);
      setResponseEncoded(encodeContractEnvelope(result.envelope));
      setPhase("response");
      const action = requestEnvelope.request.action;
      showToast({
        message: action === "activate"
          ? "Contract ondertekend. Laat de andere persoon nu het antwoord scannen."
          : action === "resume" || action === "reactivate"
            ? "Wederzijdse bevestiging toegevoegd. Laat de andere persoon het antwoord scannen."
            : "Ontvangst bevestigd. Laat de andere persoon het antwoord scannen.",
        variant: "success",
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "De bevestiging kon niet worden gemaakt.");
    } finally {
      setBusy(false);
    }
  }

  const request = requestEnvelope?.request;
  const series = requestEnvelope?.series;
  const version = series && request ? contractVersionById(series, request.versionId) : undefined;
  const actor = series?.participants.find((participant) => participant.profileId === request?.actorProfileId);
  const responder = series?.participants.find((participant) => participant.profileId === request?.counterpartyProfileId);

  return (
    <>
      <Sheet open={open && !scannerOpen} onClose={onClose} scrollable aria-label="Contractverzoek">
        <SheetContent
          showHandle={false}
          className="max-h-[calc(100dvh-env(safe-area-inset-top))] overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4"
        >
          {phase === "scan" && (
            <div className="py-4 text-center">
              <QrCode size={32} aria-hidden="true" className="mx-auto" style={{ color: "var(--accent)" }} />
              <h2 className="mt-3 text-lg font-semibold">Contractcode scannen</h2>
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="focus-ring mt-5 min-h-11 w-full rounded-xl text-sm font-semibold"
                style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
              >
                Scanner openen
              </button>
            </div>
          )}

          {phase === "review" && request && series && actor && responder && (
            <div>
              <div
                className="mx-auto flex h-11 w-11 items-center justify-center rounded-full"
                style={{ background: "var(--surface2)", color: "var(--yes)" }}
              >
                <ShieldCheck size={21} aria-hidden="true" />
              </div>
              <h2 className="mt-3 text-center text-lg font-semibold">{actionTitle(request.action)}</h2>
              <p className="mt-1 text-center text-sm" style={{ color: "var(--text2)" }}>
                {actor.profileName} × {responder.profileName}
              </p>
              <p className="mt-1 text-center text-xs" style={{ color: "var(--text2)" }}>
                {formatContractTimestamp(request.createdAt)}
              </p>

              <div className="mt-5 rounded-xl p-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <p className="text-sm font-medium">
                  {request.action === "pause"
                    ? `${actor.profileName} heeft het contract tijdelijk gepauzeerd.`
                    : request.action === "stop"
                      ? `${actor.profileName} heeft het contract stopgezet.`
                      : request.action === "resume"
                        ? `${actor.profileName} vraagt om het contract samen te hervatten.`
                        : request.action === "reactivate"
                          ? `${actor.profileName} vraagt om het contract samen te heractiveren.`
                          : `${actor.profileName} heeft exact deze contractversie ondertekend.`}
                </p>
                {request.action === "activate" && version && (
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
                    {version.summary.matchCount} matches · {version.summary.softLimitCount} zachte grenzen · {version.summary.hardLimitCount} harde grenzen
                  </p>
                )}
                {request.reason && (
                  <p className="mt-2 text-xs" style={{ color: "var(--text2)" }}>{request.reason}</p>
                )}
                {request.note && (
                  <p className="mt-4 text-sm italic leading-relaxed">“{request.note}”</p>
                )}
              </div>

              <p className="mt-4 text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
                De profielidentiteit, contracthash en aansluiting op de lokale contractgeschiedenis zijn gecontroleerd. Controleer ook zelf of namen, rollen en afspraken kloppen voordat je bevestigt.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirm()}
                className="focus-ring mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
              >
                <Check size={17} aria-hidden="true" />
                {busy ? "Bevestigen…" : actionButton(request.action)}
              </button>
            </div>
          )}

          {phase === "response" && responseEncoded && request && (
            <ContractQrDisplay
              encoded={responseEncoded}
              title="Antwoord terugsturen"
              instruction="Laat de andere persoon deze QR-reeks scannen. Scan daarna diens korte afrondingsbewijs terug."
              onScanResponse={() => setScannerOpen(true)}
              scanLabel="Afrondingsbewijs scannen"
            />
          )}

          {phase === "complete" && (
            <div className="py-4 text-center">
              <Check size={38} weight="bold" aria-hidden="true" className="mx-auto" style={{ color: "var(--yes)" }} />
              <h2 className="mt-3 text-lg font-semibold">Uitwisseling afgerond</h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
                Dit toestel heeft gecontroleerd dat de andere persoon jouw antwoord ontving en lokaal opsloeg.
              </p>
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-center leading-relaxed" style={{ color: "var(--hard-no)" }} role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={onClose}
            className="focus-ring mt-5 min-h-11 w-full rounded-xl text-sm font-medium"
            style={{ border: "1px solid var(--border)", color: "var(--text2)" }}
          >
            Sluiten
          </button>
        </SheetContent>
      </Sheet>

      <ContractQrScannerSheet
        open={open && scannerOpen}
        title={phase === "response" ? "Afrondingsbewijs scannen" : "Contractcode scannen"}
        onClose={() => { setScannerOpen(false); if (!requestEnvelope) onClose(); }}
        onEncoded={(value) => void receive(value)}
      />
    </>
  );
}
