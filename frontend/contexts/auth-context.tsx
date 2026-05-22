"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
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
  signup: (
    email: string,
    password: string,
    name: string
  ) => Promise<{ needsEmailVerification: boolean }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const syncSession = async (session: Session | null) => {
      console.log("SYNC SESSION START");

      if (!session?.user) {
        console.log("NO SESSION USER");
        setUser(null);
        return;
      }

      console.log("SESSION USER FOUND:", session.user);

      setUser({
        id: session.user.id,
        email: session.user.email ?? "",
        name:
          (session.user.user_metadata?.name as string | undefined) ??
          session.user.email?.split("@")[0] ??
          null,
        role: null,
      });

      console.log("USER STATE UPDATED");
    };

    const init = async () => {
      try {
        console.log("INIT START");

        const { data, error } = await supabase.auth.getSession();

        console.log("SESSION DATA:", data);
        console.log("SESSION ERROR:", error);

        await syncSession(data.session);
      } catch (err) {
        console.error("INIT ERROR:", err);
      } finally {
        console.log("INIT COMPLETE");
        setIsLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("AUTH EVENT:", event);
        console.log("AUTH SESSION:", session);

        try {
          setIsLoading(true);

          await syncSession(session);
        } catch (err) {
          console.error("AUTH STATE ERROR:", err);
        } finally {
          setIsLoading(false);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();

    try {
      console.log("LOGIN START");

      setIsLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log("LOGIN RESPONSE:", data);
      console.log("LOGIN ERROR:", error);

      if (error) {
        throw error;
      }

      console.log("LOGIN SUCCESS");

      window.location.href = "/dashboard";
    } catch (err) {
      console.error("LOGIN FAILED:", err);
      throw err;
    } finally {
      console.log("LOGIN FINALLY");
      setIsLoading(false);
    }
  };

  const signup = async (
    email: string,
    password: string,
    name: string
  ) => {
    const supabase = getSupabaseBrowserClient();

    try {
      setIsLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      console.log("SIGNUP RESPONSE:", data);
      console.log("SIGNUP ERROR:", error);

      if (error) {
        throw error;
      }

      return {
        needsEmailVerification: !data.session,
      };
    } catch (err) {
      console.error("SIGNUP FAILED:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const supabase = getSupabaseBrowserClient();

    try {
      setIsLoading(true);

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setUser(null);
    } catch (err) {
      console.error("LOGOUT FAILED:", err);
      throw err;
    } finally {
      setIsLoading(false);
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