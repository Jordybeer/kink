import { useStore } from "@/lib/store";
import type {
  ExperienceLevel,
  Profile,
  ProfilePerspective,
  QuestionnairePreset,
  QuestionnaireSetup,
} from "@/types";

export type ProfileDirectionChoice = ProfilePerspective | "both";

export interface CreatePerspectiveProfilesInput {
  name: string;
  direction: ProfileDirectionChoice;
  questionnaireSetup: QuestionnaireSetup;
}

export interface CreatedPerspectiveProfiles {
  groupId: string;
  primaryId: string;
  profileIds: string[];
}

const LEVEL_RANK: Record<ExperienceLevel, number> = {
  beginner: 1,
  gevorderd: 2,
  ervaren: 3,
  diepgaand: 4,
};

function roleForPerspective(perspective: ProfilePerspective): string {
  return perspective === "dominant" ? "Dominant" : "Submissive";
}

function perspectiveForProfile(profile: Profile): ProfilePerspective | undefined {
  if (profile.perspective) return profile.perspective;
  const normalizedRole = profile.role.trim().toLowerCase();
  if (normalizedRole === "dominant") return "dominant";
  if (normalizedRole === "submissive") return "submissive";
  return undefined;
}

function experienceForPreset(preset: QuestionnairePreset): ExperienceLevel {
  if (preset === "quick") return "beginner";
  if (preset === "full") return "diepgaand";
  return "gevorderd";
}

function widenExperience(
  current: ExperienceLevel | undefined,
  preset: QuestionnairePreset,
): ExperienceLevel {
  const derived = experienceForPreset(preset);
  if (!current) return derived;
  return LEVEL_RANK[current] >= LEVEL_RANK[derived] ? current : derived;
}

function samePerson(left: Profile, right: Profile): boolean {
  if (left.id === right.id) return true;
  return !!left.personGroupId && left.personGroupId === right.personGroupId;
}

function isOwnProfile(profile: Profile): boolean {
  return profile.origin !== "shared" && profile.isImported !== true;
}

function patchProfiles(
  profileIds: string[],
  perspectives: ProfilePerspective[],
  groupId: string,
  questionnaireSetup: QuestionnaireSetup,
) {
  useStore.setState((state) => ({
    profiles: state.profiles.map((profile) => {
      const index = profileIds.indexOf(profile.id);
      if (index < 0) return profile;
      const perspective = perspectives[index];
      return {
        ...profile,
        personGroupId: groupId,
        perspective,
        role: roleForPerspective(perspective),
        experienceLevel: experienceForPreset(questionnaireSetup.preset),
        questionnaireSetup: {
          ...questionnaireSetup,
          interests: [...questionnaireSetup.interests],
        },
        updatedAt: Date.now(),
      };
    }),
  }));
}

/**
 * Creates one profile for a single perspective or two independent profiles for
 * a Switch. The two answer maps are never copied or shared.
 */
export function createPerspectiveProfiles(
  input: CreatePerspectiveProfilesInput,
): CreatedPerspectiveProfiles {
  const name = input.name.trim();
  if (!name) throw new Error("Vul een naam of alias in.");

  const state = useStore.getState();
  const duplicate = state.profiles.some(
    (profile) => isOwnProfile(profile)
      && profile.name.trim().toLowerCase() === name.toLowerCase(),
  );
  if (duplicate) throw new Error("Er bestaat al een profiel met deze naam.");

  const groupId = crypto.randomUUID();
  const perspectives: ProfilePerspective[] = input.direction === "both"
    ? ["dominant", "submissive"]
    : [input.direction];
  const experienceLevel = experienceForPreset(input.questionnaireSetup.preset);

  const profileIds = perspectives.map((perspective) =>
    useStore.getState().createProfile(
      name,
      roleForPerspective(perspective),
      experienceLevel,
    ),
  );

  patchProfiles(profileIds, perspectives, groupId, input.questionnaireSetup);

  return {
    groupId,
    primaryId: profileIds[0],
    profileIds,
  };
}

export function getProfileSiblings(profile: Profile, profiles: Profile[]): Profile[] {
  if (!profile.personGroupId) return [];
  return profiles.filter(
    (candidate) => candidate.id !== profile.id && candidate.personGroupId === profile.personGroupId,
  );
}

export function updateProfileQuestionnaire(
  profileId: string,
  questionnaireSetup: QuestionnaireSetup,
) {
  useStore.setState((state) => ({
    profiles: state.profiles.map((profile) =>
      profile.id === profileId
        ? {
            ...profile,
            experienceLevel: widenExperience(profile.experienceLevel, questionnaireSetup.preset),
            questionnaireSetup: {
              ...questionnaireSetup,
              interests: [...questionnaireSetup.interests],
            },
            updatedAt: Date.now(),
          }
        : profile,
    ),
  }));
}

export function adoptProfilePerspective(
  profileId: string,
  perspective: ProfilePerspective,
) {
  const currentState = useStore.getState();
  const selected = currentState.profiles.find((profile) => profile.id === profileId);
  if (!selected) return;

  const duplicateSibling = selected.personGroupId
    ? currentState.profiles.find(
        (candidate) => candidate.id !== selected.id
          && candidate.personGroupId === selected.personGroupId
          && perspectiveForProfile(candidate) === perspective,
      )
    : undefined;

  if (duplicateSibling) {
    const label = roleForPerspective(perspective);
    throw new Error(`Het gekoppelde profiel gebruikt het perspectief ${label} al.`);
  }

  useStore.setState((state) => ({
    profiles: state.profiles.map((profile) => {
      if (profile.id !== profileId) return profile;
      const normalizedRole = profile.role.trim().toLowerCase();
      const alreadyPrimary = normalizedRole === "dominant" || normalizedRole === "submissive";
      return {
        ...profile,
        legacyRole: profile.legacyRole ?? (!alreadyPrimary && profile.role.trim() ? profile.role.trim() : undefined),
        personGroupId: profile.personGroupId ?? crypto.randomUUID(),
        perspective,
        role: roleForPerspective(perspective),
        updatedAt: Date.now(),
      };
    }),
  }));
}

export interface UpdateProfileIdentityInput {
  name: string;
  relationshipStatus?: string;
  fetLifeUsername?: string;
  bdsmtestUrl?: string;
}

/** Shared person-level details are updated across both local perspectives. */
export function updateProfileIdentity(
  profileId: string,
  input: UpdateProfileIdentityInput,
) {
  const currentState = useStore.getState();
  const current = currentState.profiles.find((profile) => profile.id === profileId);
  if (!current) return;

  const cleanName = input.name.trim();
  if (!cleanName) throw new Error("Vul een naam of alias in.");

  const normalizedName = cleanName.toLowerCase();
  const duplicate = currentState.profiles.some(
    (candidate) => isOwnProfile(candidate)
      && !samePerson(candidate, current)
      && candidate.name.trim().toLowerCase() === normalizedName,
  );
  if (duplicate) throw new Error("Er bestaat al een profiel met deze naam.");

  useStore.setState((state) => {
    const latest = state.profiles.find((profile) => profile.id === profileId);
    if (!latest) return state;
    const now = Date.now();

    return {
      profiles: state.profiles.map((profile) =>
        samePerson(profile, latest)
          ? {
              ...profile,
              name: cleanName,
              relationshipStatus: input.relationshipStatus || undefined,
              fetLifeUsername: input.fetLifeUsername || undefined,
              bdsmtestUrl: profile.id === latest.id
                ? input.bdsmtestUrl || undefined
                : profile.bdsmtestUrl,
              updatedAt: now,
            }
          : profile,
      ),
    };
  });
}
