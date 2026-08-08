"use client";
import { ArrowLeft, ArrowRight, Check, CopySimple } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { Profile } from "@/types";
import { encodeProfileShareTransport } from "@/lib/profileShareV3";
import {
  buildProfileQrBundleSet,
  nextProfileQrIndex,
  PROFILE_QR_AUTO_INTERVAL_MS,
  PROFILE_QR_SLOW_INTERVAL_MS,
  type ProfileQrFrame,
} from "@/lib/profileQr";
import { profileConsentAlias } from "@/lib/consentProof";
import { useStore } from "@/lib/store";
import { qrRenderOptions } from "@/lib/qrAppearance";
import Sheet, { SheetContent } from "./Sheet";

interface Props {
  profile: Profile | null;
  onClose: () => void;
}

export default function QRModal({ profile, onClose }: Props) {
  const sealProfileConsent = useStore((state) => state.sealProfileConsent);
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
  const [settledPreferenceKey, setSettledPreferenceKey] = useState<string | null>(null);
  const [avatarSkipped, setAvatarSkipped] = useState(false);
  const [avatarLinkOnly, setAvatarLinkOnly] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const ownsProfile = !!profile && profile.origin !== "shared" && profile.isImported !== true;
  const canShareAvatar = ownsProfile && !!profile?.avatarDataUrl;
  const preferenceKey = profile
    ? `${profile.id}:${profile.avatarDataUrl ? "avatar" : "none"}:${ownsProfile ? "own" : "shared"}`
    : null;

  useEffect(() => {
    setIncludeFetLife(false);
    setIncludeAvatar(canShareAvatar);
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
        const ready = profile.origin === "shared" || profile.isImported
          ? profile
          : await sealProfileConsent(profile.id);
        if (!ready) throw new Error("Profiel kon niet worden bevestigd");

        const avatarOwnerKey = includeAvatar
          ? useStore.getState().profileOwnerKeys.find((key) => key.profileId === ready.id)
          : undefined;
        const transport = await encodeProfileShareTransport(ready, { includeFetLife, includeAvatar, avatarOwnerKey });
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
        setAvatarSkipped(includeAvatar && !!ready.avatarDataUrl && !transport.avatarPayload);
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
    // Sealing consent replaces the profile object without changing shareable
    // profile content. The identity/content fields below are the intended key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    profile?.id,
    profile?.updatedAt,
    profile?.origin,
    profile?.isImported,
    profile?.avatarDataUrl,
    includeFetLife,
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
  const readableAlias = preparedProfile?.consentProof ? profileConsentAlias(preparedProfile) : null;
  const avatarIncluded = !!preparedProfile?.avatarDataUrl && includeAvatar && !avatarSkipped;
  const avatarInQrSequence = avatarIncluded && !avatarLinkOnly;

  return (
    <Sheet open={profile !== null} onClose={onClose} scrollable aria-label="Profiel delen">
      <SheetContent
        showHandle={false}
        className="max-h-[calc(100dvh-env(safe-area-inset-top))] overflow-y-auto overscroll-contain px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4"
      >
        <h2 className="text-lg font-bold text-center mb-1">Deel profiel</h2>
        {profile && (
          <div className="text-center mb-3">
            <p className="text-sm" style={{ color: "var(--accent-text)" }}>{profile.name}</p>
            {readableAlias && <p className="text-xs mt-1" style={{ color: "var(--yes)" }}>Bron bevestigd · {readableAlias}</p>}
          </div>
        )}

        {multi && currentFrame && (
          <p className="text-xs text-center font-semibold mb-1" style={{ color: "var(--text)" }}>
            {autoAdvance ? "Automatisch" : "Gepauzeerd"} · {currentFrame.phase === "avatar" ? "Foto" : "Profiel"} QR {currentFrame.index} van {currentFrame.total}
          </p>
        )}

        {qrTooLarge ? (
          <div className="mx-auto my-3 rounded-xl flex items-center justify-center text-sm text-center px-6" style={{ width: 280, height: 180, background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }} role="status">
            Dit profiel bevat te veel gegevens voor een betrouwbare QR-set. De volledige link hieronder deelt wel alles zonder dataverlies.
          </div>
        ) : qrDataUrl ? (
          <div className="mx-auto my-3 flex h-[282px] w-[282px] items-center justify-center overflow-hidden rounded-xl" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
            <img
              src={qrDataUrl}
              width={280}
              height={280}
              alt={currentFrame
                ? `${currentFrame.phase === "avatar" ? "Profielfoto" : "Profiel"} QR-code ${currentFrame.index} van ${currentFrame.total}`
                : "QR-code voor profielimport"}
              className="h-[280px] w-[280px] shrink-0"
            />
          </div>
        ) : (
          <div className="mx-auto my-3 rounded-xl animate-pulse flex items-center justify-center text-xs text-center px-6" style={{ width: 280, height: 280, background: "#FFFFFF", color: "#4b5563", border: "1px solid var(--border)" }} aria-label="QR-code laden…">
            {generationError ?? (multi ? "QR-reeks voorbereiden…" : "Volledig profiel inpakken…")}
          </div>
        )}

        {multi && (
          <>
            <button type="button" onClick={() => setAutoAdvance((active) => !active)} disabled={qrDataUrls.length !== qrValues.length} aria-pressed={autoAdvance} className="focus-ring w-full min-h-11 rounded-xl border text-sm font-semibold disabled:opacity-35" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
              {autoAdvance ? "Pauzeer" : "Hervat"}
            </button>
            <button type="button" onClick={() => setSlowMode((slow) => !slow)} aria-pressed={slowMode} className="focus-ring min-h-11 block mx-auto px-3 text-xs underline-offset-2 hover:underline" style={{ color: "var(--text2)" }}>
              Snelheid: {slowMode ? "rustig" : "normaal"}
            </button>
            {!autoAdvance && (
              <div className="flex gap-2 mb-3">
                <button type="button" onClick={showPrevious} className="focus-ring min-h-11 flex-1 rounded-lg border text-xs" style={{ borderColor: "var(--border)", color: "var(--text2)" }}><ArrowLeft size={13} aria-hidden="true" /> Vorige</button>
                <button type="button" onClick={showNext} className="focus-ring min-h-11 flex-1 rounded-lg border text-xs" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>Volgende <ArrowRight size={13} aria-hidden="true" /></button>
              </div>
            )}
            {reducedMotion && !autoAdvance && <p className="text-xs text-center mb-3" style={{ color: "var(--text2)" }}>Automatisch wisselen staat standaard uit volgens de bewegingsinstelling van dit toestel.</p>}
          </>
        )}

        <p className="text-xs text-center mb-1" style={{ color: "var(--text2)" }}>
          Deelt alle niet-verborgen profielgegevens zonder dataverlies. Deze profielversie wordt door jouw eigendomssleutel bevestigd.
        </p>
        {avatarInQrSequence && <p className="text-xs text-center mb-1" style={{ color: "var(--yes)" }}>De profielfoto volgt na het profiel en is met dezelfde eigendomssleutel bevestigd.</p>}
        {avatarLinkOnly && <p className="text-xs text-center mb-2" style={{ color: "var(--maybe)" }} role="status">De foto past niet betrouwbaar in de QR-reeks. De volledige link bevat ze wel.</p>}
        {multi && (
          <p className="text-xs text-center mb-3" style={{ color: "var(--accent-text)" }}>
            {autoAdvance ? "Houd beide toestellen stil. De codes wisselen automatisch; dubbele scans zijn geen probleem." : `Hervat automatisch wisselen of toon de ${qrValues.length} delen handmatig. Volgorde maakt niet uit.`}
          </p>
        )}

        {canShareAvatar && (
          <label className="focus-within:ring-2 focus-within:ring-[var(--focus)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--bg)] -mx-2 flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-xl px-2 text-sm mb-2">
            <span className="w-5 h-5 rounded border flex items-center justify-center transition-colors flex-none" style={includeAvatar ? { background: "var(--action-primary)", borderColor: "var(--accent)" } : { borderColor: "var(--border)" }} aria-hidden="true">
              {includeAvatar && <Check size={11} weight="bold" aria-hidden="true" />}
            </span>
            <input type="checkbox" className="sr-only" checked={includeAvatar} onChange={(event) => setIncludeAvatar(event.target.checked)} />
            <span style={{ color: "var(--text2)" }}>Profielfoto meesturen <span className="text-xs opacity-60">(standaard aan)</span></span>
          </label>
        )}

        {avatarSkipped && <p className="text-xs mb-3" style={{ color: "var(--hard-no-text)" }} role="alert">De profielfoto kon niet veilig worden voorbereid of met de eigendomssleutel worden bevestigd en wordt daarom niet meegestuurd.</p>}

        {profile?.fetLifeUsername && (
          <label className="focus-within:ring-2 focus-within:ring-[var(--focus)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--bg)] -mx-2 flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-xl px-2 text-sm mb-2">
            <span className="w-5 h-5 rounded border flex items-center justify-center transition-colors flex-none" style={includeFetLife ? { background: "var(--action-primary)", borderColor: "var(--accent)" } : { borderColor: "var(--border)" }} aria-hidden="true">
              {includeFetLife && <Check size={11} weight="bold" aria-hidden="true" />}
            </span>
            <input type="checkbox" className="sr-only" checked={includeFetLife} onChange={(event) => setIncludeFetLife(event.target.checked)} />
            <span style={{ color: "var(--text2)" }}>FetLife-link meesturen <span className="text-xs opacity-60">({profile.fetLifeUsername})</span></span>
          </label>
        )}

        <button onClick={handleCopy} disabled={!url} className="focus-ring w-full min-h-11 rounded-xl text-sm font-medium border transition-colors mb-3 disabled:opacity-40" style={copied ? { borderColor: "var(--yes)", color: "var(--yes)" } : { borderColor: "var(--border)", color: "var(--text)" }}>
          {copied ? <span className="inline-flex items-center justify-center gap-1.5"><Check size={14} weight="bold" aria-hidden="true" />Gekopieerd!</span> : <span className="inline-flex items-center justify-center gap-1.5"><CopySimple size={14} aria-hidden="true" />Kopieer volledige link</span>}
        </button>

        <p className="text-xs text-center mt-1 mb-4" style={{ color: "var(--text2)" }}>
          {avatarIncluded ? "Verborgen antwoorden en persoonlijke notitie blijven uitsluitend op dit toestel. De profielfoto wordt meegestuurd." : "Verborgen antwoorden, profielfoto en persoonlijke notitie blijven uitsluitend op dit toestel."}
        </p>

        <button onClick={onClose} className="focus-ring w-full min-h-11 rounded-xl text-sm font-medium border transition-colors" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>Sluit</button>
      </SheetContent>
    </Sheet>
  );
}
