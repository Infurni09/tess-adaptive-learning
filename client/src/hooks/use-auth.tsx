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
  });

  return {
    user: data?.user || null,
    isAuthenticated: !!data?.user,
    isLoading,
  };
}
