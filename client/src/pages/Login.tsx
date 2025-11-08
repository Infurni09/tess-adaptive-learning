import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [username, setUsername] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (username: string) => {
      const response = await apiRequest("POST", "/api/auth/login", { username });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Welcome!",
        description: "Successfully logged in",
      });
      setLocation("/dashboard");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to log in. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      loginMutation.mutate(username);
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

          <Button 
            type="submit" 
            size="lg"
            className="w-full transition-all duration-200" 
            data-testid="button-submit"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Logging in..." : "Log In"}
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          New here? Just enter a username to get started!
        </div>
      </Card>
    </div>
  );
}
