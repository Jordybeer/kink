"use client";

import { useEffect, useState } from "react";
import { ArrowsClockwise, Check, CopySimple, ShieldCheck, WarningCircle } from "@phosphor-icons/react";
import type { Profile } from "@/types";
import { profileConsentAlias, verifyProfileConsent, type ConsentVerification } from "@/lib/consentProof";
import { resolveProfileIdentityTrust, type ProfileIdentityTrust } from "@/lib/profileIdentityTrust";
import { getProfileVerificationCode } from "@/lib/profileVerification";
import { getPersistedProfileIdentityAnchor } from "@/lib/storeSecurity";
import Sheet, { SheetContent } from "@/components/Sheet";

export type ProfileTrustVisibleState =
  | "cryptographically-invalid"
  | "legacy-unsigned"
  | "signed-unanchored"
  | "identity-anchored";

export function visibleProfileTrustState(trust: ProfileIdentityTrust): ProfileTrustVisibleState {
  if (trust.status === "identity-anchored") return "identity-anchored";
  if (trust.status === "signed-unanchored") return "signed-unanchored";
  if (trust.status === "legacy-unverified") return "legacy-unsigned";
  return "cryptographically-invalid";
}

export function ProfileTrustStateNotice({
  state,
  version,
  reason,
}: {
  state: ProfileTrustVisibleState;
  version?: number;
  reason?: string;
}) {
  if (state === "identity-anchored") {
    return (
      <div className="mb-4 rounded-xl px-3 py-3 text-sm" style={{ background: "color-mix(in srgb, var(--willing) 8%, var(--surface2))", border: "1px solid color-mix(in srgb, var(--willing) 28%, var(--border))", color: "var(--text2)" }}>
        <strong style={{ color: "var(--willing)" }}>Identiteit bevestigd.</strong> Je hebt deze profielbron onafhankelijk vergeleken. De digitale inhoud{version ? ` van versie ${version}` : ""} past bij dezelfde verankerde sleutel.
      </div>
    );
  }

  if (state === "signed-unanchored") {
    return (
      <div className="mb-4 rounded-xl px-3 py-3 text-sm" style={{ background: "var(--surface2)", border: "1px solid var(--border-accent)", color: "var(--text2)" }}>
        <strong style={{ color: "var(--text)" }}>Identiteit nog niet bevestigd.</strong> De digitale handtekening van deze profielversie is geldig, maar dat bewijst niet dat deze sleutel bij de persoon hoort die jij denkt te kennen. Vergelijk de leesbare broncode onafhankelijk op het brontoestel of via een apart kanaal.
      </div>
    );
  }

  if (state === "legacy-unsigned") {
    return (
      <div className="mb-4 rounded-xl px-3 py-3 text-sm" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>
        <strong style={{ color: "var(--text)" }}>Legacy profiel · identiteit niet bevestigd.</strong> Dit oudere gedeelde profiel heeft geen digitale bronbevestiging en kan daarom niet als independently anchored contact gelden. Laat het opnieuw delen vanaf het eigen toestel om later te kunnen bevestigen.
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl px-3 py-3 text-sm" style={{ background: "color-mix(in srgb, var(--hard-no) 10%, var(--surface2))", border: "1px solid var(--hard-no)", color: "var(--text2)" }}>
      <strong style={{ color: "var(--hard-no)" }}>Cryptografische controle mislukt.</strong> {reason ?? "Deze profielkopie kan niet veilig aan de bekende bron worden gekoppeld."}
    </div>
  );
}

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
  const identityTrust = !checking && shared
    ? resolveProfileIdentityTrust(
        profile,
        verification.status,
        getPersistedProfileIdentityAnchor(profile.id),
      )
    : null;
  const visibleState = identityTrust ? visibleProfileTrustState(identityTrust) : null;
  const identityAnchored = visibleState === "identity-anchored";
  const signedUnanchored = visibleState === "signed-unanchored";
  const legacyUnsigned = visibleState === "legacy-unsigned";
  const label = checking
    ? "Bron controleren…"
    : shared
      ? identityAnchored
        ? "Identiteit bevestigd"
        : signedUnanchored
          ? "Bron geldig · identiteit niet bevestigd"
          : legacyUnsigned
            ? "Legacy · niet bevestigd"
            : "Cryptografisch ongeldig"
      : ownDirty
        ? "Nieuwe wijzigingen"
        : valid
          ? "Eigen bron geldig"
          : "Eigen profiel";
  const color = importedInvalid || (shared && visibleState === "cryptographically-invalid")
    ? "var(--hard-no)"
    : identityAnchored
      ? "var(--willing)"
      : ownDirty || signedUnanchored
        ? "var(--text)"
        : "var(--text2)";
  const background = importedInvalid || (shared && visibleState === "cryptographically-invalid")
    ? "color-mix(in srgb, var(--hard-no) 8%, var(--surface2))"
    : identityAnchored
      ? "color-mix(in srgb, var(--willing) 7%, var(--surface2))"
      : "var(--surface2)";
  const borderColor = importedInvalid || (shared && visibleState === "cryptographically-invalid")
    ? "color-mix(in srgb, var(--hard-no) 30%, var(--border))"
    : identityAnchored
      ? "color-mix(in srgb, var(--willing) 24%, var(--border))"
      : signedUnanchored
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
        className="focus-ring inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full px-2.5 text-[12px] font-normal transition-colors active:opacity-70"
        style={{ color, background, border: `1px solid ${borderColor}` }}
      >
        {checking
          ? <ArrowsClockwise size={12.5} weight="regular" aria-hidden="true" className="shrink-0 animate-spin motion-reduce:animate-none" />
          : shared && visibleState === "cryptographically-invalid"
            ? <WarningCircle size={12.5} weight="fill" aria-hidden="true" className="shrink-0" />
            : identityAnchored
              ? <ShieldCheck size={12.5} weight="fill" aria-hidden="true" className="shrink-0" />
              : ownDirty
                ? <ArrowsClockwise size={12.5} weight="regular" aria-hidden="true" className="shrink-0" style={{ color: "var(--text2)" }} />
                : null}
        <span className="truncate">{label}</span>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} scrollable aria-label="Bron en toestemming">
        <SheetContent
          showHandle={false}
          className="max-h-[calc(100dvh-env(safe-area-inset-top))] overflow-y-auto overscroll-contain px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6"
        >
          <h2 className="mb-2 text-lg font-bold">Bron en toestemming</h2>
          <p className="mb-4 text-sm" style={{ color: "var(--text2)", lineHeight: 1.65 }}>
            KinkSync kan een versie van dit profiel digitaal verzegelen. Alleen het toestel met de eigendomssleutel kan daarna een geldige nieuwe versie maken. Zo valt op wanneer gedeelde antwoorden achteraf zijn aangepast.
          </p>

          <div className="mb-4 rounded-xl p-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Profielbewijs</p>
                <p className="mt-0.5 text-xs" style={{ color: "var(--text2)" }}>
                  Gebruik dit om dezelfde profielbron op twee toestellen te herkennen.
                </p>
              </div>
              <button
                type="button"
                onClick={copyProof}
                className="focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium"
                style={{
                  borderColor: copied ? "var(--willing)" : "var(--border)",
                  color: copied ? "var(--willing)" : "var(--text2)",
                }}
              >
                {copied
                  ? <Check size={13} weight="regular" aria-hidden="true" />
                  : <CopySimple size={13} weight="regular" aria-hidden="true" />}
                {copied ? "Gekopieerd" : "Kopieer"}
              </button>
            </div>

            <div className="border-t pt-3" style={{ borderColor: "var(--border)" }}>
              <p className="mb-1 text-xs" style={{ color: "var(--text2)" }}>Leesbare broncode</p>
              <p className="break-words text-sm font-semibold" style={{ color: "var(--text)" }}>{alias}</p>
              <p className="mb-1 mt-3 text-xs" style={{ color: "var(--text2)" }}>Technische profielcode</p>
              <p className="break-all font-mono text-xs" style={{ color: "var(--text2)" }}>{verificationCode}</p>
            </div>
            <span className="sr-only" aria-live="polite">
              {copied ? "Profielbewijs gekopieerd" : ""}
            </span>
          </div>

          {checking ? (
            <div className="mb-4 rounded-xl px-3 py-3 text-sm" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>
              De bron en opgeslagen profielinhoud worden gecontroleerd…
            </div>
          ) : shared && visibleState ? (
            <ProfileTrustStateNotice
              state={visibleState}
              version={profile.consentProof?.version}
              reason={verification.status === "invalid" ? verification.reason : undefined}
            />
          ) : ownDirty ? (
            <div className="mb-4 rounded-xl px-3 py-3 text-sm" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>
              <strong style={{ color: "var(--text)" }}>Je hebt nieuwe wijzigingen.</strong> Dat is normaal op je eigen profiel. Wanneer je opnieuw deelt of een scène vastzet, maakt KinkSync hiervan een nieuwe bevestigde versie.
            </div>
          ) : valid ? (
            <div className="mb-4 rounded-xl px-3 py-3 text-sm" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>
              <strong style={{ color: "var(--text)" }}>Eigen bron geldig.</strong> Deze profielversie past bij je lokale eigendomssleutel.
            </div>
          ) : (
            <div className="mb-4 rounded-xl px-3 py-3 text-sm" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>
              Dit eigen profiel krijgt automatisch een eigendomssleutel wanneer je het voor het eerst deelt of voor een scène vastzet.
            </div>
          )}

          <p className="mb-5 text-xs" style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            Een digitale handtekening bevestigt alleen de cryptografische bron en inhoud van de opgeslagen versie. Alleen een apart vastgelegd identity anchor betekent dat jij de bron onafhankelijk hebt vergeleken. Ook dat bewijst geen wettelijke identiteit of vrijwilligheid. Mondelinge of non-verbale intrekking geldt altijd onmiddellijk.
          </p>
          <button onClick={() => setOpen(false)} className="focus-ring w-full rounded-xl border py-2.5 text-sm" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
            Sluit
          </button>
        </SheetContent>
      </Sheet>
    </>
  );
}
