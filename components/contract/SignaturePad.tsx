"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "@phosphor-icons/react";
import { canvasHasInk } from "@/lib/canvasUtils";

// The signing ritual: pad, modal and the drawing hook — moved whole from
// app/contract/page.tsx, no behaviour touched.
function useDrawCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    if (accent) ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const getPos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onDown = (e: PointerEvent) => {
      drawing.current = true;
      canvas.setPointerCapture(e.pointerId);
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };
    const onMove = (e: PointerEvent) => {
      if (!drawing.current) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };
    const onUp = () => { drawing.current = false; };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [canvasRef]);
}

// Separate component so useDrawCanvas runs when the canvas actually mounts
function DrawableCanvas({
  canvasRef,
  colour,
  label,
  sourceRef,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  colour: string;
  label: string;
  sourceRef: React.RefObject<HTMLCanvasElement | null>;
}) {
  useDrawCanvas(canvasRef);

  useEffect(() => {
    const src = sourceRef.current;
    const dst = canvasRef.current;
    if (!src || !dst || src.width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const ctx = dst.getContext("2d");
    if (ctx) ctx.drawImage(src, 0, 0, dst.width / dpr, dst.height / dpr);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-xl touch-none"
      style={{
        border: `1px solid ${colour}`,
        background: "var(--surface2)",
        cursor: "crosshair",
        display: "block",
        height: "220px",
      }}
      aria-label={`Handtekening voor ${label}`}
    />
  );
}

export default function SignaturePad({
  label,
  colour,
  canvasRef,
  onSignedChange,
}: {
  label: string;
  colour: string;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onSignedChange?: (signed: boolean) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const modalCanvasRef = useRef<HTMLCanvasElement>(null);

  function closeModal() {
    const src = modalCanvasRef.current;
    const dst = canvasRef.current;
    if (src && dst) {
      dst.width = src.width;
      dst.height = src.height;
      dst.getContext("2d")!.drawImage(src, 0, 0);
      onSignedChange?.(canvasHasInk(src));
    }
    setModalOpen(false);
  }

  function clear() {
    const m = modalCanvasRef.current;
    if (m) m.getContext("2d")!.clearRect(0, 0, m.width, m.height);
    const c = canvasRef.current;
    if (c) c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    onSignedChange?.(false);
  }

  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-[140px]">
      <div className="text-sm font-semibold" style={{ color: colour }}>
        {label}
      </div>
      {/* Clickable canvas — tap to open modal */}
      <button
        onClick={() => setModalOpen(true)}
        className="focus-ring w-full rounded-xl transition-opacity hover:opacity-80 active:opacity-90 p-0 m-0 border-none"
        style={{
          border: `1px solid ${colour}`,
          background: "var(--surface2)",
          display: "block",
          height: "80px",
        }}
        aria-label={`Handtekeningveld openen voor ${label}`}
      >
        <canvas
          ref={canvasRef}
          className="w-full rounded-xl"
          style={{
            display: "block",
            height: "80px",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        />
      </button>
      <div className="flex items-center gap-2 w-full">
        <button
          onClick={clear}
          className="focus-ring min-h-11 flex-1 text-sm px-3 py-1 rounded-full border transition-colors"
          style={{ color: "var(--text2)", borderColor: "var(--border)" }}
        >
          Veld wissen
        </button>
      </div>
      <div className="text-sm text-center" style={{ color: "var(--text2)" }}>
        Teken hier met vinger of muis
      </div>

      {modalOpen && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "var(--scrim-strong)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1rem",
            paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
          }}
          onClick={closeModal}
        >
          <div
            style={{
              background: "var(--surface)",
              borderRadius: "1rem",
              padding: "1.5rem",
              width: "100%",
              maxWidth: "480px",
              border: `2px solid ${colour}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold" style={{ color: colour }}>
                {label}
              </span>
              <button
                onClick={closeModal}
                className="focus-ring p-1 rounded-full"
                style={{ color: "var(--text2)" }}
                aria-label="Sluiten"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>
            <DrawableCanvas
              canvasRef={modalCanvasRef}
              colour={colour}
              label={label}
              sourceRef={canvasRef}
            />
            <p className="text-sm text-center mt-2" style={{ color: "var(--text2)" }}>
              Teken hier met vinger of muis
            </p>
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={clear}
                className="focus-ring min-h-11 text-sm px-3 py-1.5 rounded-full border"
                style={{ color: "var(--text2)", borderColor: "var(--border)" }}
              >
                Wis
              </button>
              <button
                onClick={closeModal}
                className="focus-ring min-h-11 text-sm px-4 py-1.5 rounded-full font-semibold"
                style={{ background: colour, color: "var(--on-accent)" }}
              >
                Klaar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
