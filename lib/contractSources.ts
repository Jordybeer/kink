/** Explicit public source references, scoped to the version's participants. */
export interface ContractSourceReference {
  sourceKind?: "catalog" | "custom";
  sourceAId?: string;
  sourceBId?: string;
}

/** Presentation names never identify a newly composed contract row. */
export function contractSourceKey(source: ContractSourceReference, profileAId: string, profileBId: string): string {
  const participants: string[][] = [];
  if (source.sourceAId) participants.push([profileAId, source.sourceAId]);
  if (source.sourceBId) participants.push([profileBId, source.sourceBId]);
  participants.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return JSON.stringify([source.sourceKind, participants]);
}
