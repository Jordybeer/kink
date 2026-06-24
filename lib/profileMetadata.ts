export interface ProfileMetadataInput {
  customKinkCount: number;
  topCategory: string;
  topCategoryHasRatings: boolean;
}

export function formatProfileMetadata(i: ProfileMetadataInput): string {
  const parts: string[] = [];
  if (i.customKinkCount > 0) parts.push(`${i.customKinkCount} eigen kinks`);
  if (i.topCategoryHasRatings) parts.push(`sterkste: ${i.topCategory}`);
  return parts.join(" · ");
}
