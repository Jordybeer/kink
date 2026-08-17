"use client";
import { useState } from "react";
import Sheet from "@/components/ui/Sheet";
import { runtimeCachesToPurge } from "@/lib/offlineRoutes";

const DESTROY_PHRASE = "wis alles";

interface DestroyAllSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function DestroyAllSheet({ open, onClose }: DestroyAllSheetProps) {
  const [phrase, setPhrase] = useState("");

  /**
   * "Alles" moet ook echt alles zijn.
   *
   * localStorage was maar één van de laden. sessionStorage houdt de unlock-vlag
   * en de open/dicht-stand van de profiellijst vast, en de runtime-caches
   * bewaren bezochte URL's als sleutel. Geen ervan bevat antwoorden, maar de knop
   * belooft "permanent" en "alle", en dat woord hoort te kloppen.
   *
   * Eerst ruimde dit alleen `kinksync-pages` op. Te weinig: Serwist zet er via
   * `defaultCache` nog een stuk of vijftien naast. Nu gaat elke runtime-bucket
   * eruit, zie `runtimeCachesToPurge`.
   *
   * De precache blijft juist wél staan. Daar zit de app zelf in. Wie offline
   * alles wist en daarna herlaadt, moet nog steeds een werkende app terugkrijgen
   * in plaats van een wit scherm.
   */
  async function handleDestroy() {
    try { localStorage.clear(); } catch { /* een kluis die niet opengaat, blijft dicht */ }
    try { sessionStorage.clear(); } catch { /* idem */ }
    try {
      if (typeof caches !== "undefined") {
        const names = await caches.keys();
        await Promise.all(runtimeCachesToPurge(names).map((name) => caches.delete(name)));
      }
    } catch { /* de cache opruimen mag het wissen nooit tegenhouden */ }
    window.location.reload();
  }

  function handleClose() {
    setPhrase("");
    onClose();
  }

  return (
    <Sheet open={open} onClose={handleClose} title="Vernietig alle data" aria-label="Alle data verwijderen">
      <p className="text-center text-sm mb-4" style={{ color: "var(--text2)" }}>
        Dit verwijdert alle profielen, contracten en instellingen permanent.{" "}
        Typ <strong style={{ color: "var(--text)" }}>wis alles</strong> om te bevestigen.
      </p>
      <input
        value={phrase}
        onChange={(e) => setPhrase(e.target.value)}
        placeholder="wis alles"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="focus-ring w-full rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none text-center"
        style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
      />
      <div className="flex flex-col gap-3">
        <button
          onClick={handleDestroy}
          disabled={phrase.trim().toLowerCase() !== DESTROY_PHRASE}
          className="focus-ring w-full py-3 rounded-xl text-sm font-bold transition-opacity disabled:opacity-30"
          style={{ background: "color-mix(in srgb, var(--hard-no) 25%, var(--surface2))", border: "1px solid var(--hard-no)", color: "var(--hard-no)" }}
        >
          Vernietig voor altijd
        </button>
        <button
          onClick={handleClose}
          className="focus-ring w-full py-3 rounded-xl text-sm font-medium border transition-colors"
          style={{ borderColor: "var(--border)", color: "var(--text2)" }}
        >
          Annuleer
        </button>
      </div>
    </Sheet>
  );
}
