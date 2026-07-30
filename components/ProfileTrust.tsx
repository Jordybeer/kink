"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, WarningCircle } from "@phosphor-icons/react";
import type { Profile } from "@/types";
import { profileConsentAlias, verifyProfileConsent, type ConsentVerification } from "@/lib/consentProof";
import { getProfileVerificationCode } from "@/lib/profileVerification";
import Sheet, { SheetContent } from "@/components/Sheet";

export default function ProfileTrust({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const [verification, setVerification] = useState<ConsentVerification>({ status: "unsigned" });
  const shared = profile.origin === "shared" || (!profile.origin && profile.isImported === true);

  useEffect(() => {
    let cancelled = false;
    void verifyProfileConsent(profile).then((result) => {
      if (!cancelled) setVerification(result);
    });
    return () => { cancelled = true; };
  }, [profile]);

  const valid = verification.status === "valid";
  const invalid = verification.status === "invalid";
  const label = invalid
    ? "Bron klopt niet"
    : shared
      ? valid ? "Bron bevestigd" : "Geïmporteerd"
      : valid ? `Versie ${profile.consentProof?.version} bevestigd` : "Eigen profiel";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring inline-flex items-center gap-1.5 mt-1.5 text-xs rounded-lg py-1"
        style={{ color: invalid ? "var(--hard-no)" : valid ? "var(--yes)" : "var(--text2)" }}
      >
        {invalid ? <WarningCircle size={13} weight="fill" aria-hidden="true" /> : valid ? <ShieldCheck size={13} weight="fill" aria-hidden="true" /> : null}
        <span>{label}</span>
        <span aria-hidden="true" style={{ opacity: 0.45 }}>·</span>
        <span className="truncate" style={{ maxWidth: 180 }}>{profileConsentAlias(profile)}</span>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} aria-label="Bron en toestemming">
        <SheetContent>
          <h2 className="text-lg font-bold mb-2">Bron en toestemming</h2>
          <p className="text-sm mb-4" style={{ color: "var(--text2)", lineHeight: 1.65 }}>
            KinkSync kan een versie van dit profiel digitaal verzegelen. Alleen het toestel met de eigendomssleutel kan daarna een geldige nieuwe versie maken. Zo valt op wanneer antwoorden na het delen zijn aangepast.
          </p>

          <div className="rounded-xl p-4 mb-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--text2)" }}>Leesbare bronnaam</p>
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{profileConsentAlias(profile)}</p>
            <p className="text-xs mt-3 mb-1" style={{ color: "var(--text2)" }}>Technische profielcode</p>
            <p className="text-xs font-mono break-all" style={{ color: "var(--text2)" }}>{getProfileVerificationCode(profile)}</p>
          </div>

          {valid ? (
            <div className="rounded-xl px-3 py-3 mb-4 text-sm" style={{ background: "color-mix(in srgb, var(--yes) 10%, var(--surface2))", border: "1px solid color-mix(in srgb, var(--yes) 35%, var(--border))", color: "var(--text2)" }}>
              <strong style={{ color: "var(--yes)" }}>Bron bevestigd.</strong> Deze antwoorden passen bij versie {profile.consentProof?.version} en zijn sinds die bevestiging niet gewijzigd.
            </div>
          ) : invalid ? (
            <div className="rounded-xl px-3 py-3 mb-4 text-sm" style={{ background: "color-mix(in srgb, var(--hard-no) 10%, var(--surface2))", border: "1px solid var(--hard-no)", color: "var(--text2)" }}>
              <strong style={{ color: "var(--hard-no)" }}>Niet vertrouwen als bevestigde toestemming.</strong> {verification.reason}
            </div>
          ) : (
            <div className="rounded-xl px-3 py-3 mb-4 text-sm" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>
              Dit profiel heeft nog geen digitale bronbevestiging. Het blijft bruikbaar, maar KinkSync kan niet bewijzen dat de antwoorden na het delen ongewijzigd zijn.
            </div>
          )}

          <p className="text-xs mb-5" style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            Dit bevestigt de herkomst en inhoud van de opgeslagen versie. Het bewijst niet dat iemand zonder druk bevestigde, en mondeling ingetrokken toestemming blijft altijd onmiddellijk gelden.
          </p>
          <button onClick={() => setOpen(false)} className="focus-ring w-full py-2.5 rounded-xl text-sm border" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
            Sluit
          </button>
        </SheetContent>
      </Sheet>
    </>
  );
}
