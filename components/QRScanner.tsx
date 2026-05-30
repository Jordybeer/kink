"use client";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import Sheet from "./Sheet";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    setError(null);

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

  function scan() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0) {
      rafRef.current = requestAnimationFrame(scan);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(imageData.data, imageData.width, imageData.height);
    if (result?.data) {
      // Handle KINKSYNC session QR — navigate to session page with code, no URL exposure
      const sessionMatch = result.data.match(/^KINKSYNC:([A-Z2-9]{6})$/);
      if (sessionMatch) {
        stopCamera();
        onClose();
        router.push(`/session?join=${sessionMatch[1]}`);
        return;
      }
      // Handle profile share QR (existing flow)
      try {
        const p = new URL(result.data).searchParams.get("p");
        if (p) {
          stopCamera();
          onResult(p);
          return;
        }
      } catch {
        // not a URL, keep scanning
      }
    }
    rafRef.current = requestAnimationFrame(scan);
  }

  function handleClose() {
    stopCamera();
    onClose();
  }

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
        <h2 className="text-lg font-bold text-center mb-4">Scan QR-code</h2>

        {error ? (
          <div className="text-center py-8">
            <p className="text-sm mb-4" style={{ color: "var(--text2)" }}>{error}</p>
            <button
              onClick={handleClose}
              className="focus-ring px-4 py-2 rounded-xl border text-sm"
              style={{ borderColor: "var(--border)", color: "var(--text2)" }}
            >
              Sluit
            </button>
          </div>
        ) : (
          <>
            <div className="relative rounded-xl overflow-hidden mb-4" style={{ aspectRatio: "1", background: "#000" }}>
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
            <p className="text-xs text-center mb-4" style={{ color: "var(--text2)" }}>
              Richt de camera op de QR-code van je partner.
            </p>
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
