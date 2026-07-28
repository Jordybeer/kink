import type { Profile } from "@/types";
import { CATEGORIES, getKinksByCategoryAndLevel } from "@/lib/kinks";
import { profileExportResponse } from "@/lib/privateResponses";

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
      return [`- [${response.status?.toUpperCase()}] ${kink.name}${tags}${comment}`];
    });

    if (!rows.length) continue;
    lines.push(`## ${category}`, ...rows, "");
  }

  const customRows = (profile.customKinks ?? []).flatMap((custom) => {
    const entry = profile.entries[custom.id];
    if (!entry?.status) return [];
    const response = profileExportResponse(entry, options.includePrivateResponses);
    if (response.kind === "omitted") return [];
    const tags = response.tags.length ? ` [${response.tags.join(", ")}]` : "";
    const comment = response.comment ? ` — ${response.comment}` : "";
    return [`- [${response.status?.toUpperCase()}] ${custom.name}${tags}${comment}`];
  });

  if (customRows.length) lines.push("## Meer", ...customRows, "");
  return lines.join("\n");
}
