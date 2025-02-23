import { create } from "zustand";
import { User } from "@prisma/client";

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await window.electron.login({ email, password });

      if (!response.success) {
        throw new Error(response.error || "Login failed");
      }

      set({
        currentUser: response.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true });
      await window.electron.logout();
      set({
        currentUser: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const response = await window.electron.getCurrentUser();

      if (!response.success || !response.data) {
        set({
          currentUser: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      set({
        currentUser: response.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({
        currentUser: null,
        isAuthenticated: false,
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },
}));
