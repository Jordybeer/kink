"use client";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import Sheet from "./Sheet";
import { useRouter } from "next/navigation";
import { parseSharePaste } from "@/lib/parseSharePaste";

interface Props {
  open: boolean;
  onResult: (encoded: string) => void;
  onClose: () => void;
}

export default function QRScanner({ open, onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteInput, setPasteInput] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setPasteMode(false);
    setPasteInput("");
    setPasteError(null);

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => setError("Camera kon niet worden gestart. Probeer opnieuw."));
        }
        scan();
      })
      .catch(() => setError("Camera niet beschikbaar of geweigerd."));

    return () => stopCamera();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function dispatchPayload(raw: string): boolean {
    const parsed = parseSharePaste(raw);
    if (parsed.kind === "session") {
      stopCamera();
      onClose();
      router.push(`/session?join=${parsed.code}`);
      return true;
    }
    if (parsed.kind === "profile") {
      stopCamera();
      onResult(parsed.encoded);
      return true;
    }
    return false;
  }

  function scan() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0) {
      rafRef.current = requestAnimationFrame(scan);
      return;
    }
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(imageData.data, imageData.width, imageData.height);
    if (result?.data && dispatchPayload(result.data)) return;
    rafRef.current = requestAnimationFrame(scan);
  }

  function handlePasteSubmit() {
    setPasteError(null);
    if (!dispatchPayload(pasteInput)) {
      setPasteError("Geen geldige link of code gevonden. Plak de volledige link of de 6-letterige code.");
    }
  }

  function handleClose() {
    stopCamera();
    setPasteInput("");
    setPasteError(null);
    onClose();
  }

  const showPaste = pasteMode || !!error;

  return (
    <Sheet open={open} onClose={handleClose} aria-label="QR-code scannen">
      <div
        className="rounded-t-2xl p-6"
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          borderLeft: "1px solid var(--border)",
          borderRight: "1px solid var(--border)",
        }}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "var(--border)" }} />
        <h2 className="text-lg font-bold text-center mb-4">
          {showPaste ? "Plak link of code" : "Scan QR-code"}
        </h2>

        {showPaste ? (
          <div>
            {error && (
              <p className="text-sm mb-3 text-center" style={{ color: "var(--text2)" }}>{error}</p>
            )}
            <p className="text-xs mb-2" style={{ color: "var(--text2)" }}>
              Plak hier de link of code van je partner.
            </p>
            <textarea
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              rows={3}
              placeholder="https://… of KINKSYNC:ABC234"
              className="focus-ring w-full text-sm rounded-lg border px-3 py-2 mb-2 placeholder-[color:var(--text2)] focus:outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", resize: "none" }}
              autoFocus
            />
            {pasteError && (
              <p className="text-xs mb-3" style={{ color: "var(--hard-no)" }}>{pasteError}</p>
            )}
            <button
              onClick={handlePasteSubmit}
              disabled={!pasteInput.trim()}
              className="focus-ring w-full py-2.5 rounded-xl text-sm font-bold mb-2 disabled:opacity-40 transition-opacity"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              Importeer
            </button>
            <button
              onClick={handleClose}
              className="focus-ring w-full py-2.5 rounded-xl text-sm font-medium border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text2)" }}
            >
              Annuleer
            </button>
          </div>
        ) : (
          <>
            <div className="relative rounded-xl overflow-hidden mb-4" style={{ aspectRatio: "1", background: "var(--bg)" }}>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              {/* Corner brackets overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {([["top-4 left-4", "border-t-2 border-l-2"], ["top-4 right-4", "border-t-2 border-r-2"], ["bottom-4 left-4", "border-b-2 border-l-2"], ["bottom-4 right-4", "border-b-2 border-r-2"]] as [string, string][]).map(([pos, border]) => (
                  <div key={pos} className={`absolute ${pos} w-7 h-7 ${border} rounded-sm`} style={{ borderColor: "var(--accent)" }} />
                ))}
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <p className="text-xs text-center mb-2" style={{ color: "var(--text2)" }}>
              Richt de camera op de QR-code van je partner.
            </p>
            <button
              onClick={() => { stopCamera(); setPasteMode(true); }}
              className="focus-ring block mx-auto mb-3 text-xs underline-offset-2 hover:underline"
              style={{ color: "var(--text2)" }}
            >
              Geen camera? Plak een link
            </button>
            <button
              onClick={handleClose}
              className="focus-ring w-full py-2.5 rounded-xl text-sm font-medium border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text2)" }}
            >
              Annuleer
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
}
