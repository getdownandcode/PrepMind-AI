"use client";

import { create } from "zustand";
import { api, setTokens } from "@/lib/api";
import type { AuthResponse, User } from "@/types/api";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  signup: (email: string, password: string, fullName?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,

  async signup(email, password, fullName) {
    set({ loading: true, error: null });
    try {
      const data = await api<AuthResponse>("/v1/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, full_name: fullName ?? null }),
      });
      setTokens(data.access_token, data.refresh_token);
      const me = await api<User>("/v1/auth/me");
      set({ user: me, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },

  async login(email, password) {
    set({ loading: true, error: null });
    try {
      const data = await api<AuthResponse>("/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setTokens(data.access_token, data.refresh_token);
      const me = await api<User>("/v1/auth/me");
      set({ user: me, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },

  logout() {
    setTokens(null, null);
    set({ user: null });
  },

  async hydrate() {
    set({ loading: true });
    try {
      const me = await api<User>("/v1/auth/me");
      set({ user: me, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
}));
