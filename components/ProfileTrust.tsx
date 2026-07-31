"use client";

import { useEffect, useState } from "react";
import { ArrowsClockwise, Check, CopySimple, ShieldCheck, WarningCircle } from "@phosphor-icons/react";
import type { Profile } from "@/types";
import { profileConsentAlias, verifyProfileConsent, type ConsentVerification } from "@/lib/consentProof";
import { getProfileVerificationCode } from "@/lib/profileVerification";
import Sheet, { SheetContent } from "@/components/Sheet";

export default function ProfileTrust({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const [verification, setVerification] = useState<ConsentVerification>({ status: "unsigned" });
  const [checking, setChecking] = useState(true);
  const [copied, setCopied] = useState(false);
  const shared = profile.origin === "shared" || (!profile.origin && profile.isImported === true);

  useEffect(() => {
    let cancelled = false;
    setChecking(true);
    void verifyProfileConsent(profile).then((result) => {
      if (!cancelled) {
        setVerification(result);
        setChecking(false);
      }
    });
    return () => { cancelled = true; };
  }, [profile]);

  const valid = !checking && verification.status === "valid";
  const importedInvalid = !checking && shared && verification.status === "invalid";
  const ownDirty = !checking && !shared && verification.status === "invalid";
  const label = checking
    ? "Bron controleren…"
    : importedInvalid
      ? "Opnieuw bevestigen"
      : ownDirty
        ? "Nieuwe wijzigingen"
        : valid
          ? "Bron bevestigd"
          : shared
            ? "Niet geverifieerd"
            : "Eigen profiel";
  const color = checking
    ? "var(--text2)"
    : importedInvalid
      ? "var(--hard-no)"
      : valid
        ? "var(--yes)"
        : ownDirty
          ? "var(--accent)"
          : "var(--text2)";
  const background = checking
    ? "var(--surface2)"
    : importedInvalid
      ? "color-mix(in srgb, var(--hard-no) 9%, var(--surface2))"
      : valid
        ? "color-mix(in srgb, var(--yes) 9%, var(--surface2))"
        : ownDirty
          ? "color-mix(in srgb, var(--accent) 9%, var(--surface2))"
          : "var(--surface2)";
  const borderColor = importedInvalid
    ? "color-mix(in srgb, var(--hard-no) 45%, var(--border))"
    : valid
      ? "color-mix(in srgb, var(--yes) 35%, var(--border))"
      : ownDirty
        ? "var(--border-accent)"
        : "var(--border)";
  const alias = profileConsentAlias(profile);
  const verificationCode = getProfileVerificationCode(profile);

  async function copyProof() {
    try {
      await navigator.clipboard.writeText(
        `Leesbare broncode: ${alias}\nTechnische profielcode: ${verificationCode}`,
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${label}. Bekijk bron en toestemming`}
        className="focus-ring mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
        style={{ color, background, borderColor }}
      >
        {importedInvalid
          ? <WarningCircle size={13} weight="fill" aria-hidden="true" className="shrink-0" />
          : valid
            ? <ShieldCheck size={13} weight="fill" aria-hidden="true" className="shrink-0" />
            : ownDirty
              ? <ArrowsClockwise size={13} aria-hidden="true" className="shrink-0" />
              : null}
        <span className="truncate">{label}</span>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} scrollable aria-label="Bron en toestemming">
        <SheetContent
          showHandle={false}
          className="max-h-[calc(100dvh-env(safe-area-inset-top))] overflow-y-auto overscroll-contain px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6"
        >
          <h2 className="text-lg font-bold mb-2">Bron en toestemming</h2>
          <p className="text-sm mb-4" style={{ color: "var(--text2)", lineHeight: 1.65 }}>
            KinkSync kan een versie van dit profiel digitaal verzegelen. Alleen het toestel met de eigendomssleutel kan daarna een geldige nieuwe versie maken. Zo valt op wanneer gedeelde antwoorden achteraf zijn aangepast.
          </p>

          <div className="rounded-xl p-4 mb-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Profielbewijs</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text2)" }}>
                  Gebruik dit om dezelfde profielbron op twee toestellen te herkennen.
                </p>
              </div>
              <button
                type="button"
                onClick={copyProof}
                className="focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium"
                style={{
                  borderColor: copied ? "var(--yes)" : "var(--border)",
                  color: copied ? "var(--yes)" : "var(--text2)",
                }}
              >
                {copied
                  ? <Check size={13} weight="bold" aria-hidden="true" />
                  : <CopySimple size={13} aria-hidden="true" />}
                {copied ? "Gekopieerd" : "Kopieer"}
              </button>
            </div>

            <div className="border-t pt-3" style={{ borderColor: "var(--border)" }}>
              <p className="text-xs mb-1" style={{ color: "var(--text2)" }}>Leesbare broncode</p>
              <p className="text-sm font-semibold break-words" style={{ color: "var(--text)" }}>{alias}</p>
              <p className="text-xs mt-3 mb-1" style={{ color: "var(--text2)" }}>Technische profielcode</p>
              <p className="text-xs font-mono break-all" style={{ color: "var(--text2)" }}>{verificationCode}</p>
            </div>
            <span className="sr-only" aria-live="polite">
              {copied ? "Profielbewijs gekopieerd" : ""}
            </span>
          </div>

          {valid ? (
            <div className="rounded-xl px-3 py-3 mb-4 text-sm" style={{ background: "color-mix(in srgb, var(--yes) 10%, var(--surface2))", border: "1px solid color-mix(in srgb, var(--yes) 35%, var(--border))", color: "var(--text2)" }}>
              <strong style={{ color: "var(--yes)" }}>Bron bevestigd.</strong> Deze antwoorden passen bij versie {profile.consentProof?.version} en zijn sinds die bevestiging niet gewijzigd.
            </div>
          ) : importedInvalid ? (
            <div className="rounded-xl px-3 py-3 mb-4 text-sm" style={{ background: "color-mix(in srgb, var(--hard-no) 10%, var(--surface2))", border: "1px solid var(--hard-no)", color: "var(--text2)" }}>
              <strong style={{ color: "var(--hard-no)" }}>Deze profielkopie moet opnieuw worden bevestigd.</strong> {verification.reason}
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
