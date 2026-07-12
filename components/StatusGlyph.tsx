"use client";
import { Check, Fire, HandHeart, Minus, Prohibit } from "@phosphor-icons/react";
import type { KinkStatus } from "@/types";

// A second channel beside colour: every verdict carries a small glyph so
// colour-blind eyes read the same story. Semantics follow the house labels —
// "Voor hen" is a gift to the partner, not a refusal, hence the hand-heart.
// hard_no keeps its dashed border as a third channel.

const GLYPH: Record<NonNullable<KinkStatus>, React.ComponentType<{ size?: number; weight?: "bold" }>> = {
  yes: Fire,          // Heel graag — zoek ik actief op
  willing: Check,     // Ja — geen probleem mee
  maybe: Minus,       // Misschien — hangt af van context
  no: HandHeart,      // Voor hen — geef ik mijn partner
  hard_no: Prohibit,  // Harde grens — niet bespreekbaar
};

export default function StatusGlyph({ status, size = 10 }: { status: KinkStatus; size?: number }) {
  if (!status) return null;
  const Icon = GLYPH[status];
  return (
    <span aria-hidden="true" className="inline-flex flex-none" style={{ verticalAlign: "-0.08em" }}>
      <Icon size={size} weight="bold" />
    </span>
  );
}
