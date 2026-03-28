"use client";
import { create } from "zustand";
import { api, setTokens, clearTokens } from "@/lib/api";
import { connectSocket, disconnectSocket } from "@/lib/socket";

interface User {
  id: string;
  name: string;
  email: string;
  role: "agent" | "manager" | "admin";
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  login: async (email, password) => {
    const data = await api.post<{ accessToken: string; refreshToken: string; user: User }>(
      "/v1/auth/login",
      { email, password },
    );
    setTokens(data.accessToken, data.refreshToken);
    set({ user: data.user });
    connectSocket();
  },

  logout: () => {
    clearTokens();
    disconnectSocket();
    set({ user: null });
  },

  hydrate: async () => {
    const token = localStorage.getItem("access_token");
    if (!token) { set({ loading: false }); return; }
    try {
      const user = await api.get<User>("/v1/auth/me");
      set({ user, loading: false });
      connectSocket();
    } catch {
      clearTokens();
      set({ loading: false });
    }
  },
}));
