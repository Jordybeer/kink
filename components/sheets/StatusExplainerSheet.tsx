"use client";
import Sheet from "@/components/Sheet";
import { Info, Star } from "@phosphor-icons/react";
import { ExplanationContent, ExplanationProse } from "@/components/ExplanationContent";
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
      variant="surface"
      title="Wat betekenen deze keuzes?"
      headerIcon={<Info size={20} weight="duotone" />}
      aria-label="Uitleg keuzes"
    >
      <ExplanationContent>
        <ul className="flex flex-col gap-6">
          {STATUS_ORDER.map((status) => ({
            status,
            label: STATUS_LABEL[status],
            description: STATUS_EXPLAINER[status],
          })).map(({ status, label, description }) => (
            <li key={label} className="flex gap-3">
              <span className="mt-[8px] h-[12px] w-[12px] flex-none rounded-full" style={{ background: STATUS_VAR[status] }} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-base font-semibold leading-6" style={{ color: "var(--text)" }}>{label}</p>
                <ExplanationProse secondary>{description}</ExplanationProse>
              </div>
            </li>
          ))}
          <li className="flex gap-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            <Star size={12} weight="fill" className="mt-[8px] flex-none" style={{ color: "var(--curious)" }} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-base font-semibold leading-6" style={{ color: "var(--text)" }}>Nieuwsgierig</p>
              <ExplanationProse secondary>
                Los van je oordeel: markeer met de ster wat je wil verkennen. Kan naast elke keuze bestaan. Een ster is geen ja.
              </ExplanationProse>
            </div>
          </li>
        </ul>
        <ExplanationProse secondary>Tip: tik nogmaals op een actieve knop om hem uit te zetten.</ExplanationProse>
      </ExplanationContent>
    </Sheet>
  );
}
