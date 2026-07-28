"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { Profile } from "@/types";
import { encodeProfileV3 } from "@/lib/profileShareV3";
import { buildProfileQrSet } from "@/lib/profileQr";
import Sheet, { SheetContent } from "./Sheet";

interface Props {
  profile: Profile | null;
  onClose: () => void;
}

export default function QRModal({ profile, onClose }: Props) {
  const [qrDataUrls, setQrDataUrls] = useState<string[]>([]);
  const [qrIndex, setQrIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");
  const [includeFetLife, setIncludeFetLife] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  useEffect(() => {
    setIncludeFetLife(false);
  }, [profile?.id]);

  useEffect(() => {
    let cancelled = false;
    setQrDataUrls([]);
    setQrIndex(0);
    setCopied(false);
    setGenerationError(null);
    if (!profile) {
      setUrl("");
      return;
    }

    void (async () => {
      try {
        const payload = await encodeProfileV3(profile, { includeFetLife });
        const share = buildProfileQrSet(window.location.origin, payload);
        const css = getComputedStyle(document.documentElement);
        const dark = css.getPropertyValue("--accent").trim() || "#D946AF";
        const light = css.getPropertyValue("--bg").trim() || "#0a0a0f";
        const images = await Promise.all(share.qrValues.map((value) =>
          QRCode.toDataURL(value, {
            width: 280,
            margin: 2,
            errorCorrectionLevel: "L",
            color: { dark, light },
          })
        ));
        if (cancelled) return;
        setUrl(share.shareUrl);
        setQrDataUrls(images);
      } catch {
        if (!cancelled) setGenerationError("Deelcode kon niet worden opgebouwd.");
      }
    })();

    return () => { cancelled = true; };
  }, [profile, includeFetLife]);

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const multi = qrDataUrls.length > 1;

  return (
    <Sheet open={profile !== null} onClose={onClose} aria-label="Profiel delen">
      <SheetContent>
        <h2 className="text-lg font-bold text-center mb-1">Deel profiel</h2>
        {profile && (
          <p className="text-sm text-center mb-3" style={{ color: "var(--accent)" }}>
            {profile.name}
          </p>
        )}

        {multi && (
          <p className="text-xs text-center font-semibold mb-1" style={{ color: "var(--text)" }}>
            QR {qrIndex + 1} van {qrDataUrls.length}
          </p>
        )}

        {qrDataUrls[qrIndex] ? (
          <img
            src={qrDataUrls[qrIndex]}
            width={280}
            height={280}
            alt={multi ? `Profiel QR-code ${qrIndex + 1} van ${qrDataUrls.length}` : "QR-code voor profielimport"}
            className="mx-auto rounded-xl my-3"
          />
        ) : (
          <div
            className="mx-auto my-3 rounded-xl animate-pulse flex items-center justify-center text-xs text-center px-6"
            style={{ width: 280, height: 280, background: "var(--surface2)", color: "var(--text2)" }}
            aria-label="QR-code laden…"
          >
            {generationError ?? "Volledig profiel inpakken…"}
          </div>
        )}

        {multi && (
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setQrIndex((index) => Math.max(0, index - 1))}
              disabled={qrIndex === 0}
              className="focus-ring flex-1 py-2 rounded-lg border text-xs disabled:opacity-35"
              style={{ borderColor: "var(--border)", color: "var(--text2)" }}
            >
              ← Vorige
            </button>
            <button
              type="button"
              onClick={() => setQrIndex((index) => Math.min(qrDataUrls.length - 1, index + 1))}
              disabled={qrIndex === qrDataUrls.length - 1}
              className="focus-ring flex-1 py-2 rounded-lg border text-xs disabled:opacity-35"
              style={{ borderColor: "var(--border)", color: "var(--text2)" }}
            >
              Volgende →
            </button>
          </div>
        )}

        <p className="text-xs text-center mb-1" style={{ color: "var(--text2)" }}>
          Deelt alle niet-verborgen profielgegevens zonder dataverlies.
        </p>
        {multi && (
          <p className="text-xs text-center mb-3" style={{ color: "var(--accent)" }}>
            Scan alle {qrDataUrls.length} codes in KinkSync. Dubbele scans zijn geen probleem.
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
          Verborgen antwoorden, avatar en persoonlijke notitie blijven uitsluitend op dit toestel.
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
