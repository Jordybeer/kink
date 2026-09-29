"use client";

import { useEffect, useRef, type ChangeEvent } from "react";

interface Props {
  onImportFile: (event: ChangeEvent<HTMLInputElement>) => void;
  onBack: () => void;
  onComplete: () => void;
  busy: boolean;
  obscured: boolean;
  error: string | null;
  success: string | null;
}

export default function FirstRunBackupRestore({ onImportFile, onBack, onComplete, busy, obscured, error, success }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);

  return (
    <main
      inert={obscured}
      className="mx-auto flex min-h-svh w-full max-w-lg flex-col justify-center gap-5 px-5"
      style={{ paddingTop: "max(2rem, env(safe-area-inset-top))", paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
    >
      <h1 ref={heading} tabIndex={-1} className="text-3xl leading-tight" style={{ fontFamily: "var(--font-display, Georgia, serif)", color: "var(--text)" }}>Je eigen plek terug</h1>
      <p className="text-base leading-relaxed" style={{ color: "var(--text2)" }}>Kies je KinkSync-back-up. Je gegevens worden op dit toestel hersteld. Je hoeft geen nieuw profiel te maken.</p>
      <p className="text-sm leading-relaxed" style={{ color: "var(--text2)" }}>Je oude appvergrendeling wordt niet overgenomen. Stel na het herstellen een nieuwe PIN in via Instellingen.</p>
      <input ref={input} type="file" accept=".json,application/json" aria-label="Kies een backupbestand" className="sr-only" onChange={onImportFile} disabled={busy} />
      {error && <p role="alert" className="text-sm leading-relaxed" style={{ color: "var(--hard-no-text)" }}>{error}</p>}
      {success && <p role="status" className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>{success}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={success ? onComplete : () => input.current?.click()}
        className="focus-ring min-h-11 rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
        style={{ background: "var(--accent)", color: "var(--on-accent)" }}
      >
        {busy ? "Back-up lezen…" : success ? "Verder met mijn gegevens" : "Kies je back-up"}
      </button>
      <button type="button" onClick={onBack} className="focus-ring min-h-11 rounded-xl px-4 py-3 text-sm" style={{ color: "var(--text2)" }}>Terug naar de introductie</button>
    </main>
  );
}
