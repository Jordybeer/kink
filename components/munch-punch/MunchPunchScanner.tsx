"use client";

import { Camera, CheckCircle, ClipboardText, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import Sheet, { SheetContent } from "@/components/Sheet";

export interface MunchPunchScanFeedback {
  status: "accepted" | "replay" | "rejected";
  message: string;
}

interface MunchPunchScannerProps {
  open: boolean;
  onClose: () => void;
  onResult: (raw: string) => Promise<MunchPunchScanFeedback>;
}

export default function MunchPunchScanner({ open, onClose, onResult }: MunchPunchScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const processingRef = useRef(false);
  const blockedValueRef = useRef<string | null>(null);
  const blankFramesRef = useRef(0);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteInput, setPasteInput] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<MunchPunchScanFeedback | null>(null);

  useEffect(() => {
    if (!open || pasteMode) return;
    let cancelled = false;
    setCameraError(null);
    setFeedback(null);
    processingRef.current = false;
    blockedValueRef.current = null;
    blankFramesRef.current = 0;

    function stopCamera() {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    async function handleRaw(raw: string) {
      processingRef.current = true;
      blockedValueRef.current = raw;
      blankFramesRef.current = 0;
      try {
        setFeedback(await onResult(raw));
      } catch {
        setFeedback({ status: "rejected", message: "Deze response kon niet worden verwerkt." });
      } finally {
        processingRef.current = false;
      }
    }

    function scan() {
      if (cancelled) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0 || processingRef.current) {
        rafRef.current = requestAnimationFrame(scan);
        return;
      }
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(video, 0, 0);
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(image.data, image.width, image.height);

      if (!result?.data) {
        blankFramesRef.current += 1;
        if (blankFramesRef.current >= 8) blockedValueRef.current = null;
      } else {
        blankFramesRef.current = 0;
        const raw = result.data.trim();
        if (raw && raw !== blockedValueRef.current) void handleRaw(raw);
      }
      rafRef.current = requestAnimationFrame(scan);
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Deze browser geeft geen cameratoegang. Plak de responsecode hieronder.");
      return;
    }

    void navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        void videoRef.current.play().then(scan).catch(() => {
          setCameraError("De camera kon niet worden gestart. Plak de responsecode hieronder.");
        });
      })
      .catch(() => setCameraError("Cameratoegang is geweigerd of niet beschikbaar."));

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, pasteMode, onResult]);

  useEffect(() => {
    if (open) return;
    setPasteMode(false);
    setPasteInput("");
    setCameraError(null);
    setFeedback(null);
  }, [open]);

  async function submitPaste() {
    const raw = pasteInput.trim();
    if (!raw) return;
    try {
      const result = await onResult(raw);
      setFeedback(result);
      if (result.status !== "rejected") setPasteInput("");
    } catch {
      setFeedback({ status: "rejected", message: "Deze response kon niet worden verwerkt." });
    }
  }

  function handleClose() {
    setPasteMode(false);
    setPasteInput("");
    setFeedback(null);
    onClose();
  }

  const showPaste = pasteMode || !!cameraError;
  const feedbackColor = feedback?.status === "accepted"
    ? "var(--yes)"
    : feedback?.status === "replay"
      ? "var(--accent)"
      : "var(--hard-no)";

  return (
    <Sheet open={open} onClose={handleClose} scrollable aria-label="Munch Punch-responses scannen">
      <SheetContent className="max-h-[88dvh] overflow-y-auto px-6 pb-6 pt-4">
        <h2 className="mb-2 text-lg font-bold text-center">Responses scannen</h2>
        <p className="mb-4 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
          Elke geldige QR wordt lokaal ontsleuteld, meteen opgeteld en daarna als individueel antwoord losgelaten.
        </p>

        {showPaste ? (
          <div>
            {cameraError && (
              <p className="mb-3 text-xs leading-relaxed" style={{ color: "var(--text2)" }}>{cameraError}</p>
            )}
            <label htmlFor="munch-punch-response" className="mb-2 block text-xs font-semibold">
              Versleutelde responsecode
            </label>
            <textarea
              id="munch-punch-response"
              value={pasteInput}
              onChange={(event) => setPasteInput(event.target.value)}
              rows={5}
              placeholder="KSMR1:…"
              className="focus-ring w-full rounded-xl px-3 py-3 text-xs outline-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", resize: "vertical" }}
            />
            <button
              type="button"
              onClick={() => void submitPaste()}
              disabled={!pasteInput.trim()}
              className="focus-ring mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold disabled:opacity-40"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              <ClipboardText size={17} aria-hidden="true" />
              Response verwerken
            </button>
            {!cameraError && (
              <button
                type="button"
                onClick={() => setPasteMode(false)}
                className="focus-ring mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold"
                style={{ border: "1px solid var(--border)", color: "var(--text2)" }}
              >
                <Camera size={17} aria-hidden="true" />
                Terug naar camera
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="relative aspect-square overflow-hidden rounded-2xl" style={{ background: "var(--bg)" }}>
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-5 rounded-2xl" style={{ border: "2px solid var(--accent)" }} />
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <p className="mt-3 text-center text-xs" style={{ color: "var(--text2)" }}>
              Haal de QR na een scan even uit beeld. De scanner blijft klaar voor de volgende persoon.
            </p>
            <button
              type="button"
              onClick={() => setPasteMode(true)}
              className="focus-ring mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold"
              style={{ border: "1px solid var(--border)", color: "var(--text2)" }}
            >
              <ClipboardText size={17} aria-hidden="true" />
              Plak responsecode
            </button>
          </>
        )}

        {feedback && (
          <div
            role="status"
            aria-live="polite"
            className="mt-4 flex items-start gap-2 rounded-xl px-3 py-3 text-sm"
            style={{ border: `1px solid ${feedbackColor}`, background: "var(--surface2)", color: feedbackColor }}
          >
            {feedback.status === "accepted"
              ? <CheckCircle size={18} weight="fill" className="mt-0.5 flex-none" aria-hidden="true" />
              : <WarningCircle size={18} weight="fill" className="mt-0.5 flex-none" aria-hidden="true" />}
            <span>{feedback.message}</span>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
