"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AppUser } from "./types";
import { mockApi } from "./mockApi";

type AuthContextValue = {
  user: AppUser;
  loading: boolean;
  signInWithOtp: (args: {
    role: "parent" | "professor" | "admin";
    mobile: string;
    otp: string;
    usn?: string;
    name?: string;
    password?: string;
  }) => Promise<void>;
  requestOtp: (mobile: string) => Promise<{ debugOtp: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "edumatrix_auth_user_v1";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        // ignore
      }
    }
    setLoading(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async requestOtp(mobile) {
        const res = await mockApi.requestOtp(mobile);
        return { debugOtp: res.debugOtp };
      },
      async signInWithOtp({ role, mobile, otp, usn, name, password }) {
        const { user: u } = await mockApi.verifyOtp({ role, mobile, otp, usn, name, password });
        setUser(u);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
        }
      },
      async signOut() {
        await mockApi.signOut();
        setUser(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}


