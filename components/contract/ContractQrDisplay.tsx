"use client";

import { ArrowLeft, ArrowRight, Camera } from "@phosphor-icons/react";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import {
  buildContractQrFrames,
  CONTRACT_QR_AUTO_INTERVAL_MS,
} from "@/lib/contractQr";

interface Props {
  encoded: string;
  title: string;
  instruction: string;
  onScanResponse?: () => void;
  scanLabel?: string;
}

export default function ContractQrDisplay({
  encoded,
  title,
  instruction,
  onScanResponse,
  scanLabel = "Antwoord scannen",
}: Props) {
  const frames = useMemo(() => buildContractQrFrames(encoded), [encoded]);
  const [images, setImages] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(frames.length > 1);

  useEffect(() => {
    let cancelled = false;
    setImages([]);
    setIndex(0);
    const css = getComputedStyle(document.documentElement);
    const dark = css.getPropertyValue("--accent").trim() || "#D946AF";
    const light = css.getPropertyValue("--bg").trim() || "#0a0a0f";
    Promise.all(frames.map((frame) => QRCode.toDataURL(frame.value, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: "L",
      color: { dark, light },
    }))).then((next) => {
      if (!cancelled) setImages(next);
    });
    return () => { cancelled = true; };
  }, [frames]);

  useEffect(() => {
    if (!autoAdvance || frames.length < 2 || images.length !== frames.length) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % frames.length);
    }, CONTRACT_QR_AUTO_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [autoAdvance, frames.length, images.length]);

  const image = images[index];
  const frame = frames[index];

  return (
    <div>
      <h2 className="text-lg font-semibold text-center">{title}</h2>
      <p className="text-sm text-center mt-2 leading-relaxed" style={{ color: "var(--text2)" }}>
        {instruction}
      </p>

      {frames.length > 1 && (
        <p className="text-xs text-center mt-4" style={{ color: "var(--text2)" }}>
          {autoAdvance ? "Automatisch" : "Handmatig"} · QR {frame?.index ?? 1} van {frame?.total ?? frames.length}
        </p>
      )}

      <div
        className="mx-auto my-4 flex h-[280px] w-[280px] items-center justify-center overflow-hidden rounded-xl"
        style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
      >
        {image ? (
          <img src={image} width={280} height={280} alt={`Contract QR ${index + 1} van ${frames.length}`} />
        ) : (
          <span className="text-sm" style={{ color: "var(--text2)" }}>QR wordt opgebouwd…</span>
        )}
      </div>

      {frames.length > 1 && (
        <div className="flex items-center justify-center gap-3 mb-4">
          <button
            type="button"
            aria-label="Vorige QR"
            onClick={() => { setAutoAdvance(false); setIndex((current) => (current - 1 + frames.length) % frames.length); }}
            className="focus-ring flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: "var(--surface2)", color: "var(--text2)" }}
          >
            <ArrowLeft size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setAutoAdvance((current) => !current)}
            className="focus-ring min-h-10 rounded-lg px-3 text-xs font-semibold"
            style={{ background: "var(--surface2)", color: "var(--text2)" }}
          >
            {autoAdvance ? "Pauzeer wisselen" : "Automatisch wisselen"}
          </button>
          <button
            type="button"
            aria-label="Volgende QR"
            onClick={() => { setAutoAdvance(false); setIndex((current) => (current + 1) % frames.length); }}
            className="focus-ring flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: "var(--surface2)", color: "var(--text2)" }}
          >
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {onScanResponse && (
        <button
          type="button"
          onClick={onScanResponse}
          className="focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}
        >
          <Camera size={17} aria-hidden="true" />
          {scanLabel}
        </button>
      )}
    </div>
  );
}
