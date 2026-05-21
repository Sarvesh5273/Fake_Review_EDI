"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface User {
  id: string;
  email: string;
  name?: string | null;
  role?: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<{ needsEmailVerification: boolean }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapUser(sessionUser: SupabaseUser | null, profile: { name: string | null; role: string | null } | null): User | null {
  if (!sessionUser) return null;

  return {
    id: sessionUser.id,
    email: sessionUser.email ?? "",
    name: profile?.name ?? (sessionUser.user_metadata?.name as string | undefined) ?? sessionUser.email?.split("@")[0] ?? null,
    role: profile?.role ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const syncSession = async (session: Session | null) => {
      if (!session?.user) {
        setUser(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("name, role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error) {
        console.error("Failed to load profile:", error);
      }

      if (!data) {
        const { data: inserted, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: session.user.id,
            email: session.user.email ?? null,
            name: (session.user.user_metadata?.name as string | undefined) ?? null,
          })
          .select("name, role")
          .single();

        if (insertError) {
          console.error("Failed to create profile:", insertError);
          setUser(mapUser(session.user, null) ?? null);
          return;
        }

        setUser(mapUser(session.user, inserted ?? null) ?? null);
        return;
      }

      setUser(mapUser(session.user, data ?? null) ?? null);
    };

    const init = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Failed to load session:", error);
      }
      await syncSession(data.session);
      setIsLoading(false);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsLoading(true);
      await syncSession(session);
      setIsLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setIsLoading(false);
      throw error;
    }

    setIsLoading(false);
  };

  const signup = async (email: string, password: string, name: string) => {
    const supabase = getSupabaseBrowserClient();
    setIsLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) {
      setIsLoading(false);
      throw error;
    }

    const needsEmailVerification = !data.session;
    setIsLoading(false);
    return { needsEmailVerification };
  };

  const logout = async () => {
    const supabase = getSupabaseBrowserClient();
    setIsLoading(true);

    const { error } = await supabase.auth.signOut();
    setIsLoading(false);

    if (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
