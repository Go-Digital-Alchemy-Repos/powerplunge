import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/authClient";

type BetterAuthUser = NonNullable<Awaited<ReturnType<typeof authClient.getSession>>["data"]>["user"];

async function fetchUser(): Promise<BetterAuthUser | null> {
  const session = await authClient.getSession();
  return session.data?.user ?? null;
}

async function logout(): Promise<void> {
  await authClient.signOut();
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<BetterAuthUser | null>({
    queryKey: ["/api/auth/get-session"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/get-session"], null);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
