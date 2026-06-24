import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";
import {
  isBetterAuthAdminRole,
  normalizeBetterAuthRole,
} from "@shared/auth/roles";

const USE_BETTER_AUTH = import.meta.env.VITE_USE_BETTER_AUTH === "true";

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  plugins: [magicLinkClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;

export function useBetterAuth() {
  const { data: session, isPending, error } = useSession();

  return {
    session,
    user: session?.user ?? null,
    isLoading: isPending,
    isAuthenticated: !!session?.user,
    error,
    role: normalizeBetterAuthRole((session?.user as any)?.role),
    isAdmin: isBetterAuthAdminRole((session?.user as any)?.role),
    isSuperAdmin: normalizeBetterAuthRole((session?.user as any)?.role) === "super_admin",
  };
}

export async function betterAuthSignIn(email: string, password: string) {
  try {
    const result = await authClient.signIn.email({
      email,
      password,
    });
    return result;
  } catch (error: any) {
    console.error("[BETTER_AUTH] Sign in error:", error);
    throw error;
  }
}

export async function betterAuthSignUp(email: string, password: string, name: string) {
  try {
    const result = await authClient.signUp.email({
      email,
      password,
      name,
    });
    return result;
  } catch (error: any) {
    console.error("[BETTER_AUTH] Sign up error:", error);
    throw error;
  }
}

export async function betterAuthSignOut() {
  try {
    await authClient.signOut();
  } catch (error: any) {
    console.error("[BETTER_AUTH] Sign out error:", error);
    throw error;
  }
}

export { USE_BETTER_AUTH };
