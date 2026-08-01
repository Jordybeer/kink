"use client";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import Sheet from "./Sheet";
import { useRouter } from "next/navigation";
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

export default function QRScanner({ open, onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
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
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setPartError(null);
    setAssembly(null);
    setBundleProgress(null);
    setPasteMode(false);
    setPasteInput("");
    setPasteError(null);
    lastRawRef.current = null;
    assemblyRef.current = null;
    bundleAssemblyRef.current = null;

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
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function dispatchPayload(raw: string, dedupeCameraFrames = true): DispatchResult {
    const now = Date.now();
    if (dedupeCameraFrames && lastRawRef.current?.value === raw && now - lastRawRef.current.at < 900) {
      return "progress";
    }
    if (dedupeCameraFrames) lastRawRef.current = { value: raw, at: now };
    const parsed = parseSharePaste(raw);

    if (parsed.kind === "session") {
      stopCamera();
      onClose();
      router.push(`/session?join=${parsed.code}`);
      return "complete";
    }
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
          setPartError("De ontvangen profielfoto is ongeldig of beschadigd.");
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
    if (result?.data && dispatchPayload(result.data) === "complete") return;
    rafRef.current = requestAnimationFrame(scan);
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
              : `Profiel scannen — ${bundleProgress.profileReceived} van ${bundleProgress.profileTotal || "…"}`
            : assembly
              ? `Scan verder — ${received} van ${assembly.total}`
              : showPaste ? "Plak link of code" : "Scan QR-code"}
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
          <p className="text-xs text-center mb-3" style={{ color: "var(--accent)" }}>
            Deel ontvangen. Houd de camera gericht; volgende delen worden automatisch verzameld.
          </p>
        )}

        {showPaste ? (
          <div>
            {error && (
              <p className="text-sm mb-3 text-center" style={{ color: "var(--text2)" }}>{error}</p>
            )}
            <p className="text-xs mb-2" style={{ color: "var(--text2)" }}>
              Plak hier de link, code of één deel van een multi-QR.
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
            {(pasteError || partError) && (
              <p className="text-xs mb-3" style={{ color: "var(--hard-no)" }}>{pasteError ?? partError}</p>
            )}
            <button
              onClick={handlePasteSubmit}
              disabled={!pasteInput.trim()}
              className="focus-ring w-full py-2.5 rounded-xl text-sm font-bold mb-2 disabled:opacity-40 transition-opacity"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              {assembly || bundleProgress ? "Voeg QR-deel toe" : "Importeer"}
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
              <div className="absolute inset-0 pointer-events-none">
                {([["top-4 left-4", "border-t-2 border-l-2"], ["top-4 right-4", "border-t-2 border-r-2"], ["bottom-4 left-4", "border-b-2 border-l-2"], ["bottom-4 right-4", "border-b-2 border-r-2"]] as [string, string][]).map(([pos, border]) => (
                  <div key={pos} className={`absolute ${pos} w-7 h-7 ${border} rounded-sm`} style={{ borderColor: "var(--accent)" }} />
                ))}
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
            {partError && (
              <p className="text-xs text-center mb-2" style={{ color: "var(--hard-no)" }}>{partError}</p>
            )}
            <p className="text-xs text-center mb-2" style={{ color: "var(--text2)" }}>
              {bundleProgress
                ? bundleProgress.profileComplete
                  ? "Blijf richten. De profielfoto wordt nu automatisch verzameld."
                  : "Blijf richten. Profiel en foto worden in vaste fasen verzameld."
                : assembly
                  ? "Blijf richten. Bij handmatig wisselen mag de volgorde verschillen."
                  : "Richt de camera op de QR-code van je partner."}
            </p>
            <button
              onClick={() => { stopCamera(); setPartError(null); setPasteMode(true); }}
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
