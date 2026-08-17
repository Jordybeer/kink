"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { STORAGE_FULL_EVENT } from "@/lib/persistStorage";

/**
 * Wat de opslag niet meer kwijt kan, mag de gebruiker niet pas bij het volgende
 * bezoek ontdekken. Dataverlies staat op prioriteit 1 van UI-principles, dus dit
 * wordt niet stil opgelost en niet in een menu verstopt (#12).
 *
 * Toon: geen alarm, wel duidelijk over het gevolg (#10 Serious is niet scary).
 */
export default function StorageFullNotice() {
  const { showToast } = useToast();
  const router = useRouter();
  // Een volle kluis roept bij elke toetsaanslag opnieuw; één keer is genoeg.
  const announced = useRef(false);

  useEffect(() => {
    function handle() {
      if (announced.current) return;
      announced.current = true;

      showToast({
        message: "De opslag zit vol. Je laatste wijziging is niet bewaard.",
        action: {
          label: "Maak een back-up",
          onClick: () => {
            router.push("/");
            // De instellingen leven op home; na de navigatie mag de deur open.
            window.setTimeout(
              () => window.dispatchEvent(new CustomEvent("ks:open-settings")),
              350,
            );
          },
        },
      });
    }

    window.addEventListener(STORAGE_FULL_EVENT, handle);
    return () => window.removeEventListener(STORAGE_FULL_EVENT, handle);
  }, [router, showToast]);

  return null;
}
