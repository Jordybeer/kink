"use client";
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
  const [avatarSkipped, setAvatarSkipped] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  useEffect(() => {
    setIncludeFetLife(false);
    setIncludeAvatar(!!profile?.avatarDataUrl);
  }, [profile?.id, profile?.avatarDataUrl]);

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
    setGenerationError(null);
    if (!profile) {
      setUrl("");
      return;
    }

    void (async () => {
      try {
        const ready = profile.origin === "shared" || profile.isImported
          ? profile
          : await sealProfileConsent(profile.id);
        if (!ready) throw new Error("Profiel kon niet worden bevestigd");
        const transport = await encodeProfileShareTransport(ready, {
          includeFetLife,
          includeAvatar,
        });
        const share = buildProfileQrBundleSet(
          window.location.origin,
          transport.profilePayload,
          transport.encoded,
          transport.avatarPayload,
        );
        if (cancelled) return;
        setPreparedProfile(ready);
        setAvatarSkipped(includeAvatar && !!ready.avatarDataUrl && !transport.avatarPayload);
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
    // updatedAt changes for shareable profile edits. A proof-only store update
    // deliberately does not restart generation after sealing this same version.
  }, [
    profile?.id,
    profile?.updatedAt,
    profile?.origin,
    profile?.isImported,
    profile?.avatarDataUrl,
    includeFetLife,
    includeAvatar,
    sealProfileConsent,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    setQrDataUrls([]);
    setQrIndex(0);
    setAutoAdvance(false);
    if (!qrValues.length) return;

    const css = getComputedStyle(document.documentElement);
    const dark = css.getPropertyValue("--accent").trim() || "#D946AF";
    const light = css.getPropertyValue("--bg").trim() || "#0a0a0f";

    Promise.all(qrValues.map((value) => QRCode.toDataURL(value, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: "L",
      color: { dark, light },
    }))).then((images) => {
      if (cancelled) return;
      setQrDataUrls(images);
      if (images.length > 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setAutoAdvance(true);
      }
    }).catch(() => {
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
  const readableAlias = preparedProfile?.consentProof
    ? profileConsentAlias(preparedProfile)
    : null;
  const sharingAvatar = !!preparedProfile?.avatarDataUrl && includeAvatar && !avatarSkipped;

  return (
    <Sheet open={profile !== null} onClose={onClose} scrollable aria-label="Profiel delen">
      <SheetContent
        showHandle={false}
        className="max-h-[calc(100dvh-env(safe-area-inset-top))] overflow-y-auto overscroll-contain px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4"
      >
        <h2 className="text-lg font-bold text-center mb-1">Deel profiel</h2>
        {profile && (
          <div className="text-center mb-3">
            <p className="text-sm" style={{ color: "var(--accent)" }}>{profile.name}</p>
            {readableAlias && (
              <p className="text-xs mt-1" style={{ color: "var(--yes)" }}>
                Bron bevestigd · {readableAlias}
              </p>
            )}
          </div>
        )}

        {multi && currentFrame && (
          <p className="text-xs text-center font-semibold mb-1" style={{ color: "var(--text)" }}>
            {autoAdvance ? "Automatisch" : "Gepauzeerd"} · {currentFrame.phase === "avatar" ? "Foto" : "Profiel"} QR {currentFrame.index} van {currentFrame.total}
          </p>
        )}

        {qrTooLarge ? (
          <div
            className="mx-auto my-3 rounded-xl flex items-center justify-center text-sm text-center px-6"
            style={{ width: 280, height: 180, background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}
            role="status"
          >
            Dit profiel bevat te veel gegevens voor een betrouwbare QR-set. De volledige link hieronder deelt wel alles zonder dataverlies.
          </div>
        ) : qrDataUrl ? (
          <img
            src={qrDataUrl}
            width={280}
            height={280}
            alt={currentFrame
              ? `${currentFrame.phase === "avatar" ? "Profielfoto" : "Profiel"} QR-code ${currentFrame.index} van ${currentFrame.total}`
              : "QR-code voor profielimport"}
            className="mx-auto rounded-xl my-3"
          />
        ) : (
          <div
            className="mx-auto my-3 rounded-xl animate-pulse flex items-center justify-center text-xs text-center px-6"
            style={{ width: 280, height: 280, background: "var(--surface2)", color: "var(--text2)" }}
            aria-label="QR-code laden…"
          >
            {generationError ?? (multi ? "QR-reeks voorbereiden…" : "Volledig profiel inpakken…")}
          </div>
        )}

        {multi && (
          <>
            <button
              type="button"
              onClick={() => setAutoAdvance((active) => !active)}
              disabled={qrDataUrls.length !== qrValues.length}
              className="focus-ring w-full py-2.5 rounded-xl border text-sm font-semibold disabled:opacity-35"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              {autoAdvance ? "Pauzeer" : "Hervat"}
            </button>

            <button
              type="button"
              onClick={() => setSlowMode((slow) => !slow)}
              className="focus-ring block mx-auto px-3 py-2 text-xs underline-offset-2 hover:underline"
              style={{ color: "var(--text2)" }}
            >
              Snelheid: {slowMode ? "rustig" : "normaal"}
            </button>

            {!autoAdvance && (
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={showPrevious}
                  className="focus-ring flex-1 py-2 rounded-lg border text-xs"
                  style={{ borderColor: "var(--border)", color: "var(--text2)" }}
                >
                  ← Vorige
                </button>
                <button
                  type="button"
                  onClick={showNext}
                  className="focus-ring flex-1 py-2 rounded-lg border text-xs"
                  style={{ borderColor: "var(--border)", color: "var(--text2)" }}
                >
                  Volgende →
                </button>
              </div>
            )}

            {reducedMotion && !autoAdvance && (
              <p className="text-xs text-center mb-3" style={{ color: "var(--text2)" }}>
                Automatisch wisselen staat standaard uit volgens de bewegingsinstelling van dit toestel.
              </p>
            )}
          </>
        )}

        <p className="text-xs text-center mb-1" style={{ color: "var(--text2)" }}>
          Deelt alle niet-verborgen profielgegevens zonder dataverlies. Deze profielversie wordt door jouw eigendomssleutel bevestigd.
        </p>
        {sharingAvatar && (
          <p className="text-xs text-center mb-1" style={{ color: "var(--yes)" }}>
            De profielfoto volgt na het profiel als aparte gecontroleerde QR-fase.
          </p>
        )}
        {multi && (
          <p className="text-xs text-center mb-3" style={{ color: "var(--accent)" }}>
            {autoAdvance
              ? "Houd beide toestellen stil. De codes wisselen automatisch; dubbele scans zijn geen probleem."
              : `Hervat automatisch wisselen of toon de ${qrValues.length} delen handmatig. Volgorde maakt niet uit.`}
          </p>
        )}

        {profile?.avatarDataUrl && (
          <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer select-none">
            <span
              className="w-4 h-4 rounded border flex items-center justify-center transition-colors flex-none"
              style={includeAvatar
                ? { background: "var(--accent)", borderColor: "var(--accent)" }
                : { borderColor: "var(--border)" }}
              aria-hidden="true"
            >
              {includeAvatar && <span className="text-[8px] font-bold text-black">✓</span>}
            </span>
            <input
              type="checkbox"
              className="sr-only"
              checked={includeAvatar}
              onChange={(e) => setIncludeAvatar(e.target.checked)}
            />
            <span style={{ color: "var(--text2)" }}>
              Profielfoto meesturen <span className="text-xs opacity-60">(standaard aan)</span>
            </span>
          </label>
        )}

        {avatarSkipped && (
          <p className="text-xs mb-3" style={{ color: "var(--hard-no)" }} role="alert">
            De huidige profielfoto is te groot of heeft een ongeldig formaat en wordt daarom niet meegestuurd.
          </p>
        )}

        {profile?.fetLifeUsername && (
          <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer select-none">
            <span
              className="w-4 h-4 rounded border flex items-center justify-center transition-colors flex-none"
              style={includeFetLife
                ? { background: "var(--accent)", borderColor: "var(--accent)" }
                : { borderColor: "var(--border)" }}
              aria-hidden="true"
            >
              {includeFetLife && <span className="text-[8px] font-bold text-black">✓</span>}
            </span>
            <input
              type="checkbox"
              className="sr-only"
              checked={includeFetLife}
              onChange={(e) => setIncludeFetLife(e.target.checked)}
            />
            <span style={{ color: "var(--text2)" }}>
              FetLife-link meesturen{" "}
              <span className="text-xs opacity-60">({profile.fetLifeUsername})</span>
            </span>
          </label>
        )}

        <button
          onClick={handleCopy}
          disabled={!url}
          className="focus-ring w-full py-2.5 rounded-xl text-sm font-medium border transition-colors mb-3 disabled:opacity-40"
          style={
            copied
              ? { borderColor: "var(--yes)", color: "var(--yes)" }
              : { borderColor: "var(--border)", color: "var(--text)" }
          }
        >
          {copied ? "✓ Gekopieerd!" : "⎘ Kopieer volledige link"}
        </button>

        <p className="text-xs text-center mt-1 mb-4" style={{ color: "var(--text2)" }}>
          {sharingAvatar
            ? "Verborgen antwoorden en persoonlijke notitie blijven uitsluitend op dit toestel. De profielfoto wordt meegestuurd."
            : "Verborgen antwoorden, profielfoto en persoonlijke notitie blijven uitsluitend op dit toestel."}
        </p>

        <button
          onClick={onClose}
          className="focus-ring w-full py-2.5 rounded-xl text-sm font-medium border transition-colors"
          style={{ borderColor: "var(--border)", color: "var(--text2)" }}
        >
          Sluit
        </button>
      </SheetContent>
    </Sheet>
  );
}
