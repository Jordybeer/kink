"use client";
import Sheet from "@/components/Sheet";
import { Star } from "@phosphor-icons/react";
import { STATUS_LABEL, STATUS_ORDER, STATUS_VAR } from "@/lib/statusLabels";
import type { KinkStatus } from "@/types";

const STATUS_EXPLAINER: Record<NonNullable<KinkStatus>, string> = {
  yes:     "Ik wil dit graag. Dit zoek ik actief op.",
  willing: "Ik ben hier voor. Geen probleem mee.",
  maybe:   "Onzeker. Hangt af van stemming, context, of met wie.",
  no:      "Niet voor mij, maar ik wil dit mijn partner geven of ontvangen.",
  hard_no: "Absolute limiet. Niet bespreekbaar.",
};

interface StatusExplainerSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function StatusExplainerSheet({ open, onClose }: StatusExplainerSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      scrollable
      title="Wat betekenen deze keuzes?"
      aria-label="Uitleg keuzes"
    >
      <div className="min-w-0 px-2">
        <ul className="flex flex-col gap-3">
          {STATUS_ORDER.map((status) => ({
            status,
            label: STATUS_LABEL[status],
            description: STATUS_EXPLAINER[status],
          })).map(({ status, label, description }) => (
            <li key={label} className="flex gap-3">
              <span className="mt-1 h-3 w-3 flex-none rounded-full" style={{ background: STATUS_VAR[status] }} aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{label}</p>
                <p className="text-sm leading-snug" style={{ color: "var(--text2)" }}>{description}</p>
              </div>
            </li>
          ))}
          <li className="flex gap-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            <Star size={12} weight="fill" className="mt-1 flex-none" style={{ color: "var(--curious)" }} aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Nieuwsgierig</p>
              <p className="text-sm leading-snug" style={{ color: "var(--text2)" }}>
                Los van je oordeel: markeer met de ster wat je wil verkennen. Kan naast elke keuze bestaan. Een ster is geen ja.
              </p>
            </div>
          </li>
        </ul>
        <p className="mt-4 text-sm italic" style={{ color: "var(--text2)" }}>
          Tip: tik nogmaals op een actieve knop om hem uit te zetten.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="focus-ring mt-5 min-h-12 w-full rounded-xl text-sm font-semibold"
          style={{ border: "1px solid var(--border)", color: "var(--text2)" }}
        >
          Sluit
        </button>
      </div>
    </Sheet>
  );
}
