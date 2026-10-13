"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldWarning } from "@phosphor-icons/react";
import { useHasHydrated, useStore } from "@/lib/store";

const EMPTY_LIST: never[] = [];

export default function ImportedProfileIntegrityGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hydrated = useHasHydrated();
  const profiles = useStore((state) => state.profiles ?? EMPTY_LIST);
  const quarantinedProfiles = useStore((state) => state.quarantinedProfiles ?? EMPTY_LIST);
  const status = useStore((state) => state.profileIntegrityStatus ?? "idle");
  const verifyImportedProfiles = useStore((state) => state.verifyImportedProfiles);

  useEffect(() => {
    if (!hydrated || status !== "idle" || typeof verifyImportedProfiles !== "function") return;
    void verifyImportedProfiles();
  }, [hydrated, status, verifyImportedProfiles]);

  const hasSignedImports = profiles.some((profile) =>
    (profile.origin === "shared" || profile.isImported === true) && !!profile.consentProof);
  const needsCheck = hasSignedImports || quarantinedProfiles.length > 0;
  const blocking = hydrated && needsCheck && status !== "ready";
  const showBanner = hydrated
    && status === "ready"
    && quarantinedProfiles.length > 0
    && pathname !== "/quarantine";

  return (
    <>
      {children}

      {blocking && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[1000] flex items-center justify-center px-6"
          style={{ background: "color-mix(in srgb, var(--bg) 92%, transparent)" }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 text-center shadow-xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <ShieldWarning aria-hidden="true" size={28} weight="duotone" className="mx-auto mb-3" style={{ color: "var(--accent)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Gedeelde profielkopieën controleren…</p>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--text2)" }}>
              KinkSync controleert of de opgeslagen antwoorden nog overeenkomen met hun eerder bevestigde versie.
            </p>
          </div>
        </div>
      )}

      {showBanner && (
        <div
          role="alert"
          className="fixed left-3 right-3 bottom-20 sm:bottom-4 z-[350] mx-auto max-w-lg rounded-xl px-4 py-3 shadow-xl flex items-center gap-3"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--hard-no)",
            color: "var(--text)",
          }}
        >
          <ShieldWarning size={20} weight="fill" aria-hidden="true" style={{ color: "var(--hard-no)", flexShrink: 0 }} />
          <p className="text-sm flex-1 leading-relaxed" style={{ color: "var(--text2)" }}>
            <strong style={{ color: "var(--text)" }}>
              {quarantinedProfiles.length} profielkopie{quarantinedProfiles.length === 1 ? "" : "ën"} {quarantinedProfiles.length === 1 ? "moet" : "moeten"} opnieuw worden bevestigd.
            </strong>{" "}
            Tot dan niet gebruikt voor vergelijken, sessies of nieuwe scènes.
          </p>
          <Link
            href="/quarantine"
            className="focus-ring rounded-lg px-3 py-2 text-sm font-semibold flex-none"
            style={{ background: "var(--danger-fill)", color: "var(--on-danger-fill)" }}
          >
            Bekijken
          </Link>
        </div>
      )}
    </>
  );
}
