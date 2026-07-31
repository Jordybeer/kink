"use client";

import { useEffect, useState } from "react";
import { ArrowsClockwise, ShieldCheck, WarningCircle } from "@phosphor-icons/react";
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
  const importedInvalid = shared && verification.status === "invalid";
  const ownDirty = !shared && verification.status === "invalid";
  const label = importedInvalid
    ? "Bron klopt niet"
    : ownDirty
      ? "Nieuwe wijzigingen"
      : shared
        ? valid ? "Bron bevestigd" : "Geïmporteerd"
        : valid ? `Versie ${profile.consentProof?.version} bevestigd` : "Eigen profiel";
  const color = importedInvalid
    ? "var(--hard-no)"
    : valid
      ? "var(--yes)"
      : ownDirty
        ? "var(--accent)"
        : "var(--text2)";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring inline-flex items-center gap-1.5 mt-1.5 text-xs rounded-lg py-1"
        style={{ color }}
      >
        {importedInvalid
          ? <WarningCircle size={13} weight="fill" aria-hidden="true" />
          : valid
            ? <ShieldCheck size={13} weight="fill" aria-hidden="true" />
            : ownDirty
              ? <ArrowsClockwise size={13} aria-hidden="true" />
              : null}
        <span>{label}</span>
        <span aria-hidden="true" style={{ opacity: 0.45 }}>·</span>
        <span className="truncate" style={{ maxWidth: 180 }}>{profileConsentAlias(profile)}</span>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} aria-label="Bron en toestemming">
        <SheetContent>
          <h2 className="text-lg font-bold mb-2">Bron en toestemming</h2>
          <p className="text-sm mb-4" style={{ color: "var(--text2)", lineHeight: 1.65 }}>
            KinkSync kan een versie van dit profiel digitaal verzegelen. Alleen het toestel met de eigendomssleutel kan daarna een geldige nieuwe versie maken. Zo valt op wanneer gedeelde antwoorden achteraf zijn aangepast.
          </p>

          <div className="rounded-xl p-4 mb-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--text2)" }}>Leesbare profielnaam</p>
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{profileConsentAlias(profile)}</p>
            <p className="text-xs mt-3 mb-1" style={{ color: "var(--text2)" }}>Technische profielcode</p>
            <p className="text-xs font-mono break-all" style={{ color: "var(--text2)" }}>{getProfileVerificationCode(profile)}</p>
          </div>

          {valid ? (
            <div className="rounded-xl px-3 py-3 mb-4 text-sm" style={{ background: "color-mix(in srgb, var(--yes) 10%, var(--surface2))", border: "1px solid color-mix(in srgb, var(--yes) 35%, var(--border))", color: "var(--text2)" }}>
              <strong style={{ color: "var(--yes)" }}>Bron bevestigd.</strong> Deze antwoorden passen bij versie {profile.consentProof?.version} en zijn sinds die bevestiging niet gewijzigd.
            </div>
          ) : importedInvalid ? (
            <div className="rounded-xl px-3 py-3 mb-4 text-sm" style={{ background: "color-mix(in srgb, var(--hard-no) 10%, var(--surface2))", border: "1px solid var(--hard-no)", color: "var(--text2)" }}>
              <strong style={{ color: "var(--hard-no)" }}>Niet vertrouwen als bevestigde toestemming.</strong> {verification.reason}
            </div>
          ) : ownDirty ? (
            <div className="rounded-xl px-3 py-3 mb-4 text-sm" style={{ background: "color-mix(in srgb, var(--accent) 8%, var(--surface2))", border: "1px solid var(--border-accent)", color: "var(--text2)" }}>
              <strong style={{ color: "var(--accent)" }}>Je hebt nieuwe wijzigingen.</strong> Dat is normaal op je eigen profiel. Wanneer je opnieuw deelt of een scène vastzet, maakt KinkSync hiervan een nieuwe bevestigde versie.
            </div>
          ) : (
            <div className="rounded-xl px-3 py-3 mb-4 text-sm" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>
              {shared
                ? "Dit oudere gedeelde profiel heeft geen digitale bronbevestiging. Het blijft alleen-lezen, maar de herkomst kan niet cryptografisch worden gecontroleerd."
                : "Dit eigen profiel krijgt automatisch een eigendomssleutel wanneer je het voor het eerst deelt of voor een scène vastzet."}
            </div>
          )}

          <p className="text-xs mb-5" style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            Dit bevestigt de cryptografische bron en inhoud van de opgeslagen versie. Het bewijst geen wettelijke identiteit of vrijwilligheid. Mondelinge of non-verbale intrekking geldt altijd onmiddellijk.
          </p>
          <button onClick={() => setOpen(false)} className="focus-ring w-full py-2.5 rounded-xl text-sm border" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
            Sluit
          </button>
        </SheetContent>
      </Sheet>
    </>
  );
}
