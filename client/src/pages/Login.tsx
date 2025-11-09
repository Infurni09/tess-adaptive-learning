import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Authentication failed");
      }
      return await response.json();
    },
    onSuccess: async () => {
      // Clear the entire React Query cache to force fresh data
      queryClient.clear();
      
      toast({
        title: isRegister ? "Account Created!" : "Welcome!",
        description: isRegister ? "Your account has been created successfully" : "Successfully logged in",
      });
      
      // Force page reload to ensure auth state is completely fresh
      window.location.href = "/dashboard";
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && password.trim()) {
      loginMutation.mutate({ username, password });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-10 shadow-md border-card-border transition-all duration-200">
        <div className="flex flex-col items-center mb-10">
          <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center mb-4 transition-all duration-200">
            <BookOpen className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome to TESS</h1>
          <p className="text-sm text-muted-foreground mt-2">Targeted Educational Support System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="transition-all duration-200"
              data-testid="input-username"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="transition-all duration-200"
              data-testid="input-password"
              required
              minLength={6}
            />
            {isRegister && (
              <p className="text-xs text-muted-foreground">Password must be at least 6 characters</p>
            )}
          </div>

          <Button 
            type="submit" 
            size="lg"
            className="w-full transition-all duration-200" 
            data-testid="button-submit"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending 
              ? (isRegister ? "Creating account..." : "Logging in...") 
              : (isRegister ? "Create Account" : "Log In")}
          </Button>
        </form>

        <div className="mt-8 space-y-3">
          <div className="text-center text-sm">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-primary hover:underline"
              data-testid="button-toggle-mode"
            >
              {isRegister ? "Already have an account? Log in" : "Don't have an account? Sign up"}
            </button>
          </div>
          
          {!isRegister && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center">
              <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-2">
                Demo Account
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Username: <span className="font-mono font-semibold">demo</span>
                <br />
                Password: <span className="font-mono font-semibold">demo123</span>
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
