import { useCallback } from "react";
import { authClient, useBetterAuth as useBetterAuthClient } from "@/lib/authClient";
import type { BetterAuthRole } from "@shared/auth/roles";
export type { BetterAuthRole };

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
