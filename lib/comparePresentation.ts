import { directionalSideForKinkId } from "@/lib/directionality";
import { complementaryParticipationSideLabel } from "@/lib/participation";
import type { CompareFactKind, ComparisonFact } from "@/lib/compareV2";
import type { Profile } from "@/types";

export const COMPARE_FACT_LABEL: Record<CompareFactKind, string> = {
  shared: "Zelfde interesse",
  complementary: "Past bij elkaar",
  discuss: "Even bespreken",
  soft: "Verschil in enthousiasme",
  conflict: "Botst met harde grens",
  limit: "Harde grens",
};

export function compactComparisonName(name: string): string {
  const directional = name.match(/^(.+?) — (?:geven ↔ ontvangen|ontvangen ↔ geven) ↔ \1 — (?:geven ↔ ontvangen|ontvangen ↔ geven)$/);
  if (directional) return directional[1];

  const complementary = name.match(/^(.+?) — ([^↔]+) ↔ \1 — ([^↔]+)$/);
  if (complementary) return complementary[1];

  return name;
}

export function comparisonDirectionNote(
  fact: ComparisonFact,
  profileA: Profile,
  profileB: Profile,
): string | undefined {
  if (fact.relation !== "complementary") return undefined;

  const sideA = directionalSideForKinkId(fact.kinkAId);
  if (sideA === "give") return `${profileA.name} geeft · ${profileB.name} ontvangt`;
  if (sideA === "receive") return `${profileA.name} ontvangt · ${profileB.name} geeft`;

  const participationA = complementaryParticipationSideLabel(fact.kinkAId);
  const participationB = complementaryParticipationSideLabel(fact.kinkBId);
  if (participationA && participationB) {
    return `${profileA.name}: ${participationA.toLocaleLowerCase("nl-BE")} · ${profileB.name}: ${participationB.toLocaleLowerCase("nl-BE")}`;
  }

  return undefined;
}
