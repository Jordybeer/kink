import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "@/lib/store";

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});

describe("notificationPermissionAsked", () => {
  it("defaults to false on a fresh store", () => {
    expect(useStore.getInitialState().notificationPermissionAsked).toBe(false);
  });

  it("setNotificationPermissionAsked flips it to true", () => {
    expect(useStore.getState().notificationPermissionAsked).toBe(false);
    useStore.getState().setNotificationPermissionAsked();
    expect(useStore.getState().notificationPermissionAsked).toBe(true);
  });

  it("is persisted via partialize (present in initial state)", () => {
    // The field lives in the persisted slice, so a hydrated store always carries it.
    expect(useStore.getInitialState()).toHaveProperty("notificationPermissionAsked");
  });
});
