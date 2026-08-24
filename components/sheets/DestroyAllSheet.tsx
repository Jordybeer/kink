"use client";

import { useState } from "react";
import Sheet from "@/components/ui/Sheet";
import { destroyAllLocalData } from "@/lib/destroyAllLocalData";

const DESTROY_PHRASE = "wis alles";

interface DestroyAllSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function DestroyAllSheet({ open, onClose }: DestroyAllSheetProps) {
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDestroy() {
    if (busy || phrase.trim().toLowerCase() !== DESTROY_PHRASE) return;
    setBusy(true);
    setError(null);
    try {
      await destroyAllLocalData();
      window.location.reload();
    } catch {
      setError("Niet alle lokale gegevens konden worden verwijderd. Sluit andere KinkSync-tabbladen en probeer opnieuw.");
      setBusy(false);
    }
  }

  function handleClose() {
    if (busy) return;
    setPhrase("");
    setError(null);
    onClose();
  }

  return (
    <Sheet open={open} onClose={handleClose} title="Vernietig alle data" aria-label="Alle data verwijderen">
      <p id="destroy-all-instruction" className="mb-4 text-center text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
        Dit verwijdert profielen, contracten, je intimiteitsagenda, getekende PDF&apos;s, lokale sleutels, PIN/biometrie en instellingen permanent. De offline app zelf blijft beschikbaar.{" "}
        Typ <strong style={{ color: "var(--text)" }}>wis alles</strong> om te bevestigen.
      </p>
      <input
        value={phrase}
        onChange={(event) => setPhrase(event.target.value)}
        placeholder="wis alles"
        aria-label={`Typ ${DESTROY_PHRASE} om te bevestigen`}
        aria-describedby="destroy-all-instruction"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        disabled={busy}
        className="focus-ring mb-4 w-full rounded-lg px-3 py-2.5 text-center text-sm focus:outline-none disabled:opacity-50"
        style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
      />
      {error && <p role="alert" className="mb-3 text-center text-xs leading-relaxed" style={{ color: "var(--hard-no)" }}>{error}</p>}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => void handleDestroy()}
          disabled={busy || phrase.trim().toLowerCase() !== DESTROY_PHRASE}
          className="focus-ring w-full rounded-xl py-3 text-sm font-bold transition-opacity disabled:opacity-30"
          style={{ background: "color-mix(in srgb, var(--hard-no) 25%, var(--surface2))", border: "1px solid var(--hard-no)", color: "var(--hard-no)" }}
        >
          {busy ? "Alles verwijderen…" : "Vernietig voor altijd"}
        </button>
        <button
          type="button"
          onClick={handleClose}
          disabled={busy}
          className="focus-ring w-full rounded-xl border py-3 text-sm font-medium transition-colors disabled:opacity-40"
          style={{ borderColor: "var(--border)", color: "var(--text2)" }}
        >
          Annuleer
        </button>
      </div>
    </Sheet>
  );
}
