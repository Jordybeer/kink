"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ArrowRight, Camera, UserPlus } from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import Wordmark from "@/components/Wordmark";
import ProfileCreateSheet from "@/components/ProfileCreateSheet";

const QRScanner = dynamic(() => import("@/components/QRScanner"), { ssr: false });

export default function SandboxHomePage() {
  const [formOpen, setFormOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  function continueProfileImport(encoded: string) {
    setScanOpen(false);
    window.location.assign(`/#p3=${encodeURIComponent(encoded)}`);
  }

  return (
    <>
      <PageShell width="2xl" className="lg:max-w-4xl">
        <div className="mb-7 pt-1 text-center">
          <h1 className="text-6xl"><Wordmark /></h1>
          <div className="ks-gradient-rule mx-auto my-4" />
          <p className="text-sm italic tracking-wide" style={{ color: "var(--text2)" }}>
            Verken grenzen. Samen.
          </p>
        </div>

        <section
          className="mx-auto max-w-xl border-y px-1 py-6"
          style={{ borderColor: "color-mix(in srgb, var(--border-accent) 55%, var(--border))" }}
        >
          <div className="flex items-start gap-3.5 px-1 sm:px-2">
            <div
              className="flex h-11 w-11 flex-none items-center justify-center rounded-full"
              style={{
                background: "color-mix(in srgb, var(--accent) 11%, var(--surface2))",
                border: "1px solid var(--border-accent)",
                color: "var(--accent)",
              }}
            >
              <UserPlus size={20} weight="duotone" aria-hidden="true" />
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <h2
                className="text-[1.9rem] leading-[1.08] sm:text-[2.05rem]"
                style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 600 }}
              >
                Maak je eerste profiel
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
                Kies een naam, perspectief en wat je nu wilt verkennen. Je antwoorden en foto kun je daarna rustig aanvullen.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-2 px-1 sm:px-2">
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="focus-ring flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
            >
              Maak mijn profiel
              <ArrowRight size={16} weight="bold" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setScanOpen(true)}
              className="focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold"
              style={{
                color: "var(--text2)",
                border: "1px solid var(--border)",
                background: "color-mix(in srgb, var(--surface2) 62%, transparent)",
              }}
            >
              <Camera size={16} aria-hidden="true" />
              Profiel van partner scannen
            </button>
          </div>

          <p className="mt-4 px-3 text-center text-xs leading-5" style={{ color: "var(--text2)" }}>
            Je kunt later altijd een extra perspectief of partnerprofiel toevoegen.
          </p>
        </section>

        <footer
          className="mx-auto mt-9 max-w-sm border-t px-4 pt-7 text-center"
          style={{ borderColor: "var(--border)" }}
        >
          <p className="text-sm font-semibold tracking-[0.04em]" style={{ color: "var(--text)" }}>
            For adults. By adults.
          </p>
          <p className="mt-2 text-xs leading-5" style={{ color: "var(--text2)" }}>
            Dit is alleen de visuele Home-sandbox. De huidige Home blijft ongewijzigd.
          </p>
        </footer>
      </PageShell>

      <ProfileCreateSheet open={formOpen} onClose={() => setFormOpen(false)} />
      <QRScanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onResult={continueProfileImport}
      />
    </>
  );
}
