import React, { createContext, useContext, useEffect } from "react";
import { useAuth as useAuthStore } from "../stores/authStore";
import { UserDTO } from "@shared/types/User";

interface AuthContextType {
  currentUser: UserDTO | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    currentUser,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    checkAuth,
  } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const value = {
    currentUser,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
