"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  cleanupMunchPunchRooms,
  closeMunchPunchRoom,
  createMunchPunchRoom,
  expireMunchPunchRoom,
  openMunchPunchRoom,
  recordMunchPunchResponse,
  type MunchPunchRecordResult,
  type MunchPunchRoom,
} from "./munchPunch";
import type { MunchPunchPromptId } from "./munchPunchCatalog";

interface MunchPunchState {
  rooms: MunchPunchRoom[];
  _hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  createDraft: (input: {
    id: string;
    title?: string;
    now: number;
    expiresAt?: number;
    promptIds: readonly MunchPunchPromptId[];
    hostPublicKey: string;
  }) => MunchPunchRoom;
  openRoom: (roomId: string, now: number) => void;
  closeRoom: (roomId: string, now: number) => void;
  expireRooms: (now: number) => void;
  deleteRoom: (roomId: string) => void;
  recordResponse: (roomId: string, answers: readonly number[], replayHash: string, now: number) => MunchPunchRecordResult["status"];
}

export const useMunchPunchStore = create<MunchPunchState>()(
  persist(
    (set, get) => ({
      rooms: [],
      _hasHydrated: false,
      setHasHydrated: (value) => set({ _hasHydrated: value }),
      createDraft: (input) => {
        const room = createMunchPunchRoom(input);
        set((state) => ({ rooms: [room, ...cleanupMunchPunchRooms(state.rooms, input.now)].slice(0, 8) }));
        return room;
      },
      openRoom: (roomId, now) => set((state) => ({
        rooms: state.rooms.map((room) => room.id === roomId ? openMunchPunchRoom(room, now) : expireMunchPunchRoom(room, now)),
      })),
      closeRoom: (roomId, now) => set((state) => ({
        rooms: state.rooms.map((room) => room.id === roomId ? closeMunchPunchRoom(room, now) : expireMunchPunchRoom(room, now)),
      })),
      expireRooms: (now) => set((state) => ({ rooms: cleanupMunchPunchRooms(state.rooms, now) })),
      deleteRoom: (roomId) => set((state) => ({ rooms: state.rooms.filter((room) => room.id !== roomId) })),
      recordResponse: (roomId, answers, replayHash, now) => {
        const room = get().rooms.find((candidate) => candidate.id === roomId);
        if (!room) return "closed";
        const result = recordMunchPunchResponse(room, answers, replayHash, now);
        if (result.room !== room) {
          set((state) => ({ rooms: state.rooms.map((candidate) => candidate.id === roomId ? result.room : candidate) }));
        }
        return result.status;
      },
    }),
    {
      name: "kinksync-munch-punch-v1",
      version: 1,
      partialize: (state) => ({ rooms: state.rooms }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
