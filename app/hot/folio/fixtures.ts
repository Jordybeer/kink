export const FOLIO_HOME = "/hot/folio";

export const perspectives = [
  { id: "noor", name: "Noor", role: "Switch", linked: false, topics: ["praise_kink", "collar_leash"] },
  { id: "robin-leidt", name: "Robin", role: "Dominant", linked: true, topics: ["dominance_submission", "praise_kink"] },
  { id: "robin-volgt", name: "Robin", role: "Submissive", linked: true, topics: ["collar_leash", "praise_kink"] },
] as const;

export type FolioProfile = (typeof perspectives)[number];

export function profileForId(id: string) {
  return perspectives.find(profile => profile.id === id);
}
