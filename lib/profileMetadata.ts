export interface ProfileMetadataInput {
  totalRated: number;
  totalVisible: number;
  customKinkCount: number;
  topCategory: string;
  topCategoryHasRatings: boolean;
}

export function formatProfileMetadata(i: ProfileMetadataInput): string {
  const parts = [`${i.totalRated} van ${i.totalVisible} beoordeeld`];
  if (i.customKinkCount > 0) parts.push(`${i.customKinkCount} eigen kinks`);
  if (i.topCategoryHasRatings) parts.push(`sterkste: ${i.topCategory}`);
  return parts.join(" · ");
}
