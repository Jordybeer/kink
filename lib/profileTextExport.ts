import type { Profile } from "@/types";
import { CATEGORIES, getKinksByCategoryAndLevel, kinkCategoryLabel } from "@/lib/kinks";
import { profileExportResponse } from "@/lib/privateResponses";
import { STATUS_LABEL } from "@/lib/statusLabels";

interface ProfileTextExportOptions {
  includePrivateResponses?: boolean;
  generatedAt?: Date;
}

export function buildProfileTextExport(
  profile: Profile,
  maxLevel: number,
  options: ProfileTextExportOptions = {},
): string {
  const lines: string[] = [
    `# KinkSync — ${profile.name} (${profile.role})`,
    `Gegenereerd: ${(options.generatedAt ?? new Date()).toLocaleDateString("nl-NL")}`,
    "Privacy: lokaal gegenereerde export.",
    "Belangrijk: een voorkeur of overlap is geen toestemming.",
    "",
  ];

  for (const category of CATEGORIES) {
    const rows = getKinksByCategoryAndLevel(category, maxLevel).flatMap((kink) => {
      const entry = profile.entries[kink.id];
      if (!entry?.status) return [];
      const response = profileExportResponse(entry, options.includePrivateResponses);
      if (response.kind === "omitted") return [];
      const tags = response.tags.length ? ` [${response.tags.join(", ")}]` : "";
      const comment = response.comment ? ` — ${response.comment}` : "";
      return [`- [${response.status ? STATUS_LABEL[response.status] : "Onbeantwoord"}] ${kink.name}${tags}${comment}`];
    });

    if (!rows.length) continue;
    lines.push(`## ${kinkCategoryLabel(category)}`, ...rows, "");
  }

  const customRows = (profile.customKinks ?? []).flatMap((custom) => {
    const entry = profile.entries[custom.id];
    if (!entry?.status) return [];
    const response = profileExportResponse(entry, options.includePrivateResponses);
    if (response.kind === "omitted") return [];
    const tags = response.tags.length ? ` [${response.tags.join(", ")}]` : "";
    const comment = response.comment ? ` — ${response.comment}` : "";
    return [`- [${response.status ? STATUS_LABEL[response.status] : "Onbeantwoord"}] ${custom.name}${tags}${comment}`];
  });

  if (customRows.length) lines.push("## Meer", ...customRows, "");
  return lines.join("\n");
}
