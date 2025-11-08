import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, CheckCircle2, Clock } from "lucide-react";

interface DiagnosticTestCardProps {
  testNumber: number;
  title: string;
  description: string;
  questionCount: number;
  timeEstimate: string;
  status: "not_started" | "in_progress" | "completed";
  progress?: number;
  score?: number;
  onStart?: () => void;
  onContinue?: () => void;
  onRetake?: () => void;
}

export default function DiagnosticTestCard({
  testNumber,
  title,
  description,
  questionCount,
  timeEstimate,
  status,
  progress = 0,
  score,
  onStart,
  onContinue,
  onRetake,
}: DiagnosticTestCardProps) {
  const getStatusBadge = () => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-600 hover:bg-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case "in_progress":
        return <Badge variant="secondary">In Progress</Badge>;
      default:
        return <Badge variant="outline">Not Started</Badge>;
    }
  };

  const getActionButton = () => {
    if (status === "completed") {
      return (
        <div className="flex gap-3">
          <div className="flex-1 text-right">
            <p className="text-sm text-muted-foreground">Your Score</p>
            <p className="text-2xl font-bold text-green-600" data-testid={`score-test-${testNumber}`}>{score}%</p>
          </div>
          <Button onClick={onRetake} variant="outline" data-testid={`button-retake-${testNumber}`}>
            Retake Test
          </Button>
        </div>
      );
    }
    
    if (status === "in_progress") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} />
          <Button onClick={onContinue} className="w-full" data-testid={`button-continue-${testNumber}`}>
            Continue Test
          </Button>
        </div>
      );
    }

    return (
      <Button onClick={onStart} className="w-full" data-testid={`button-start-${testNumber}`}>
        Start Test
      </Button>
    );
  };

  return (
    <Card className="p-6" data-testid={`card-diagnostic-${testNumber}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Diagnostic Test {testNumber}</h3>
            <p className="text-sm text-muted-foreground">{title}</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      <p className="text-sm text-muted-foreground mb-4">{description}</p>

      <div className="flex items-center gap-6 mb-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <ClipboardList className="h-4 w-4" />
          <span>{questionCount} questions</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>{timeEstimate}</span>
        </div>
      </div>

      {getActionButton()}
    </Card>
  );
}
