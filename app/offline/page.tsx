"use client";

import { WifiSlash } from "@phosphor-icons/react";

export default function OfflinePage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
      <WifiSlash size={56} weight="duotone" aria-hidden="true" style={{ color: "var(--accent)" }} />
      <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
        Je bent offline
      </h1>
      <p className="max-w-xs text-sm" style={{ color: "var(--text2)" }}>
        Geen verbinding op dit moment. Je opgeslagen profielen en contracten
        blijven veilig in dit toestel. Zodra je weer online bent, gaat alles
        gewoon door.
      </p>
    </main>
  );
}
