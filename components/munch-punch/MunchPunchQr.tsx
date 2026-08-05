"use client";

import { Check, CopySimple, QrCode } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface MunchPunchQrProps {
  value: string;
  title: string;
  caption: string;
  copyLabel?: string;
}

export default function MunchPunchQr({
  value,
  title,
  caption,
  copyLabel = "Kopieer code",
}: MunchPunchQrProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDataUrl(null);
    setError(null);
    if (!value) return;

    const css = getComputedStyle(document.documentElement);
    const dark = css.getPropertyValue("--text").trim() || "#f7f2f5";
    const light = css.getPropertyValue("--bg").trim() || "#0a0a0f";

    void QRCode.toDataURL(value, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark, light },
    }).then((nextDataUrl) => {
      if (!cancelled) setDataUrl(nextDataUrl);
    }).catch(() => {
      if (!cancelled) setError("QR-code kon niet worden opgebouwd.");
    });

    return () => { cancelled = true; };
  }, [value]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Kopiëren lukte niet. Houd de QR zichtbaar om te scannen.");
    }
  }

  return (
    <section
      className="rounded-2xl p-4"
      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
      aria-label={title}
    >
      <div className="flex items-center gap-2 mb-3">
        <QrCode size={18} weight="duotone" style={{ color: "var(--accent)" }} aria-hidden="true" />
        <h2 className="text-base font-semibold">{title}</h2>
      </div>

      <div
        className="mx-auto flex aspect-square w-full max-w-[320px] items-center justify-center overflow-hidden rounded-2xl"
        style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
      >
        {dataUrl ? (
          // QR pixels must remain unoptimised and exact.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt={title} className="h-full w-full" />
        ) : error ? (
          <p className="px-5 text-center text-sm" style={{ color: "var(--hard-no)" }}>{error}</p>
        ) : (
          <span className="ks-spinner" role="status" aria-label="QR-code maken" />
        )}
      </div>

      <p className="mt-3 text-center text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
        {caption}
      </p>

      <button
        type="button"
        onClick={handleCopy}
        className="focus-ring mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold"
        style={{ color: "var(--text2)", border: "1px solid var(--border)", background: "var(--surface)" }}
      >
        {copied ? <Check size={16} weight="bold" aria-hidden="true" /> : <CopySimple size={16} aria-hidden="true" />}
        {copied ? "Gekopieerd" : copyLabel}
      </button>

      <output className="sr-only" data-qr-value={value} aria-label={`${title} gegevens`}>
        Versleutelde QR-gegevens beschikbaar
      </output>
    </section>
  );
}
