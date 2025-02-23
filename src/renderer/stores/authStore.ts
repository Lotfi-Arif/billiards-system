import { create } from "zustand";
import { AuthResponse, UserDTO } from "@shared/types/User";

interface AuthState {
  token: string | null;
  currentUser: UserDTO | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  token: null,
  currentUser: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await window.electron.login({ email, password });

      if (!response.success || !response.data) {
        throw new Error(response.error || "Login failed");
      }

      const authResponse = response.data as AuthResponse;

      set({
        token: authResponse.token,
        currentUser: authResponse.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      set({
        token: null,
        currentUser: null,
        error: err instanceof Error ? err.message : String(err),
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true });
      const response = await window.electron.logout();

      if (!response.success) {
        throw new Error(response.error || "Logout failed");
      }

      set({
        token: null,
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
          token: null,
          currentUser: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
        return;
      }

      const userData = response.data as UserDTO;

      set({
        currentUser: userData,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      set({
        token: null,
        currentUser: null,
        isAuthenticated: false,
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },
}));
