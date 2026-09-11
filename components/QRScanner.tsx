"use client";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import Sheet from "./Sheet";
import { parseSharePaste } from "@/lib/parseSharePaste";
import {
  addProfileQrBundlePart,
  addProfileQrPart,
  type ProfileQrAssembly,
  type ProfileQrBundleAssembly,
} from "@/lib/profileQr";
import { encodeProfileShareBundle } from "@/lib/profileShareV3";

interface Props {
  open: boolean;
  onResult: (encoded: string) => void | Promise<void>;
  onClose: () => void;
}

type DispatchResult = "complete" | "progress" | "invalid";

interface BundleProgress {
  profileReceived: number;
  profileTotal: number;
  profileComplete: boolean;
  avatarReceived: number;
  avatarTotal: number;
  avatarComplete: boolean;
}

const QR_DECODE_INTERVAL_MS = 125;
const QR_DECODE_MAX_EDGE = 640;

export default function QRScanner({ open, onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const cameraGenerationRef = useRef(0);
  const lastDecodeAtRef = useRef(0);
  const lastRawRef = useRef<{ value: string; at: number } | null>(null);
  const assemblyRef = useRef<ProfileQrAssembly | null>(null);
  const bundleAssemblyRef = useRef<ProfileQrBundleAssembly | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [partError, setPartError] = useState<string | null>(null);
  const [assembly, setAssembly] = useState<ProfileQrAssembly | null>(null);
  const [bundleProgress, setBundleProgress] = useState<BundleProgress | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteInput, setPasteInput] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const cameraGeneration = ++cameraGenerationRef.current;
    setError(null);
    setPartError(null);
    setAssembly(null);
    setBundleProgress(null);
    setPasteMode(false);
    setPasteInput("");
    setPasteError(null);
    lastDecodeAtRef.current = 0;
    lastRawRef.current = null;
    assemblyRef.current = null;
    bundleAssemblyRef.current = null;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cameraGenerationRef.current !== cameraGeneration) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        attachCameraStream(cameraGeneration);
        scan(cameraGeneration);
      })
      .catch(() => {
        if (cameraGenerationRef.current === cameraGeneration) {
          setError("Camera niet beschikbaar of geweigerd.");
        }
      });

    return () => stopCamera();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function stopCamera() {
    cameraGenerationRef.current += 1;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function attachCameraStream(cameraGeneration: number) {
    if (cameraGenerationRef.current !== cameraGeneration) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream || video.srcObject === stream) return;

    video.srcObject = stream;
    video.play().catch(() => {
      if (cameraGenerationRef.current !== cameraGeneration) return;
      stopCamera();
      setError("Camera kon niet worden gestart. Probeer opnieuw.");
    });
  }

  function dispatchPayload(raw: string, dedupeCameraFrames = true): DispatchResult {
    const now = Date.now();
    if (dedupeCameraFrames && lastRawRef.current?.value === raw && now - lastRawRef.current.at < 900) {
      return "progress";
    }
    if (dedupeCameraFrames) lastRawRef.current = { value: raw, at: now };
    const parsed = parseSharePaste(raw);

    if (parsed.kind === "profile") {
      stopCamera();
      void onResult(parsed.encoded);
      return "complete";
    }
    if (parsed.kind === "profilePart") {
      if (bundleAssemblyRef.current) {
        setPartError("Deze QR hoort niet bij de profieloverdracht die al bezig is.");
        return "progress";
      }
      const collected = addProfileQrPart(assemblyRef.current, parsed.part);
      if (collected.status === "error") {
        setPartError(collected.message);
        return "progress";
      }
      if (collected.status === "complete") {
        assemblyRef.current = null;
        stopCamera();
        void onResult(collected.payload);
        return "complete";
      }
      assemblyRef.current = collected.assembly;
      setPartError(null);
      setAssembly(collected.assembly);
      return "progress";
    }
    if (parsed.kind === "profileBundlePart") {
      if (assemblyRef.current) {
        setPartError("Deze QR hoort niet bij de profieloverdracht die al bezig is.");
        return "progress";
      }
      const collected = addProfileQrBundlePart(bundleAssemblyRef.current, parsed.part);
      if (collected.status === "error") {
        setPartError(collected.message);
        return "progress";
      }
      if (collected.status === "complete") {
        try {
          const encoded = encodeProfileShareBundle(collected.profilePayload, collected.avatarPayload);
          bundleAssemblyRef.current = null;
          setBundleProgress({
            profileReceived: 1,
            profileTotal: 1,
            profileComplete: true,
            avatarReceived: 1,
            avatarTotal: 1,
            avatarComplete: true,
          });
          stopCamera();
          void onResult(encoded);
          return "complete";
        } catch {
          bundleAssemblyRef.current = null;
          setBundleProgress(null);
          setPartError("De ontvangen profieloverdracht is ongeldig, beschadigd of te groot. Start de scan opnieuw.");
          return "progress";
        }
      }
      bundleAssemblyRef.current = collected.assembly;
      setPartError(null);
      setBundleProgress({
        profileReceived: collected.profileReceived,
        profileTotal: collected.profileTotal,
        profileComplete: collected.profileComplete,
        avatarReceived: collected.avatarReceived,
        avatarTotal: collected.avatarTotal,
        avatarComplete: collected.avatarComplete,
      });
      return "progress";
    }
    return "invalid";
  }

  function scheduleNextScan(cameraGeneration: number) {
    rafRef.current = requestAnimationFrame((frameTime) => scan(cameraGeneration, frameTime));
  }

  function scan(cameraGeneration: number, frameTime = performance.now()) {
    if (cameraGenerationRef.current !== cameraGeneration) return;
    attachCameraStream(cameraGeneration);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0) {
      scheduleNextScan(cameraGeneration);
      return;
    }
    if (frameTime - lastDecodeAtRef.current < QR_DECODE_INTERVAL_MS) {
      scheduleNextScan(cameraGeneration);
      return;
    }
    lastDecodeAtRef.current = frameTime;

    const scale = Math.min(1, QR_DECODE_MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
    const scanWidth = Math.max(1, Math.round(video.videoWidth * scale));
    const scanHeight = Math.max(1, Math.round(video.videoHeight * scale));
    if (canvas.width !== scanWidth || canvas.height !== scanHeight) {
      canvas.width = scanWidth;
      canvas.height = scanHeight;
    }
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, scanWidth, scanHeight);
    const imageData = ctx.getImageData(0, 0, scanWidth, scanHeight);
    const result = jsQR(imageData.data, imageData.width, imageData.height);
    if (result?.data && dispatchPayload(result.data) === "complete") return;
    scheduleNextScan(cameraGeneration);
  }

  function handlePasteSubmit() {
    setPasteError(null);
    const outcome = dispatchPayload(pasteInput, false);
    if (outcome === "invalid") {
      setPasteError("Geen geldige link of code gevonden.");
      return;
    }
    if (outcome === "progress") setPasteInput("");
  }

  function handleClose() {
    stopCamera();
    setPasteInput("");
    setPasteError(null);
    setAssembly(null);
    setBundleProgress(null);
    assemblyRef.current = null;
    bundleAssemblyRef.current = null;
    onClose();
  }

  const showPaste = pasteMode || !!error;
  const received = assembly ? Object.keys(assembly.parts).length : 0;
  const profilePercent = bundleProgress?.profileTotal
    ? Math.round((bundleProgress.profileReceived / bundleProgress.profileTotal) * 100)
    : 0;
  const avatarPercent = bundleProgress?.avatarTotal
    ? Math.round((bundleProgress.avatarReceived / bundleProgress.avatarTotal) * 100)
    : 0;

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
        <h2 className="text-lg font-bold text-center mb-2">
          {bundleProgress
            ? bundleProgress.profileComplete
              ? "Profiel ontvangen"
              : `Profiel scannen: ${bundleProgress.profileReceived} van ${bundleProgress.profileTotal || "…"}`
            : assembly
              ? `Scan verder: ${received} van ${assembly.total}`
              : showPaste ? "Plak profiel-link of code" : "Scan QR-code"}
        </h2>

        {bundleProgress && (
          <div
            className="rounded-xl px-3 py-3 mb-3"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
            role="status"
            aria-live="polite"
          >
            <p className="text-sm font-semibold" style={{ color: bundleProgress.profileComplete ? "var(--yes)" : "var(--accent)" }}>
              {bundleProgress.profileComplete
                ? "✓ Profiel ontvangen"
                : `↓ Profiel… ${profilePercent}%`}
            </p>
            <p className="text-sm mt-1" style={{ color: bundleProgress.profileComplete ? "var(--accent)" : "var(--text2)" }}>
              {bundleProgress.profileComplete
                ? bundleProgress.avatarComplete
                  ? "✓ Profielfoto ontvangen"
                  : `↓ Profielfoto… ${avatarPercent}%`
                : "De profielfoto volgt automatisch zodra het profiel compleet is."}
            </p>
            <div className="h-1.5 rounded-full overflow-hidden mt-2" style={{ background: "var(--surface3)" }}>
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${bundleProgress.profileComplete ? avatarPercent : profilePercent}%`,
                  background: bundleProgress.profileComplete ? "var(--accent)" : "var(--yes)",
                }}
              />
            </div>
          </div>
        )}

        {assembly && !bundleProgress && (
          <p className="text-sm text-center mb-3" style={{ color: "var(--accent)" }}>
            Deel ontvangen. Houd de camera gericht; volgende delen worden automatisch verzameld.
          </p>
        )}

        {showPaste ? (
          <div>
            {error && (
              <p className="text-sm mb-3 text-center" style={{ color: "var(--text2)" }}>{error}</p>
            )}
            <label htmlFor="profile-share-paste" className="text-sm font-medium" style={{ color: "var(--text)" }}>
              Profiel-link of code
            </label>
            <p id="profile-share-paste-help" className="mt-1 mb-2 text-sm" style={{ color: "var(--text2)" }}>
              Plak de link, code of één deel van een multi-QR.
            </p>
            <textarea
              id="profile-share-paste"
              aria-describedby="profile-share-paste-help"
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              rows={3}
              placeholder="https://… of profielcode"
              className="focus-ring w-full text-sm rounded-lg border px-3 py-2 mb-2 placeholder-[color:var(--text2)] focus:outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", resize: "none" }}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
            />
            {(pasteError || partError) && (
              <p className="text-sm mb-3" style={{ color: "var(--hard-no)" }}>{pasteError ?? partError}</p>
            )}
            <button
              onClick={handlePasteSubmit}
              disabled={!pasteInput.trim()}
              className="focus-ring min-h-11 w-full py-2.5 rounded-xl text-sm font-semibold mb-2 disabled:opacity-40 transition-opacity"
              style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
            >
              {assembly || bundleProgress ? "Voeg QR-deel toe" : "Importeer"}
            </button>
            <button
              onClick={handleClose}
              className="focus-ring min-h-11 w-full py-2.5 rounded-xl text-sm font-medium border transition-colors"
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
              <div className="absolute inset-0 pointer-events-none">
                {([["top-4 left-4", "border-t-2 border-l-2"], ["top-4 right-4", "border-t-2 border-r-2"], ["bottom-4 left-4", "border-b-2 border-l-2"], ["bottom-4 right-4", "border-b-2 border-r-2"]] as [string, string][]).map(([pos, border]) => (
                  <div key={pos} className={`absolute ${pos} w-7 h-7 ${border} rounded-sm`} style={{ borderColor: "var(--accent)" }} />
                ))}
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
            {partError && (
              <p className="text-sm text-center mb-2" style={{ color: "var(--hard-no)" }}>{partError}</p>
            )}
            <p className="text-sm text-center mb-2" style={{ color: "var(--text2)" }}>
              {bundleProgress
                ? bundleProgress.profileComplete
                  ? "Blijf richten. De profielfoto wordt nu automatisch verzameld."
                  : "Blijf richten. Profiel en foto worden in vaste fasen verzameld."
                : assembly
                  ? "Blijf richten. Bij handmatig wisselen mag de volgorde verschillen."
                  : "Richt de camera op de QR-code van het gedeelde profiel."}
            </p>
            <button
              onClick={() => { stopCamera(); setPartError(null); setPasteMode(true); }}
              className="focus-ring mb-3 flex min-h-11 w-full items-center justify-center rounded-xl px-3 text-sm font-medium transition-opacity hover:opacity-90 active:opacity-75"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              Profiel-link plakken
            </button>
            <button
              onClick={handleClose}
              className="focus-ring min-h-11 w-full py-2.5 rounded-xl text-sm font-medium border transition-colors"
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
