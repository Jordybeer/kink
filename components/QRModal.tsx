"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { Profile } from "@/types";
import { encodeProfile } from "@/lib/shareProfile";

interface Props {
  profile: Profile | null;
  onClose: () => void;
}

export default function QRModal({ profile, onClose }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");
  const [includeFetLife, setIncludeFetLife] = useState(false);

  useEffect(() => {
    setIncludeFetLife(false);
  }, [profile?.id]);

  useEffect(() => {
    if (!profile) {
      setQrDataUrl(null);
      setCopied(false);
      return;
    }
    const shareUrl =
      window.location.origin + "/import?p=" + encodeProfile(profile, { includeFetLife });
    setUrl(shareUrl);
    QRCode.toDataURL(shareUrl, {
      width: 240,
      margin: 2,
      color: { dark: "#c084fc", light: "#0a0a0f" },
    }).then(setQrDataUrl);
  }, [profile, includeFetLife]);

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const open = profile !== null;

  return (
    <>
      <div
        className={`sheet-overlay ${open ? "open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`sheet-panel ${open ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Profiel delen"
      >
        <div
          className="rounded-t-2xl p-6"
          style={{
            background: "var(--surface)",
            borderTop: "1px solid var(--border)",
            borderLeft: "1px solid var(--border)",
            borderRight: "1px solid var(--border)",
          }}
        >
          <div
            className="w-10 h-1 rounded-full mx-auto mb-5"
            style={{ background: "var(--border)" }}
          />

          <h2 className="text-lg font-bold text-center mb-1">Deel profiel</h2>
          {profile && (
            <p className="text-sm text-center mb-4" style={{ color: "var(--accent)" }}>
              {profile.name}
            </p>
          )}

          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              width={240}
              height={240}
              alt="QR-code voor profielimport"
              className="mx-auto rounded-xl my-4"
            />
          ) : (
            <div
              className="mx-auto my-4 rounded-xl animate-pulse"
              style={{ width: 240, height: 240, background: "var(--surface2)" }}
              aria-label="QR-code laden…"
            />
          )}

          {/* FetLife toggle — only shown if username is set */}
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
                <span className="text-[11px] opacity-60">({profile.fetLifeUsername})</span>
              </span>
            </label>
          )}

          <button
            onClick={handleCopy}
            className="focus-ring w-full py-2.5 rounded-xl text-sm font-medium border transition-colors mb-3"
            style={
              copied
                ? { borderColor: "var(--yes)", color: "var(--yes)" }
                : { borderColor: "var(--border)", color: "var(--text)" }
            }
          >
            {copied ? "✓ Gekopieerd!" : "⎘ Kopieer link"}
          </button>

          <p
            className="text-xs text-center mt-1 mb-4"
            style={{ color: "var(--text2)" }}
          >
            Laat je partner deze QR-code scannen of stuur de link. Zij
            importeren jouw profiel in hun app.
          </p>

          <button
            onClick={onClose}
            className="focus-ring w-full py-2.5 rounded-xl text-sm font-medium border transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--text2)" }}
          >
            Sluit
          </button>
        </div>
      </div>
    </>
  );
}
