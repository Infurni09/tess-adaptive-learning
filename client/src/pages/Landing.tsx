import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <Card className="p-12">
          <h1 className="text-5xl font-bold text-center mb-12" data-testid="text-heading">
            Start Diagnostic
          </h1>
          
          <div className="space-y-6 mb-12">
            <div className="flex items-center gap-4" data-testid="checklist-item-1">
              <Check className="h-6 w-6 text-success flex-shrink-0" />
              <span className="text-lg">100-Question Baseline Exam</span>
            </div>
            <div className="flex items-center gap-4" data-testid="checklist-item-2">
              <Check className="h-6 w-6 text-success flex-shrink-0" />
              <span className="text-lg">Built-in Timer</span>
            </div>
            <div className="flex items-center gap-4" data-testid="checklist-item-3">
              <Check className="h-6 w-6 text-success flex-shrink-0" />
              <span className="text-lg">Get Your Results Back Right Away</span>
            </div>
          </div>

          <div className="flex justify-center">
            <Link href="/practice">
              <Button size="lg" className="px-12" data-testid="button-start-now">
                Start Now
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
