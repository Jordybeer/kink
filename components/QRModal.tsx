"use client";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CopySimple } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { Profile } from "@/types";
import { encodeProfileShareTransport, type ProfileShareTransport } from "@/lib/profileShareV3";
import { encodeSwitchProfileShareTransport, getSwitchProfilePair } from "@/lib/profileSwitchShare";
import {
  buildProfileQrBundleSet,
  nextProfileQrIndex,
  PROFILE_QR_AUTO_INTERVAL_MS,
  PROFILE_QR_SLOW_INTERVAL_MS,
  type ProfileQrFrame,
} from "@/lib/profileQr";
import { useStore } from "@/lib/store";
import { qrRenderOptions } from "@/lib/qrAppearance";
import Sheet, { SheetContent } from "./Sheet";

interface Props {
  profile: Profile | null;
  onClose: () => void;
}

export default function QRModal({ profile, onClose }: Props) {
  const sealProfileConsent = useStore((state) => state.sealProfileConsent);
  const profiles = useStore((state) => state.profiles);
  const [preparedProfile, setPreparedProfile] = useState<Profile | null>(null);
  const [qrValues, setQrValues] = useState<string[]>([]);
  const [qrFrames, setQrFrames] = useState<ProfileQrFrame[]>([]);
  const [qrDataUrls, setQrDataUrls] = useState<string[]>([]);
  const [qrIndex, setQrIndex] = useState(0);
  const [qrTooLarge, setQrTooLarge] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [slowMode, setSlowMode] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");
  const [includeFetLife, setIncludeFetLife] = useState(false);
  const [includeAvatar, setIncludeAvatar] = useState(false);
  const [includeBdsmtest, setIncludeBdsmtest] = useState(false);
  const [settledPreferenceKey, setSettledPreferenceKey] = useState<string | null>(null);
  const [avatarSkipped, setAvatarSkipped] = useState(false);
  const [avatarLinkOnly, setAvatarLinkOnly] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const switchPair = profile ? getSwitchProfilePair(profile, profiles) : null;
  const shareMembers = switchPair ?? (profile ? [profile] : []);
  const ownsProfile = shareMembers.length > 0
    && shareMembers.every((member) => member.origin !== "shared" && member.isImported !== true);
  const avatarSource = ownsProfile ? shareMembers.find((member) => !!member.avatarDataUrl) : undefined;
  const canShareAvatar = !!avatarSource;
  const hasBdsmtest = shareMembers.some((member) => Boolean(member.bdsmtestUrl || member.bdsmtestScores?.length));
  const switchVersionKey = switchPair
    ? switchPair.map((member) => `${member.id}:${member.updatedAt}:${member.avatarDataUrl ? "avatar" : "none"}`).join("|")
    : "single";
  const preferenceKey = profile
    ? `${profile.id}:${profile.avatarDataUrl ? "avatar" : "none"}:${ownsProfile ? "own" : "shared"}:${switchVersionKey}`
    : null;

  useEffect(() => {
    setIncludeFetLife(false);
    setIncludeAvatar(canShareAvatar);
    setIncludeBdsmtest(false);
    setSettledPreferenceKey(preferenceKey);
  }, [preferenceKey, canShareAvatar]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyPreference = () => {
      setReducedMotion(query.matches);
      if (query.matches) setAutoAdvance(false);
    };
    applyPreference();
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", applyPreference);
      return () => query.removeEventListener("change", applyPreference);
    }
    query.addListener(applyPreference);
    return () => query.removeListener(applyPreference);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPreparedProfile(null);
    setQrValues([]);
    setQrFrames([]);
    setQrDataUrls([]);
    setQrIndex(0);
    setQrTooLarge(false);
    setAutoAdvance(false);
    setSlowMode(false);
    setCopied(false);
    setAvatarSkipped(false);
    setAvatarLinkOnly(false);
    setGenerationError(null);
    if (!profile) {
      setUrl("");
      return;
    }
    if (settledPreferenceKey !== preferenceKey) return;

    void (async () => {
      try {
        let ready: Profile;
        let transport: ProfileShareTransport;
        let sharedAvatar = false;

        if (switchPair) {
          const readyMembers: Profile[] = [];
          for (const member of switchPair) {
            const sealed = member.origin === "shared" || member.isImported
              ? member
              : await sealProfileConsent(member.id);
            if (!sealed) throw new Error("Switch-profiel kon niet volledig worden bevestigd");
            readyMembers.push(sealed);
          }
          const [readyDominant, readySubmissive] = readyMembers as [Profile, Profile];
          const avatarMember = includeAvatar
            ? readyMembers.find((member) => !!member.avatarDataUrl)
            : undefined;
          const switchTransport = await encodeSwitchProfileShareTransport(
            readyDominant,
            readySubmissive,
            {
              includeFetLife,
              includeBdsmtest,
              includeAvatar,
              avatarProfileId: avatarMember?.id,
              ownerKeys: useStore.getState().profileOwnerKeys,
              linkProof: ownsProfile
                ? undefined
                : readyDominant.switchShareProof ?? readySubmissive.switchShareProof,
            },
          );
          ready = readyMembers.find((member) => member.id === profile.id) ?? readyDominant;
          transport = switchTransport;
          sharedAvatar = switchTransport.avatarEmbedded;
        } else {
          ready = profile.origin === "shared" || profile.isImported
            ? profile
            : (await sealProfileConsent(profile.id))!;
          if (!ready) throw new Error("Profiel kon niet worden bevestigd");
          const key = useStore.getState().profileOwnerKeys.find((candidate) => candidate.profileId === ready.id);
          transport = await encodeProfileShareTransport(ready, {
            includeFetLife,
            includeBdsmtest,
            includeAvatar,
            profileOwnerKey: key,
            avatarOwnerKey: includeAvatar ? key : undefined,
          });
          sharedAvatar = !!transport.avatarPayload;
        }

        let share = buildProfileQrBundleSet(
          window.location.origin,
          transport.profilePayload,
          transport.encoded,
          transport.avatarPayload,
        );
        let linkOnly = false;

        if (transport.avatarPayload && share.qrTooLarge) {
          const profileOnly = buildProfileQrBundleSet(
            window.location.origin,
            transport.profilePayload,
            transport.profilePayload,
          );
          if (!profileOnly.qrTooLarge) {
            share = { ...profileOnly, shareUrl: share.shareUrl };
            linkOnly = true;
          }
        }

        if (cancelled) return;
        setPreparedProfile(ready);
        setAvatarSkipped(includeAvatar && canShareAvatar && !sharedAvatar);
        setAvatarLinkOnly(linkOnly);
        setUrl(share.shareUrl);
        setQrValues(share.qrValues);
        setQrFrames(share.frames);
        setQrTooLarge(share.qrTooLarge);
      } catch {
        if (!cancelled) {
          setPreparedProfile(null);
          setGenerationError("Deelcode kon niet worden opgebouwd.");
        }
      }
    })();

    return () => { cancelled = true; };
    // Consent sealing may swap the profile object, but it doesn't get to tug
    // this QR around: only the shareable identity/content fields hold the leash.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    profile?.id,
    profile?.updatedAt,
    profile?.origin,
    profile?.isImported,
    profile?.avatarDataUrl,
    includeFetLife,
    includeBdsmtest,
    includeAvatar,
    preferenceKey,
    settledPreferenceKey,
    sealProfileConsent,
  ]);

  useEffect(() => {
    let cancelled = false;
    setQrDataUrls([]);
    setQrIndex(0);
    setAutoAdvance(false);
    if (!qrValues.length) return;

    Promise.all(qrValues.map((value) => QRCode.toDataURL(value, qrRenderOptions(280, "L"))))
      .then((images) => {
        if (cancelled) return;
        setQrDataUrls(images);
        if (images.length > 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) setAutoAdvance(true);
      })
      .catch(() => {
        if (!cancelled) setGenerationError("QR-code kon niet worden opgebouwd.");
      });

    return () => { cancelled = true; };
  }, [qrValues]);

  useEffect(() => {
    if (!autoAdvance || qrValues.length < 2 || qrDataUrls.length !== qrValues.length) return;
    const interval = window.setInterval(() => {
      setQrIndex((index) => nextProfileQrIndex(index, qrValues.length));
    }, slowMode ? PROFILE_QR_SLOW_INTERVAL_MS : PROFILE_QR_AUTO_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [autoAdvance, slowMode, qrValues.length, qrDataUrls.length]);

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function showPrevious() {
    setAutoAdvance(false);
    setQrIndex((index) => (index <= 0 ? qrValues.length - 1 : index - 1));
  }

  function showNext() {
    setAutoAdvance(false);
    setQrIndex((index) => nextProfileQrIndex(index, qrValues.length));
  }

  const multi = qrValues.length > 1;
  const qrDataUrl = qrDataUrls[qrIndex] ?? null;
  const currentFrame = qrFrames[qrIndex] ?? null;
  const avatarIncluded = canShareAvatar && includeAvatar && !avatarSkipped;
  const avatarInQrSequence = avatarIncluded && !avatarLinkOnly;
  const bdsmtestIncluded = includeBdsmtest && hasBdsmtest;
  const proofConfirmed = Boolean(preparedProfile?.consentProof || switchPair?.some((member) => member.consentProof));

  return (
    <Sheet open={profile !== null} onClose={onClose} scrollable aria-label="Profiel delen">
      <SheetContent
        showHandle={false}
        className="overflow-y-auto overscroll-contain px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3"
        style={{ maxHeight: "calc(var(--visual-viewport-height, 100dvh) - env(safe-area-inset-top))" }}
        data-testid="profile-share-sheet"
      >
        <div className="text-center">
          <h2 className="text-base font-bold">Deel profiel</h2>
          {profile && (
            <p className="mt-0.5 text-sm" style={{ color: "var(--accent-text)" }}>
              {profile.name}{proofConfirmed ? <span className="ml-1.5 text-sm" style={{ color: "var(--yes)" }}>· bevestigd</span> : null}
            </p>
          )}
        </div>

        {multi && currentFrame && (
          <p className="mt-2 text-center text-sm font-semibold" style={{ color: "var(--text2)" }}>
            {currentFrame.phase === "avatar" ? "Foto" : "Profiel"} QR {currentFrame.index} van {currentFrame.total}
          </p>
        )}

        {qrTooLarge ? (
          <div
            className="mx-auto my-2.5 flex aspect-square w-[min(64vw,15rem)] items-center justify-center rounded-xl px-5 text-center text-sm"
            style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}
            role="status"
          >
            Te veel gegevens voor een betrouwbare QR-reeks. De volledige link hieronder deelt alles zonder dataverlies.
          </div>
        ) : qrDataUrl ? (
          <div
            className="profile-share-qr mx-auto my-2.5 flex aspect-square w-[min(64vw,15rem)] items-center justify-center overflow-hidden rounded-xl"
            style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}
            data-testid="profile-share-qr"
          >
            <img
              src={qrDataUrl}
              width={280}
              height={280}
              alt={currentFrame
                ? `${currentFrame.phase === "avatar" ? "Profielfoto" : "Profiel"} QR-code ${currentFrame.index} van ${currentFrame.total}`
                : "QR-code voor profielimport"}
              className="profile-share-qr-image h-full w-full shrink-0"
            />
          </div>
        ) : (
          <div
            className="profile-share-qr mx-auto my-2.5 flex aspect-square w-[min(64vw,15rem)] animate-pulse items-center justify-center rounded-xl px-5 text-center text-sm"
            style={{ background: "#FFFFFF", color: "#4b5563", border: "1px solid var(--border)" }}
            aria-label="QR-code laden…"
          >
            {generationError ?? (multi ? "QR-reeks voorbereiden…" : "Volledig profiel inpakken…")}
          </div>
        )}

        {multi && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAutoAdvance((active) => !active)}
                disabled={qrDataUrls.length !== qrValues.length}
                aria-pressed={autoAdvance}
                className="focus-ring min-h-11 rounded-xl border text-sm font-semibold disabled:opacity-35"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                {autoAdvance ? "Pauzeer" : "Hervat"}
              </button>
              <button
                type="button"
                onClick={() => setSlowMode((slow) => !slow)}
                aria-pressed={slowMode}
                className="focus-ring min-h-11 rounded-xl border text-sm font-semibold"
                style={{ borderColor: slowMode ? "var(--border-accent)" : "var(--border)", color: slowMode ? "var(--accent-text)" : "var(--text2)" }}
              >
                {slowMode ? "Rustig tempo" : "Rustiger"}
              </button>
            </div>
            {!autoAdvance && (
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={showPrevious} className="focus-ring inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg border text-sm" style={{ borderColor: "var(--border)", color: "var(--text2)" }}><ArrowLeft size={13} aria-hidden="true" /> Vorige</button>
                <button type="button" onClick={showNext} className="focus-ring inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg border text-sm" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>Volgende <ArrowRight size={13} aria-hidden="true" /></button>
              </div>
            )}
            <p className="mt-2 text-center text-sm" style={{ color: "var(--text2)" }}>
              Volgorde maakt niet uit. Dubbele scans zijn oké.
            </p>
            {reducedMotion && !autoAdvance && <p className="mt-1 text-center text-sm" style={{ color: "var(--text2)" }}>Automatisch wisselen blijft uit volgens je bewegingsinstelling.</p>}
          </>
        )}

        {avatarInQrSequence && <p className="mt-1 text-center text-sm" style={{ color: "var(--yes)" }}>De bevestigde profielfoto reist mee.</p>}
        {avatarLinkOnly && <p className="mt-1 text-center text-sm" style={{ color: "var(--maybe)" }} role="status">De foto past niet betrouwbaar in de QR-reeks. De volledige link bevat ze wel.</p>}

        {(canShareAvatar || profile?.fetLifeUsername || hasBdsmtest) && (
          <div className="mt-2 grid gap-1">
            {canShareAvatar && (
              <label className="focus-within:ring-2 focus-within:ring-[var(--focus)] flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-xl px-2 text-sm">
                <span className="flex h-5 w-5 flex-none items-center justify-center rounded border transition-colors" style={includeAvatar ? { background: "var(--action-primary)", borderColor: "var(--accent)" } : { borderColor: "var(--border)" }} aria-hidden="true">
                  {includeAvatar && <Check size={11} weight="bold" aria-hidden="true" />}
                </span>
                <input type="checkbox" className="sr-only" checked={includeAvatar} onChange={(event) => setIncludeAvatar(event.target.checked)} />
                <span style={{ color: "var(--text2)" }}>Profielfoto meesturen</span>
              </label>
            )}

            {profile?.fetLifeUsername && (
              <label className="focus-within:ring-2 focus-within:ring-[var(--focus)] flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-xl px-2 text-sm">
                <span className="flex h-5 w-5 flex-none items-center justify-center rounded border transition-colors" style={includeFetLife ? { background: "var(--action-primary)", borderColor: "var(--accent)" } : { borderColor: "var(--border)" }} aria-hidden="true">
                  {includeFetLife && <Check size={11} weight="bold" aria-hidden="true" />}
                </span>
                <input type="checkbox" className="sr-only" checked={includeFetLife} onChange={(event) => setIncludeFetLife(event.target.checked)} />
                <span style={{ color: "var(--text2)" }}>FetLife-link meesturen</span>
              </label>
            )}

            {hasBdsmtest && (
              <label className="focus-within:ring-2 focus-within:ring-[var(--focus)] flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-xl px-2 text-sm">
                <span className="flex h-5 w-5 flex-none items-center justify-center rounded border transition-colors" style={includeBdsmtest ? { background: "var(--action-primary)", borderColor: "var(--accent)" } : { borderColor: "var(--border)" }} aria-hidden="true">
                  {includeBdsmtest && <Check size={11} weight="bold" aria-hidden="true" />}
                </span>
                <input type="checkbox" className="sr-only" checked={includeBdsmtest} onChange={(event) => setIncludeBdsmtest(event.target.checked)} />
                <span style={{ color: "var(--text2)" }}>BDSMTest-resultaten meesturen</span>
              </label>
            )}
          </div>
        )}

        {avatarSkipped && <p className="mt-2 text-sm" style={{ color: "var(--hard-no-text)" }} role="alert">De profielfoto kon niet veilig worden bevestigd en wordt niet meegestuurd.</p>}

        <button onClick={handleCopy} disabled={!url} className="focus-ring mt-2 w-full min-h-11 rounded-xl text-sm font-medium border transition-colors disabled:opacity-40" style={copied ? { borderColor: "var(--yes)", color: "var(--yes)" } : { borderColor: "var(--border)", color: "var(--text)" }}>
          {copied ? <span className="inline-flex items-center justify-center gap-1.5"><Check size={14} weight="bold" aria-hidden="true" />Gekopieerd!</span> : <span className="inline-flex items-center justify-center gap-1.5"><CopySimple size={14} aria-hidden="true" />Kopieer volledige link</span>}
        </button>

        <p className="mt-2 text-center text-sm leading-5" style={{ color: "var(--text2)" }}>
          Verborgen antwoorden en persoonlijke notitie blijven op dit toestel.
          {avatarIncluded ? " De profielfoto wordt meegestuurd." : " De profielfoto blijft op dit toestel."}
          {bdsmtestIncluded ? " BDSMTest wordt alleen voor deze deelactie meegestuurd." : hasBdsmtest ? " BDSMTest blijft op dit toestel." : ""}
        </p>
        <Link
          href="/about#limits-title"
          className="focus-ring mx-auto flex min-h-9 w-fit items-center gap-1 px-2 text-sm font-semibold"
          style={{ color: "var(--accent-text)" }}
        >
          Hoe delen en beveiliging werken
          <ArrowRight size={13} aria-hidden="true" />
        </Link>

        <button onClick={onClose} className="focus-ring mt-1 w-full min-h-11 rounded-xl text-sm font-medium border transition-colors" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>Sluit</button>
      </SheetContent>
    </Sheet>
  );
}
