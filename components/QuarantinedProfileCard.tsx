"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Camera, ShieldWarning, Trash } from "@phosphor-icons/react";
import type { QuarantinedProfile } from "@/lib/profileQuarantine";
import { decodeSharedProfile } from "@/lib/profileShareV3";
import { getProfileVerificationCode } from "@/lib/profileVerification";
import { profileConsentAlias } from "@/lib/consentProof";
import { useStore } from "@/lib/store";

const QRScanner = dynamic(() => import("@/components/QRScanner"), { ssr: false });

export default function QuarantinedProfileCard({ record }: { record: QuarantinedProfile }) {
  const importProfiles = useStore((state) => state.importProfiles);
  const verifyImportedProfiles = useStore((state) => state.verifyImportedProfiles);
  const deleteQuarantinedProfile = useStore((state) => state.deleteQuarantinedProfile);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleReplacement(encoded: string) {
    setError(null);
    try {
      const incoming = await decodeSharedProfile(encoded);
      const current = record.profile;
      const currentProof = current.consentProof;
      const nextProof = incoming.consentProof;
      const sameIdentity = incoming.id === current.id
        && getProfileVerificationCode(incoming) === getProfileVerificationCode(current);
      const sameSource = !!currentProof && !!nextProof && currentProof.keyId === nextProof.keyId;
      const validVersion = !!currentProof && !!nextProof && (
        (nextProof.version === currentProof.version && nextProof.proofHash === currentProof.proofHash)
        || (nextProof.version > currentProof.version && nextProof.previousProofHash === currentProof.proofHash)
      );

      if (!sameIdentity || !sameSource || !validVersion) {
        setError("Deze deelcode hoort niet bij dezelfde bevestigde profielbron. De huidige profielkopie blijft apart staan en wordt niet gebruikt.");
        return;
      }

      importProfiles([{
        ...incoming,
        origin: "shared",
        isImported: true,
        lockedAt: Date.now(),
      }]);
      await verifyImportedProfiles();

      const restored = useStore.getState().profiles.some((profile) =>
        profile.id === current.id
        && getProfileVerificationCode(profile) === getProfileVerificationCode(current));
      if (!restored) {
        setError("Deze nieuwe profielversie kon niet worden bevestigd. Laat de eigenaar het profiel opnieuw delen vanaf het eigen toestel.");
      }
    } catch {
      setError("Deze profielcode is ongeldig of beschadigd, of hoort niet bij de verwachte profielbron.");
    } finally {
      setScannerOpen(false);
    }
  }

  return (
    <article
      className="rounded-2xl p-5"
      style={{
        background: "color-mix(in srgb, var(--hard-no) 7%, var(--surface))",
        border: "1px solid color-mix(in srgb, var(--hard-no) 55%, var(--border))",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-none"
          style={{ background: "color-mix(in srgb, var(--hard-no) 18%, var(--surface2))", color: "var(--hard-no)" }}
        >
          <ShieldWarning size={21} weight="fill" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold truncate" style={{ color: "var(--text)" }}>{record.profile.name}</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text2)" }}>
            {record.profile.role || "Geen rol"} · {profileConsentAlias(record.profile)}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm font-semibold" style={{ color: "var(--hard-no)" }}>
          Deze profielkopie moet opnieuw worden bevestigd
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--text2)", lineHeight: 1.6 }}>
          De opgeslagen profielkopie komt niet meer overeen met de versie die deze profielbron eerder bevestigde. Dat kan komen door beschadigde of gewijzigde lokale opslag en zegt niets over de persoon achter het profiel. Tot de eigenaar het profiel opnieuw deelt, gebruikt KinkSync deze kopie niet voor vergelijken, sessies of nieuwe scènes. Bestaande vastgezette afspraken blijven behouden.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-xs mt-3 rounded-lg px-3 py-2" style={{ color: "var(--hard-no)", background: "var(--surface2)" }}>
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 mt-4">
        <button
          type="button"
          onClick={() => { setError(null); setScannerOpen(true); }}
          className="focus-ring w-full min-h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}
        >
          <Camera size={17} aria-hidden="true" />
          Opnieuw bevestigen via QR
        </button>

        {confirmDelete ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => deleteQuarantinedProfile(record.profile.id)}
              className="focus-ring flex-1 min-h-10 rounded-xl text-xs font-semibold"
              style={{ background: "var(--hard-no)", color: "white" }}
            >
              Definitief verwijderen
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="focus-ring px-4 min-h-10 rounded-xl text-xs border"
              style={{ borderColor: "var(--border)", color: "var(--text2)" }}
            >
              Annuleer
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="focus-ring w-full min-h-10 rounded-xl text-xs flex items-center justify-center gap-2 border"
            style={{ borderColor: "var(--border)", color: "var(--text2)" }}
          >
            <Trash size={15} aria-hidden="true" />
            Opgeslagen kopie verwijderen
          </button>
        )}
      </div>

      <details className="mt-4 text-xs" style={{ color: "var(--text2)" }}>
        <summary className="cursor-pointer focus-ring rounded-md">Technische details</summary>
        <p className="mt-2 break-words" style={{ lineHeight: 1.55 }}>{record.reason}</p>
      </details>

      {scannerOpen && (
        <QRScanner
          open={scannerOpen}
          onResult={handleReplacement}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </article>
  );
}
