import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import { useEffect } from "react";

export default function Login() {
  // Redirect to Replit Auth OAuth flow
  useEffect(() => {
    window.location.href = "/api/login";
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-10 shadow-md border-card-border">
        <div className="flex flex-col items-center">
          <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
            <BookOpen className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Redirecting to Sign In...</h1>
          <p className="text-sm text-muted-foreground text-center">
            You'll be redirected to sign in with Google, GitHub, or email
          </p>
        </div>
      </Card>
    </div>
  );
}
