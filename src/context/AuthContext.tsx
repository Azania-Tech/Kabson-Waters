"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserRole, setUserRole, type UserRecord } from "@/lib/commerce";

export type UserRole = UserRecord["role"];

export interface AuthUser extends User {
  role?: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  role: UserRole | null;
  displayName: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const customUser = firebaseUser as AuthUser;
        let role = await getUserRole(firebaseUser.uid);
        if (!role) {
          role = "cashier";
          // Use displayName set during sign-up, fall back to email prefix
          const name = firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "";
          await setUserRole(firebaseUser.uid, firebaseUser.email ?? "", role, name);
        }
        customUser.role = role;
        setUser(customUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  // Prefer Firebase displayName, fall back to email prefix
  const displayName = user?.displayName || user?.email?.split("@")[0] || null;

  return (
    <AuthContext.Provider value={{ user, loading, logout, role: user?.role ?? null, displayName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
