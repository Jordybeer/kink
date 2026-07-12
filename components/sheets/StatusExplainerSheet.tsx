"use client";
import Sheet from "@/components/Sheet";
import { Star } from "@phosphor-icons/react";
import { STATUS_LABEL, STATUS_ORDER, STATUS_VAR } from "@/lib/statusLabels";
import type { KinkStatus } from "@/types";

// Longer-form vows behind each verdict — labels come from lib/statusLabels,
// only the elaboration lives here.
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
    <Sheet open={open} onClose={onClose} aria-label="Uitleg keuzes">
      <div
        className="rounded-t-2xl p-6 max-h-[80dvh] overflow-y-auto"
        style={{ background: "var(--surface)", borderTop: "1px solid var(--border-accent)" }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text)" }}>Wat betekenen deze keuzes?</h3>
        <ul className="flex flex-col gap-3">
          {STATUS_ORDER.map((s) => ({
            s,
            label: STATUS_LABEL[s],
            desc: STATUS_EXPLAINER[s],
          })).map(({ s, label, desc }) => (
            <li key={label} className="flex gap-3">
              <span className="w-3 h-3 rounded-full mt-1 flex-none" style={{ background: STATUS_VAR[s] }} aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{label}</p>
                <p className="text-sm leading-snug" style={{ color: "var(--text2)" }}>{desc}</p>
              </div>
            </li>
          ))}
          <li className="flex gap-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            <Star size={12} weight="fill" className="mt-1 flex-none" style={{ color: "var(--curious)" }} aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Nieuwsgierig</p>
              <p className="text-sm leading-snug" style={{ color: "var(--text2)" }}>
                Los van je oordeel: markeer met de ster wat je wil verkennen. Kan naast elke keuze bestaan — een ster is geen ja.
              </p>
            </div>
          </li>
        </ul>
        <p className="text-sm italic mt-4" style={{ color: "var(--text2)" }}>
          Tip: tik nogmaals op een actieve knop om hem uit te zetten.
        </p>
      </div>
    </Sheet>
  );
}
