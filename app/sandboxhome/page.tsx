"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ArrowRight, Camera, Sparkle, UserPlus } from "@phosphor-icons/react";
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
        <div className="mb-6 pt-1 text-center">
          <h1 className="text-6xl"><Wordmark /></h1>
          <div className="ks-gradient-rule mx-auto my-4" />
          <p className="text-sm italic tracking-wide" style={{ color: "var(--text2)" }}>
            Verken grenzen. Samen.
          </p>
        </div>

        <section
          className="mx-auto max-w-xl overflow-hidden rounded-[28px] p-4 sm:p-5"
          style={{
            background: "linear-gradient(145deg, color-mix(in srgb, var(--accent) 7%, var(--surface2)), color-mix(in srgb, var(--accent) 2%, var(--surface)))",
            border: "1px solid color-mix(in srgb, var(--border-accent) 72%, var(--border))",
            boxShadow: "0 18px 44px color-mix(in srgb, var(--accent) 7%, transparent)",
          }}
        >
          <div className="px-2 pb-5 pt-1 text-center">
            <span
              className="mx-auto flex h-9 w-9 items-center justify-center rounded-full"
              style={{
                background: "color-mix(in srgb, var(--accent) 11%, var(--surface2))",
                border: "1px solid var(--border-accent)",
                color: "var(--accent)",
              }}
            >
              <Sparkle size={17} weight="duotone" aria-hidden="true" />
            </span>
            <h2
              className="mt-3 text-[1.9rem] leading-[1.08] sm:text-[2.05rem]"
              style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 600 }}
            >
              Maak je eerste profiel
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
              Begin met wat nieuwsgierig maakt.<br />
              De rest mag later komen.
            </p>
          </div>

          <div className="grid gap-2.5">
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="focus-ring flex min-h-[72px] w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-opacity hover:opacity-95"
              style={{
                background: "color-mix(in srgb, var(--accent) 13%, var(--surface2))",
                border: "1px solid color-mix(in srgb, var(--accent) 34%, var(--border))",
              }}
            >
              <span
                className="flex h-11 w-11 flex-none items-center justify-center rounded-full"
                style={{ background: "var(--accent)", color: "var(--on-accent)" }}
              >
                <UserPlus size={20} weight="duotone" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Maak mijn profiel</span>
                <span className="mt-0.5 block text-xs leading-5" style={{ color: "var(--text2)" }}>
                  Kies wat bij jou past
                </span>
              </span>
              <ArrowRight size={17} weight="bold" aria-hidden="true" className="flex-none" style={{ color: "var(--accent)" }} />
            </button>

            <button
              type="button"
              onClick={() => setScanOpen(true)}
              className="focus-ring flex min-h-[68px] w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left"
              style={{
                background: "color-mix(in srgb, var(--surface2) 82%, transparent)",
                border: "1px solid var(--border)",
              }}
            >
              <span
                className="flex h-10 w-10 flex-none items-center justify-center rounded-full"
                style={{ background: "var(--surface3)", color: "var(--text2)" }}
              >
                <Camera size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Scan partnerprofiel</span>
                <span className="mt-0.5 block text-xs leading-5" style={{ color: "var(--text2)" }}>
                  Bekijk wat je partner heeft gedeeld
                </span>
              </span>
              <ArrowRight size={16} aria-hidden="true" className="flex-none" style={{ color: "var(--text2)" }} />
            </button>
          </div>
        </section>

        <footer
          className="mx-auto mt-9 max-w-sm border-t px-4 pt-7 text-center"
          style={{ borderColor: "var(--border)" }}
        >
          <p className="text-sm font-semibold tracking-[0.04em]" style={{ color: "var(--text)" }}>
            For adults. By adults.
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
