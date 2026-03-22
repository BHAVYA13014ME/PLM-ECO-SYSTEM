import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  // State
  user: null,             // { _id, name, email, role }
  accessToken: null,      // IN MEMORY ONLY — never write to localStorage or sessionStorage
  isAuthenticated: false,

  // Actions
  setCredentials: (user, token) => set({
    user,
    accessToken: token,
    isAuthenticated: true,
  }),
  
  logout: () => set({
    user: null,
    accessToken: null,
    isAuthenticated: false,
  }),

  setUser: (user) => set({ user }),
}));
