import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "@/lib/store";
import {
  adoptProfilePerspective,
  createPerspectiveProfiles,
  getProfileSiblings,
  updateProfileIdentity,
  updateProfileQuestionnaire,
} from "@/lib/profilePerspectives";

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});

describe("profile perspectives", () => {
  it("creates exactly two linked profiles for both sides", () => {
    const created = createPerspectiveProfiles({
      name: "Nova",
      direction: "both",
      questionnaireSetup: {
        mode: "dynamic",
        interests: ["power"],
        version: 2,
      },
    });

    expect(created.profileIds).toHaveLength(2);
    const profiles = useStore.getState().profiles.filter((profile) => created.profileIds.includes(profile.id));
    expect(profiles).toHaveLength(2);
    expect(new Set(profiles.map((profile) => profile.personGroupId))).toEqual(new Set([created.groupId]));
    expect(profiles.map((profile) => profile.perspective).sort()).toEqual(["dominant", "submissive"]);
    expect(profiles.map((profile) => profile.role).sort()).toEqual(["Dominant", "Submissive"]);
    expect(profiles[0].entries).not.toBe(profiles[1].entries);
  });

  it("creates v2 Dynamic perspectives with independent answer maps", () => {
    const created = createPerspectiveProfiles({
      name: "Vesper",
      direction: "both",
      questionnaireSetup: {
        mode: "dynamic",
        interests: ["bondage"],
        version: 2,
      },
    });
    const profiles = useStore.getState().profiles.filter((candidate) => created.profileIds.includes(candidate.id));
    expect(profiles.map((candidate) => candidate.questionnaireSetup))
      .toEqual([
        { mode: "dynamic", interests: ["bondage"], version: 2 },
        { mode: "dynamic", interests: ["bondage"], version: 2 },
      ]);
    expect(profiles[0].entries).not.toBe(profiles[1].entries);
    expect(profiles[0].questionnaireSetup?.interests)
      .not.toBe(profiles[1].questionnaireSetup?.interests);
  });

  it("keeps answers independent between dominant and submissive profiles", () => {
    const created = createPerspectiveProfiles({
      name: "Nova",
      direction: "both",
      questionnaireSetup: { mode: "dynamic", interests: [], version: 2 },
    });
    const [dominantId, submissiveId] = created.profileIds;

    useStore.getState().setEntry(dominantId, "spanking_hand", { status: "yes" });

    const dominant = useStore.getState().profiles.find((profile) => profile.id === dominantId)!;
    const submissive = useStore.getState().profiles.find((profile) => profile.id === submissiveId)!;
    expect(dominant.entries.spanking_hand.status).toBe("yes");
    expect(submissive.entries.spanking_hand).toBeUndefined();
    expect(getProfileSiblings(dominant, useStore.getState().profiles).map((profile) => profile.id)).toEqual([submissiveId]);
  });

  it("updates shared identity fields but keeps BDSMTest links perspective-specific", () => {
    const created = createPerspectiveProfiles({
      name: "Nova",
      direction: "both",
      questionnaireSetup: { mode: "dynamic", interests: [], version: 2 },
    });
    const [dominantId, submissiveId] = created.profileIds;

    updateProfileIdentity(dominantId, {
      name: "Nova Rose",
      relationshipStatus: "Getrouwd",
      fetLifeUsername: "nova-rose",
      bdsmtestUrl: "https://bdsmtest.org/r/dominant",
    });

    const dominant = useStore.getState().profiles.find((profile) => profile.id === dominantId)!;
    const submissive = useStore.getState().profiles.find((profile) => profile.id === submissiveId)!;
    expect(dominant.name).toBe("Nova Rose");
    expect(submissive.name).toBe("Nova Rose");
    expect(dominant.relationshipStatus).toBe("Getrouwd");
    expect(submissive.relationshipStatus).toBe("Getrouwd");
    expect(dominant.fetLifeUsername).toBe("nova-rose");
    expect(submissive.fetLifeUsername).toBe("nova-rose");
    expect(dominant.bdsmtestUrl).toBe("https://bdsmtest.org/r/dominant");
    expect(submissive.bdsmtestUrl).toBeUndefined();
  });

  it("rejects renaming a person to another existing own person's name", () => {
    const nova = createPerspectiveProfiles({
      name: "Nova",
      direction: "both",
      questionnaireSetup: { mode: "dynamic", interests: [], version: 2 },
    });
    createPerspectiveProfiles({
      name: "Mira",
      direction: "dominant",
      questionnaireSetup: { mode: "dynamic", interests: [], version: 2 },
    });

    expect(() => updateProfileIdentity(nova.primaryId, { name: " mira " }))
      .toThrow("Er bestaat al een profiel met deze naam");

    const linked = useStore.getState().profiles.filter((profile) => nova.profileIds.includes(profile.id));
    expect(linked.every((profile) => profile.name === "Nova")).toBe(true);
  });

  it("allows an own profile to use the same display name as an imported profile", () => {
    useStore.setState((state) => ({
      profiles: [
        ...state.profiles,
        {
          id: "shared-nova",
          name: "Nova",
          role: "Dominant",
          origin: "shared",
          isImported: true,
          experienceLevel: "beginner",
          customKinks: [],
          createdAt: 1,
          updatedAt: 1,
          entries: {},
        },
      ],
    }));

    expect(() => createPerspectiveProfiles({
      name: "Nova",
      direction: "submissive",
      questionnaireSetup: { mode: "dynamic", interests: [], version: 2 },
    })).not.toThrow();
  });

  it("updates questionnaire settings on only the selected perspective", () => {
    const created = createPerspectiveProfiles({
      name: "Nova",
      direction: "both",
      questionnaireSetup: { mode: "dynamic", interests: [], version: 2 },
    });
    const [dominantId, submissiveId] = created.profileIds;

    updateProfileQuestionnaire(dominantId, {
      mode: "deepDive",
      interests: ["impact"],
      version: 2,
    });

    const dominant = useStore.getState().profiles.find((profile) => profile.id === dominantId)!;
    const submissive = useStore.getState().profiles.find((profile) => profile.id === submissiveId)!;
    expect(dominant.questionnaireSetup).toEqual({ mode: "deepDive", interests: ["impact"], version: 2 });
    expect(dominant.experienceLevel).toBe("diepgaand");
    expect(submissive.questionnaireSetup).toEqual({ mode: "dynamic", interests: [], version: 2 });
    expect(submissive.experienceLevel).toBe("gevorderd");
  });

  it("switches only the selected perspective from Dynamic to Deep Dive", () => {
    const created = createPerspectiveProfiles({
      name: "Vesper",
      direction: "both",
      questionnaireSetup: { mode: "dynamic", interests: [], version: 2 },
    });
    const [dominantId, submissiveId] = created.profileIds;
    useStore.getState().setEntry(dominantId, "handcuffs", { status: "yes", comment: "blijft staan" });

    updateProfileQuestionnaire(dominantId, { mode: "deepDive", interests: [], version: 2 });

    const dominant = useStore.getState().profiles.find((candidate) => candidate.id === dominantId)!;
    const submissive = useStore.getState().profiles.find((candidate) => candidate.id === submissiveId)!;
    expect(dominant.questionnaireSetup).toEqual({ mode: "deepDive", interests: [], version: 2 });
    expect(dominant.experienceLevel).toBe("diepgaand");
    expect(dominant.entries.handcuffs).toMatchObject({ status: "yes", comment: "blijft staan" });
    expect(submissive.questionnaireSetup).toEqual({ mode: "dynamic", interests: [], version: 2 });
    expect(submissive.experienceLevel).toBe("gevorderd");
    expect(submissive.entries.handcuffs).toBeUndefined();
  });

  it("never narrows existing experience metadata when Dynamic is chosen", () => {
    const id = useStore.getState().createProfile("Expert", "Dominant", "diepgaand");

    updateProfileQuestionnaire(id, {
      mode: "dynamic",
      interests: [],
      version: 2,
    });

    const profile = useStore.getState().profiles.find((candidate) => candidate.id === id)!;
    expect(profile.experienceLevel).toBe("diepgaand");
    expect(profile.questionnaireSetup).toEqual({ mode: "dynamic", interests: [], version: 2 });
  });

  it("preserves a specialist legacy role when adopting a primary perspective", () => {
    const id = useStore.getState().createProfile("Nova", "Rigger", "ervaren");

    adoptProfilePerspective(id, "dominant");

    const profile = useStore.getState().profiles.find((candidate) => candidate.id === id)!;
    expect(profile.role).toBe("Dominant");
    expect(profile.perspective).toBe("dominant");
    expect(profile.legacyRole).toBe("Rigger");
  });

  it("rejects duplicate perspectives inside one linked person group", () => {
    const created = createPerspectiveProfiles({
      name: "Nova",
      direction: "both",
      questionnaireSetup: { mode: "dynamic", interests: [], version: 2 },
    });
    const [dominantId] = created.profileIds;

    expect(() => adoptProfilePerspective(dominantId, "submissive"))
      .toThrow("Het gekoppelde profiel gebruikt het perspectief Submissive al");

    const linked = useStore.getState().profiles.filter((profile) => created.profileIds.includes(profile.id));
    expect(linked.map((profile) => profile.perspective).sort()).toEqual(["dominant", "submissive"]);
  });

  it("rejects a duplicate own-person name instead of silently merging groups", () => {
    createPerspectiveProfiles({
      name: "Nova",
      direction: "dominant",
      questionnaireSetup: { mode: "dynamic", interests: [], version: 2 },
    });

    expect(() => createPerspectiveProfiles({
      name: " nova ",
      direction: "submissive",
      questionnaireSetup: { mode: "dynamic", interests: [], version: 2 },
    })).toThrow("Er bestaat al een profiel met deze naam");
  });
});
