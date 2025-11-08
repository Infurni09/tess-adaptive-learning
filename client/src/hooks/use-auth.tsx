import { useQuery } from "@tanstack/react-query";

type AuthUser = {
  id: string;
  username: string;
};

type AuthResponse = {
  user: AuthUser;
};

export function useAuth() {
  const { data, isLoading } = useQuery<AuthResponse>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  return {
    user: data?.user || null,
    isAuthenticated: !!data?.user,
    isLoading,
  };
}
