import { useState, useEffect, useCallback } from "react";
import { authClient, useBetterAuth as useBetterAuthClient } from "@/lib/authClient";

export type BetterAuthRole = "customer" | "admin" | "superadmin" | "store_manager" | "fulfillment";

interface BetterAuthState {
  user: {
    id: string;
    email: string;
    name: string;
    role: BetterAuthRole;
  } | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useBetterAuth() {
  const { session, user, isLoading, isAuthenticated, error, role, isAdmin, isSuperAdmin } = useBetterAuthClient();

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await authClient.signIn.email({ email, password });
    if (result.error) {
      throw new Error(result.error.message || "Sign in failed");
    }
    return result;
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const result = await authClient.signUp.email({ email, password, name });
    if (result.error) {
      throw new Error(result.error.message || "Sign up failed");
    }
    return result;
  }, []);

  const signOut = useCallback(async () => {
    await authClient.signOut();
  }, []);

  return {
    user: user ? {
      id: user.id,
      email: user.email,
      name: user.name,
      role: role as BetterAuthRole,
    } : null,
    isLoading,
    isAuthenticated,
    error,
    role,
    isAdmin,
    isSuperAdmin,
    signIn,
    signUp,
    signOut,
  };
}

export function useBetterAuthFeatureFlag() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkFeatureFlag() {
      try {
        const response = await fetch("/api/auth/feature-flag");
        if (response.ok) {
          const data = await response.json();
          setIsEnabled(data.enabled);
        }
      } catch (error) {
        console.error("[BETTER_AUTH] Failed to check feature flag:", error);
      } finally {
        setIsLoading(false);
      }
    }
    checkFeatureFlag();
  }, []);

  return { isEnabled, isLoading };
}
