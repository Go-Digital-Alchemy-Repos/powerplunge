import { useQuery } from "@tanstack/react-query";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "admin" | "store_manager" | "fulfillment";
  avatarUrl?: string | null;
}

async function fetchAdminUser(): Promise<AdminUser | null> {
  const response = await fetch("/api/admin/me", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function fetchOptionalAdminUser(): Promise<AdminUser | null> {
  const response = await fetch("/api/admin/optional-me", {
    credentials: "include",
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export function useAdmin(options: { enabled?: boolean; optional?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  const { data: admin, isLoading } = useQuery<AdminUser | null>({
    queryKey: [options.optional ? "/api/admin/optional-me" : "/api/admin/me"],
    queryFn: options.optional ? fetchOptionalAdminUser : fetchAdminUser,
    enabled,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  return {
    admin,
    isLoading,
    isAuthenticated: !!admin,
    role: admin?.role ?? "admin",
    hasFullAccess: admin?.role === "super_admin" || admin?.role === "admin" || admin?.role === "store_manager",
    isSuperAdmin: admin?.role === "super_admin",
  };
}
