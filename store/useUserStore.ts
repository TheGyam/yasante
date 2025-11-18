import { create } from 'zustand';
import { User, HairProfile } from '@/types/user';

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  updateHairProfile: (profile: HairProfile) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  updateHairProfile: (profile) =>
    set((state) => ({
      user: state.user
        ? { ...state.user, hairProfile: profile, updatedAt: new Date().toISOString() }
        : null,
    })),
  logout: () => set({ user: null, isAuthenticated: false }),
}));

