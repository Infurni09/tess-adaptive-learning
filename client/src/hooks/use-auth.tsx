import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

type AuthUser = {
  id: string;
  username: string;
};

type AuthResponse = {
  user: AuthUser;
};

export function useAuth() {
  const { data, isLoading } = useQuery<AuthResponse | null>({
    queryKey: ['/api/auth/me'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 0, // Always refetch to ensure auth state is current
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: true, // Always refetch when component mounts
  });

  return {
    user: data?.user || null,
    isAuthenticated: !!data?.user,
    isLoading,
  };
}
