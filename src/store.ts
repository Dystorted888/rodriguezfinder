import { create } from 'zustand';

export type Member = { uid: string; name: string; color: string };
export type LocationDoc = { lat: number; lng: number; accuracy?: number; updatedAt: number; };

type State = {
  groupId: string | null;
  me: Member | null;
  members: Record<string, Member>;
  locations: Record<string, LocationDoc>;
  setGroup: (g: string | null) => void;
  setMe: (m: Member | null) => void;
  setMembers: (m: Record<string, Member>) => void;
  setLocations: (l: Record<string, LocationDoc>) => void;
}

export const useStore = create<State>((set) => ({
  groupId: null,
  me: null,
  members: {},
  locations: {},
  setGroup: (groupId) => set({ groupId }),
  setMe: (me) => set({ me }),
  setMembers: (members) => set({ members }),
  setLocations: (locations) => set({ locations }),
}));