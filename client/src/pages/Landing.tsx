import { Link, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Skeleton className="h-96 w-full max-w-2xl" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <Card className="shadow-md border-card-border transition-all duration-200 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-blue-400 to-cyan-400"></div>
          <div className="p-12">
            <div className="flex flex-col items-center mb-8">
              <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-5xl font-bold text-center tracking-tight" data-testid="text-heading">
                Welcome to TESS
              </h1>
              <p className="text-muted-foreground text-lg mt-2">Targeted Educational Support System</p>
            </div>
          
            <div className="space-y-6 mb-12">
              <div className="flex items-center gap-4" data-testid="checklist-item-1">
                <Check className="h-6 w-6 text-green-600 flex-shrink-0" />
                <span className="text-lg font-medium">100-Question Diagnostic Tests</span>
              </div>
              <div className="flex items-center gap-4" data-testid="checklist-item-2">
                <Check className="h-6 w-6 text-green-600 flex-shrink-0" />
                <span className="text-lg font-medium">Adaptive Practice Sessions</span>
              </div>
              <div className="flex items-center gap-4" data-testid="checklist-item-3">
                <Check className="h-6 w-6 text-green-600 flex-shrink-0" />
                <span className="text-lg font-medium">Detailed Performance Analytics</span>
              </div>
              <div className="flex items-center gap-4" data-testid="checklist-item-4">
                <Check className="h-6 w-6 text-green-600 flex-shrink-0" />
                <span className="text-lg font-medium">DECA & FBLA Exam Preparation</span>
              </div>
            </div>

            <div className="flex justify-center">
              <Link href="/login">
                <Button size="lg" className="transition-all duration-200" data-testid="button-start-now">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
