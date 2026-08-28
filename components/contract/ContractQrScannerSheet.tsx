"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import Sheet, { SheetContent } from "@/components/Sheet";
import {
  addContractQrPart,
  parseContractQrValue,
  type ContractQrAssembly,
} from "@/lib/contractQr";

interface Props {
  open: boolean;
  title?: string;
  onClose: () => void;
  onEncoded: (encoded: string) => void | Promise<void>;
}

export default function ContractQrScannerSheet({
  open,
  title = "Contractcode scannen",
  onClose,
  onEncoded,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const cameraGenerationRef = useRef(0);
  const assemblyRef = useRef<ContractQrAssembly | null>(null);
  const lastValueRef = useRef<{ value: string; at: number } | null>(null);
  const [received, setReceived] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteValue, setPasteValue] = useState("");

  useEffect(() => {
    if (!open) return;
    const cameraGeneration = ++cameraGenerationRef.current;
    setError(null);
    setReceived(0);
    setTotal(0);
    setPasteMode(false);
    setPasteValue("");
    assemblyRef.current = null;
    lastValueRef.current = null;

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cameraGenerationRef.current !== cameraGeneration) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {
            if (cameraGenerationRef.current !== cameraGeneration) return;
            stopCamera();
            setError("Camera kon niet worden gestart. Probeer opnieuw.");
            setPasteMode(true);
          });
        }
        scan(cameraGeneration);
      })
      .catch(() => {
        if (cameraGenerationRef.current !== cameraGeneration) return;
        setError("Camera niet beschikbaar of geweigerd.");
        setPasteMode(true);
      });

    return stopCamera;
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function stopCamera() {
    cameraGenerationRef.current += 1;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function complete(encoded: string) {
    stopCamera();
    void onEncoded(encoded);
  }

  function consume(raw: string, dedupe = true): boolean {
    const now = Date.now();
    if (dedupe && lastValueRef.current?.value === raw && now - lastValueRef.current.at < 800) return false;
    if (dedupe) lastValueRef.current = { value: raw, at: now };
    const parsed = parseContractQrValue(raw);
    if (!parsed) {
      setError("Geen geldige KinkSync-contractcode gevonden.");
      return false;
    }
    if (parsed.kind === "complete") {
      complete(parsed.encoded);
      return true;
    }
    const result = addContractQrPart(assemblyRef.current, parsed);
    if (result.status === "error") {
      setError(result.message);
      return false;
    }
    if (result.status === "complete") {
      complete(result.encoded);
      return true;
    }
    assemblyRef.current = result.assembly;
    setReceived(result.received);
    setTotal(result.total);
    setError(null);
    return false;
  }

  function scan(cameraGeneration: number) {
    if (cameraGenerationRef.current !== cameraGeneration) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0) {
      rafRef.current = requestAnimationFrame(() => scan(cameraGeneration));
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0);
    const frame = context.getImageData(0, 0, canvas.width, canvas.height);
    const found = jsQR(frame.data, frame.width, frame.height);
    if (found?.data && consume(found.data)) return;
    rafRef.current = requestAnimationFrame(() => scan(cameraGeneration));
  }

  function handleClose() {
    stopCamera();
    onClose();
  }

  return (
    <Sheet open={open} onClose={handleClose} scrollable aria-label={title}>
      <SheetContent
        showHandle={false}
        className="max-h-[calc(100dvh-env(safe-area-inset-top))] overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4"
      >
        <h2 className="text-lg font-semibold text-center">{title}</h2>
        {total > 0 && (
          <p className="text-xs text-center mt-2" style={{ color: "var(--accent)" }}>
            QR-delen ontvangen: {received} van {total}
          </p>
        )}

        {pasteMode ? (
          <div className="mt-4">
            <p className="text-sm mb-2 leading-relaxed" style={{ color: "var(--text2)" }}>
              Plak één contractcode of QR-deel. Bij meerdere delen kun je ze na elkaar toevoegen.
            </p>
            <textarea
              value={pasteValue}
              onChange={(event) => setPasteValue(event.target.value)}
              rows={4}
              autoFocus
              className="focus-ring w-full rounded-xl px-3 py-2 text-sm"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            <button
              type="button"
              disabled={!pasteValue.trim()}
              onClick={() => {
                const done = consume(pasteValue, false);
                if (!done) setPasteValue("");
              }}
              className="focus-ring mt-3 min-h-11 w-full rounded-xl text-sm font-semibold disabled:opacity-40"
              style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
            >
              Code verwerken
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <div className="relative aspect-square overflow-hidden rounded-xl" style={{ background: "var(--bg)" }}>
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-5 rounded-xl" style={{ border: "2px solid var(--accent)" }} />
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <button
              type="button"
              onClick={() => { stopCamera(); setPasteMode(true); }}
              className="focus-ring mx-auto mt-3 block min-h-11 px-3 text-sm underline-offset-2 hover:underline"
              style={{ color: "var(--text2)" }}
            >
              Geen camera? Plak de code
            </button>
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm text-center" style={{ color: "var(--hard-no)" }} role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleClose}
          className="focus-ring mt-4 min-h-11 w-full rounded-xl text-sm font-medium"
          style={{ border: "1px solid var(--border)", color: "var(--text2)" }}
        >
          Annuleer
        </button>
      </SheetContent>
    </Sheet>
  );
}
