import type { ContractSnapshot, Profile } from "@/types";

function profileGroupIdentity(profile: Profile): string {
  return profile.personGroupId
    ? `person:${profile.personGroupId}`
    : `profile:${profile.id}`;
}

export function findDefaultContractPair(
  profiles: readonly Profile[],
  pinnedProfileId: string | null,
): readonly [Profile, Profile] | null {
  const pinned = profiles.find((profile) => profile.id === pinnedProfileId);
  if (pinned) {
    const other = profiles.find(
      (profile) =>
        profile.id !== pinned.id
        && profileGroupIdentity(profile) !== profileGroupIdentity(pinned),
    );
    if (other) return [pinned, other];
  }

  for (let leftIndex = 0; leftIndex < profiles.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < profiles.length; rightIndex += 1) {
      if (
        profileGroupIdentity(profiles[leftIndex])
        !== profileGroupIdentity(profiles[rightIndex])
      ) {
        return [profiles[leftIndex], profiles[rightIndex]];
      }
    }
  }

  return null;
}

export function newContractHref(
  profiles: readonly Profile[],
  pinnedProfileId: string | null,
): string {
  const pair = findDefaultContractPair(profiles, pinnedProfileId);
  if (!pair) return "/compare";

  return `/contract?a=${encodeURIComponent(pair[0].id)}&b=${encodeURIComponent(pair[1].id)}`;
}

function contractParticipantIdentity(
  profileId: string | undefined,
  profileName: string,
): string {
  if (profileId) return `profile:${profileId}`;
  return `legacy:${profileName.trim().toLocaleLowerCase("nl-NL")}`;
}

function contractPairIdentity(contract: ContractSnapshot): string {
  const participants = [
    contractParticipantIdentity(contract.profileAId, contract.profileAName),
    contractParticipantIdentity(contract.profileBId, contract.profileBName),
  ].sort();

  return participants.join("|");
}

/**
 * Shows the newest snapshot for every exact profile combination. Separate
 * perspective profiles keep separate identities, while reversed A/B ordering
 * still belongs to the same contract history.
 */
export function sortContractsNewestFirst(
  contracts: readonly ContractSnapshot[],
): ContractSnapshot[] {
  const seenPairs = new Set<string>();

  return [...contracts]
    .sort((left, right) => right.date - left.date)
    .filter((contract) => {
      const pairIdentity = contractPairIdentity(contract);
      if (seenPairs.has(pairIdentity)) return false;
      seenPairs.add(pairIdentity);
      return true;
    });
}
