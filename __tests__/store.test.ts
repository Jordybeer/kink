import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "@/lib/store";

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});

describe("createProfile", () => {
  it("sets origin to 'own' by default", () => {
    const id = useStore.getState().createProfile("Test", "Switch");
    const profile = useStore.getState().profiles.find((p) => p.id === id);
    expect(profile).toBeDefined();
    expect(profile!.origin).toBe("own");
  });

  it("sets experienceLevel to 'beginner' when omitted", () => {
    const id = useStore.getState().createProfile("Test", "Dom");
    const profile = useStore.getState().profiles.find((p) => p.id === id);
    expect(profile!.experienceLevel).toBe("beginner");
  });

  it("stores the given name and role", () => {
    const id = useStore.getState().createProfile("Saar", "Sub");
    const profile = useStore.getState().profiles.find((p) => p.id === id);
    expect(profile!.name).toBe("Saar");
    expect(profile!.role).toBe("Sub");
  });
});
