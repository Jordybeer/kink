"use client";

import { ArrowLeft, Pause, Play, Stop, Trash } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import type { Profile } from "@/types";
import Sheet, { SheetContent } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { useStore } from "@/lib/store";
import { useContractStore } from "@/lib/contractStore";
import {
  contractBucket,
  currentContractVersion,
  type ContractAction,
  type ContractExchangeEnvelope,
  type ContractSeries,
} from "@/lib/contractLifecycle";
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
  series: ContractSeries;
  onClose: () => void;
}

type View = "menu" | "confirm" | "qr" | "receipt" | "complete";

function owned(profile: Profile | undefined): profile is Profile {
  return !!profile && profile.origin !== "shared" && profile.isImported !== true;
}

function actionLabel(action: ContractAction): string {
  if (action === "pause") return "Tijdelijk pauzeren";
  if (action === "resume") return "Hervatting aanvragen";
  if (action === "stop") return "Contract stopzetten";
  if (action === "reactivate") return "Contract heractiveren";
  return "Contract activeren";
}

export default function ContractManageSheet({ open, series, onClose }: Props) {
  const profiles = useStore((state) => state.profiles);
  const sealProfileConsent = useStore((state) => state.sealProfileConsent);
  const upsertSeries = useContractStore((state) => state.upsertSeries);
  const deleteSeries = useContractStore((state) => state.deleteSeries);
  const { showToast } = useToast();
  const [view, setView] = useState<View>("menu");
  const [action, setAction] = useState<ContractAction | null>(null);
  const [note, setNote] = useState("");
  const [workingSeries, setWorkingSeries] = useState(series);
  const [encoded, setEncoded] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setView("menu");
    setAction(null);
    setNote("");
    setWorkingSeries(series);
    setEncoded(null);
    setScannerOpen(false);
    setBusy(false);
    setError(null);
  }, [open, series]);

  const bucket = contractBucket(workingSeries, profiles);
  const currentVersion = currentContractVersion(workingSeries);
  const participantProfiles = workingSeries.participants.map((participant) =>
    profiles.find((profile) => profile.id === participant.profileId));
  const localProfiles = participantProfiles.filter(owned);
  const canManage = localProfiles.length === 1;
  const profilesAvailable = participantProfiles.every(Boolean);

  const menuActions = useMemo(() => {
    if (bucket === "active") return ["pause", "stop"] as ContractAction[];
    if (bucket === "paused") return ["resume", "stop"] as ContractAction[];
    if (bucket === "archive" && workingSeries.status === "stopped" && profilesAvailable) {
      return ["reactivate"] as ContractAction[];
    }
    return [] as ContractAction[];
  }, [bucket, profilesAvailable, workingSeries.status]);

  function choose(next: ContractAction) {
    setAction(next);
    setNote("");
    setError(null);
    setView("confirm");
  }

  async function startRequest() {
    if (!action) return;
    setBusy(true);
    setError(null);
    try {
      if (!canManage) throw new Error("Beheer dit contract op het eigen toestel van exact één deelnemer.");
      if (!currentVersion) throw new Error("De huidige contractversie ontbreekt.");
      if (action === "reactivate" && !currentVersion.content) {
        throw new Error("Dit historische contract bevat geen volledige getekende versie en kan daarom niet veilig worden heractiveerd.");
      }
      const actor = localProfiles[0];
      const counterparty = participantProfiles.find((profile) => profile?.id !== actor.id);
      if (!counterparty) throw new Error("Het profiel van de tweede partij ontbreekt.");
      const sealed = await sealProfileConsent(actor.id);
      if (!sealed) throw new Error(`${actor.name} kon niet cryptografisch worden bevestigd.`);
      const ownerKey = useStore.getState().profileOwnerKeys.find((key) => key.profileId === actor.id);
      if (!ownerKey) throw new Error("De eigendomssleutel ontbreekt.");
      const result = await createContractRequest({
        series: workingSeries,
        action,
        actor: sealed,
        counterparty,
        ownerKey,
        ...(action === "pause" ? { reason: "Tijdelijk gepauzeerd" as const } : {}),
        ...(action === "stop" ? { reason: "Dynamiek beëindigd" as const } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      upsertSeries(result.series);
      setWorkingSeries(result.series);
      setEncoded(encodeContractEnvelope(result.envelope));
      setView("qr");
      showToast({
        message: action === "pause"
          ? "Contract gepauzeerd. Laat de tweede partij de QR scannen om ontvangst te bevestigen."
          : action === "stop"
            ? "Contract stopgezet. Laat de tweede partij de QR scannen om ontvangst te bevestigen."
            : action === "resume"
              ? "Hervatting aangevraagd. Het contract wordt pas actief na de tweede bevestiging."
              : "Heractivering aangevraagd. Beide partijen moeten bevestigen.",
        action: { label: "Toon QR", onClick: () => setView("qr") },
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "De contractactie kon niet worden gestart.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResponse(raw: string) {
    setScannerOpen(false);
    setBusy(true);
    setError(null);
    try {
      const request = workingSeries.pendingRequest;
      if (!request) throw new Error("Het openstaande contractverzoek ontbreekt.");
      const envelope = decodeContractEnvelope(raw);
      const applied = await verifyAndApplyContractResponse({ currentSeries: workingSeries, envelope });
      if (!envelope.responderProof) throw new Error("De bevestiging van de tweede partij ontbreekt.");
      const actor = profiles.find((profile) => profile.id === request.actorProfileId);
      if (!owned(actor)) throw new Error("Het eigen profiel van de aanvrager ontbreekt.");
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
      setWorkingSeries(receipt.series);
      setEncoded(encodeContractEnvelope(receipt.envelope));
      setView("receipt");
      showToast({ message: "Bevestiging opgeslagen. Laat de tweede partij nog het korte afrondingsbewijs scannen.", variant: "success" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Het antwoord kon niet worden gecontroleerd.");
    } finally {
      setBusy(false);
    }
  }

  function showPendingRequest() {
    if (!workingSeries.pendingRequest) return;
    const envelope: ContractExchangeEnvelope = {
      schema: 1,
      kind: "request",
      request: workingSeries.pendingRequest,
      series: workingSeries,
    };
    setEncoded(encodeContractEnvelope(envelope));
    setAction(workingSeries.pendingRequest.action);
    setView("qr");
  }

  return (
    <>
      <Sheet open={open} onClose={onClose} scrollable aria-label="Contract beheren">
        <SheetContent
          showHandle={false}
          className="max-h-[calc(100dvh-env(safe-area-inset-top))] overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4"
        >
          {view === "menu" && (
            <div>
              <h2 className="text-lg font-semibold">Contract beheren</h2>
              <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
                Alleen acties die bij de huidige status passen worden getoond.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                {menuActions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => choose(item)}
                    className="focus-ring flex min-h-12 items-center gap-3 rounded-xl px-4 text-left text-sm font-medium"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: item === "stop" ? "var(--hard-no)" : "var(--text)" }}
                  >
                    {item === "pause" ? <Pause size={18} aria-hidden="true" />
                      : item === "stop" ? <Stop size={18} aria-hidden="true" />
                        : <Play size={18} aria-hidden="true" />}
                    {actionLabel(item)}
                  </button>
                ))}
                {workingSeries.pendingRequest && (
                  <button
                    type="button"
                    onClick={showPendingRequest}
                    className="focus-ring min-h-12 rounded-xl px-4 text-left text-sm font-medium"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                  >
                    Openstaande QR opnieuw tonen
                  </button>
                )}
                {bucket === "archive" && (
                  <button
                    type="button"
                    onClick={() => {
                      deleteSeries(workingSeries.id);
                      showToast({ message: "Contract en lokale geschiedenis permanent verwijderd." });
                      onClose();
                    }}
                    className="focus-ring flex min-h-12 items-center gap-3 rounded-xl px-4 text-left text-sm font-medium"
                    style={{ color: "var(--hard-no)", border: "1px solid var(--border)" }}
                  >
                    <Trash size={18} aria-hidden="true" />
                    Permanent verwijderen
                  </button>
                )}
              </div>
              {!profilesAvailable && (
                <p className="mt-4 text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
                  Heractiveren is niet mogelijk omdat een gekoppeld profiel niet meer beschikbaar is.
                </p>
              )}
            </div>
          )}

          {view === "confirm" && action && (
            <div>
              <button
                type="button"
                onClick={() => setView("menu")}
                className="focus-ring -ml-2 flex min-h-10 items-center gap-1 px-2 text-xs"
                style={{ color: "var(--text2)" }}
              >
                <ArrowLeft size={14} aria-hidden="true" />
                Terug
              </button>
              <h2 className="mt-2 text-lg font-semibold">{actionLabel(action)}?</h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
                {action === "pause"
                  ? "De afspraken worden onmiddellijk als gepauzeerd gemarkeerd. Hervatten vereist opnieuw toestemming van jullie beiden."
                  : action === "stop"
                    ? "Het contract verhuist onmiddellijk naar Archief. De tweede partij kan dit niet blokkeren, maar bevestigt later wel de ontvangst."
                    : action === "resume"
                      ? "Het contract blijft gepauzeerd totdat de tweede partij deze hervatting op het eigen toestel bevestigt."
                      : "Het contract wordt pas opnieuw actief nadat beide partijen de heractivering bevestigen."}
              </p>
              {(action === "pause" || action === "stop") && (
                <div className="mt-4 rounded-xl px-3 py-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <p className="text-xs" style={{ color: "var(--text2)" }}>Reden</p>
                  <p className="mt-1 text-sm font-medium">
                    {action === "pause" ? "Tijdelijk gepauzeerd" : "Dynamiek beëindigd"}
                  </p>
                </div>
              )}
              <label className="mt-4 block">
                <span className="text-xs font-medium" style={{ color: "var(--text2)" }}>
                  Notitie bij deze wijziging (optioneel)
                </span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={4}
                  maxLength={800}
                  className="focus-ring mt-2 w-full rounded-xl px-3 py-2 text-sm"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                  placeholder="Bijvoorbeeld: We willen eerst de grenzen opnieuw bespreken."
                />
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => void startRequest()}
                className="focus-ring mt-5 min-h-11 w-full rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: action === "stop" ? "var(--hard-no)" : "var(--accent)", color: "var(--on-accent)" }}
              >
                {busy ? "Bevestigen…" : actionLabel(action)}
              </button>
            </div>
          )}

          {view === "qr" && encoded && action && (
            <ContractQrDisplay
              encoded={encoded}
              title={actionLabel(action)}
              instruction={requestInstruction(action)}
              onScanResponse={() => setScannerOpen(true)}
            />
          )}

          {view === "receipt" && encoded && action && (
            <div>
              <ContractQrDisplay
                encoded={encoded}
                title="Uitwisseling afronden"
                instruction="Laat de andere persoon deze korte QR scannen. Daarna staat op beide toestellen vast dat het antwoord werd ontvangen en opgeslagen."
              />
              <button
                type="button"
                onClick={onClose}
                className="focus-ring mt-4 min-h-11 w-full rounded-xl text-sm font-semibold"
                style={{ background: "var(--accent)", color: "var(--on-accent)" }}
              >
                Gereed
              </button>
            </div>
          )}

          {view === "complete" && (
            <div className="py-4 text-center">
              <h2 className="text-lg font-semibold">Bevestiging opgeslagen</h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
                De handtekening van de tweede partij hoort bij dit contract, deze actie en deze exacte contracthash.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="focus-ring mt-5 min-h-11 w-full rounded-xl text-sm font-semibold"
                style={{ background: "var(--accent)", color: "var(--on-accent)" }}
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
