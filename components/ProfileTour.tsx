"use client";
import { useState } from "react";

interface Props {
  onComplete: () => void;
}

const STEPS = [
  {
    title: "Info over elke kink",
    body: "Tap ⓘ links van de naam voor een beschrijving en uitleg.",
    hint: "ⓘ",
    hintSide: "left" as const,
  },
  {
    title: "Jouw status",
    body: "Tap een pill om aan te geven hoe je over deze kink denkt — van Ja tot Harde grens.",
    hint: "pills",
    hintSide: "bottom" as const,
  },
  {
    title: "Notities en tags",
    body: "Tap 💬 om een grenstoelichting of opmerking toe te voegen. Verschijnt ook automatisch na het kiezen van een status.",
    hint: "💬",
    hintSide: "right" as const,
  },
];

export default function ProfileTour({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.75)" }}
        onClick={onComplete}
        aria-hidden="true"
      />

      {/* Mock kink row as visual anchor */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 401, width: "min(22rem, calc(100vw - 2rem))",
      }}>
        {/* Simulated kink row */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderLeft: "4px solid var(--accent)", borderRadius: "0.75rem",
          padding: "0.625rem 0.75rem 0.5rem",
          marginBottom: "0.75rem",
        }}>
          {/* Row 1 */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <span style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "1.75rem", height: "1.75rem", borderRadius: "0.5rem", flexShrink: 0,
              border: `1px solid ${current.hintSide === "left" ? "var(--accent)" : "var(--border)"}`,
              color: current.hintSide === "left" ? "var(--accent)" : "var(--text2)",
              fontSize: "0.75rem",
              boxShadow: current.hintSide === "left" ? "0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent)" : "none",
              transition: "all 200ms ease",
            }}>ⓘ</span>

            <span style={{ flex: 1, fontSize: "1.0625rem", fontWeight: 500, color: "var(--text)" }}>
              Voorbeeld kink
            </span>

            <span style={{
              fontSize: "0.75rem", padding: "0.25rem 0.625rem",
              borderRadius: "9999px", border: "1px solid var(--border)",
              color: "var(--text2)", flexShrink: 0,
            }}>Ervaring</span>

            <span style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "2rem", height: "2rem", borderRadius: "0.5rem",
              border: `1px solid ${current.hintSide === "right" ? "var(--accent)" : "var(--border)"}`,
              fontSize: "0.875rem", opacity: current.hintSide === "right" ? 1 : 0.4,
              boxShadow: current.hintSide === "right" ? "0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent)" : "none",
              transition: "all 200ms ease",
            }}>💬</span>
          </div>

          {/* Row 2 — pills */}
          <div style={{
            display: "flex", gap: "0.25rem", flexWrap: "wrap",
            padding: current.hintSide === "bottom" ? "0.25rem" : "0",
            borderRadius: "0.5rem",
            boxShadow: current.hintSide === "bottom" ? "0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent)" : "none",
            transition: "box-shadow 200ms ease",
          }}>
            {["Ja", "Graag", "Misschien", "Nee", "Harde grens"].map((label) => (
              <span key={label} style={{
                fontSize: "0.8125rem", padding: "0.375rem 0.75rem",
                borderRadius: "9999px", border: "1px solid var(--border)",
                color: "var(--text2)",
              }}>{label}</span>
            ))}
          </div>
        </div>

        {/* Tooltip card */}
        <div style={{
          background: "var(--surface2)", border: "1px solid var(--border)",
          borderRadius: "1rem", padding: "1.25rem 1.25rem 1rem",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "var(--text)" }}>
              {current.title}
            </h3>
            <span style={{ fontSize: "0.75rem", color: "var(--text2)", flexShrink: 0, marginLeft: "0.5rem", marginTop: "0.125rem" }}>
              {step + 1}/{STEPS.length}
            </span>
          </div>
          <p style={{ margin: "0 0 1.25rem", fontSize: "0.875rem", color: "var(--text2)", lineHeight: 1.6 }}>
            {current.body}
          </p>
          <div style={{ display: "flex", gap: "0.625rem", alignItems: "center" }}>
            <button
              onClick={isLast ? onComplete : () => setStep((s) => s + 1)}
              style={{
                flex: 1, background: "var(--accent)", color: "#000", fontWeight: 600,
                padding: "0.625rem 1.25rem", borderRadius: "9999px", border: "none",
                fontSize: "0.875rem", cursor: "pointer",
              }}
            >
              {isLast ? "Aan de slag 🖤" : "Volgende →"}
            </button>
            <button
              onClick={onComplete}
              style={{
                background: "transparent", border: "1px solid var(--border)",
                color: "var(--text2)", padding: "0.625rem 1rem",
                borderRadius: "9999px", fontSize: "0.8125rem", cursor: "pointer",
              }}
            >
              Sla over
            </button>
          </div>
        </div>

        {/* Step dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: "0.375rem", marginTop: "0.875rem" }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              height: 4, width: i === step ? 20 : 6, borderRadius: 999,
              background: i === step ? "var(--accent)" : "var(--border)",
              transition: "width 300ms cubic-bezier(0.34,1.56,0.64,1), background 200ms ease",
            }} />
          ))}
        </div>
      </div>
    </>
  );
}
