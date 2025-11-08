import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Briefcase, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function Practice() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: string]: number}>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(1500);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/practice-sessions");
      return await res.json();
    },
    onSuccess: (data: any) => {
      setSessionId(data.session.id);
    },
  });

  useEffect(() => {
    if (!sessionId) {
      createSessionMutation.mutate();
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const rawQuestions = createSessionMutation.data?.questions || [];
  // Convert question format from optionA/B/C/D to answers array
  const questions = rawQuestions.map((q: any) => ({
    ...q,
    questionText: q.question,
    answers: [q.optionA, q.optionB, q.optionC, q.optionD],
  }));
  const totalQuestions = questions.length;
  const progress = totalQuestions > 0 ? ((currentQuestion + 1) / totalQuestions) * 100 : 0;

  const submitSessionMutation = useMutation({
    mutationFn: async (answers: {[key: string]: number}) => {
      const res = await apiRequest("POST", `/api/practice-sessions/${sessionId}/submit`, { answers });
      return await res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Practice Complete!",
        description: `You scored ${data.score}%`,
      });
      setLocation("/dashboard");
    },
  });

  const handleNext = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (questions[currentQuestion]) {
      setSelectedAnswers({
        ...selectedAnswers,
        [questions[currentQuestion].id]: answerIndex
      });
    }
  };

  const handleSubmit = () => {
    if (sessionId && Object.keys(selectedAnswers).length > 0) {
      submitSessionMutation.mutate(selectedAnswers);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (createSessionMutation.isPending || !sessionId) {
    return (
      <div className="min-h-screen p-8">
        <Skeleton className="h-64 w-full max-w-4xl mx-auto" />
      </div>
    );
  }

  if (totalQuestions === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="p-8 text-center">
          <p className="text-lg font-medium mb-4">No questions available</p>
          <Button onClick={() => setLocation("/dashboard")}>
            Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const currentSelectedAnswer = currentQ ? selectedAnswers[currentQ.id] : undefined;

  if (createSessionMutation.isLoading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8">
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </Card>
        </div>
      </div>
    );
  }

  if (!currentQ) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center">
            <p className="text-lg text-muted-foreground">No questions available. Please try again.</p>
            <Button className="mt-4" onClick={() => setLocation("/dashboard")} data-testid="button-back-to-dashboard">
              Back to Dashboard
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Briefcase className="h-8 w-8" />
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-test-title">
              DECA Testing Diagnostic
            </h1>
          </div>
          <Badge className="text-lg bg-success/10 text-success border-success/20" data-testid="text-timer">
            <Clock className="h-4 w-4 mr-2" />
            {formatTime(timeRemaining)}
          </Badge>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <Progress value={progress} className="flex-1 h-3 transition-all duration-300" />
            <span className="text-lg font-semibold min-w-[4rem] text-right" data-testid="text-progress">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        <Card className="p-8 mb-8 shadow-md border-card-border transition-all duration-200">
          <h2 className="text-xl font-semibold mb-8 leading-relaxed" data-testid="text-question">
            {currentQuestion + 1}. {currentQ.questionText}
          </h2>

          <div className="space-y-4">
            {currentQ.answers && currentQ.answers.map((answer: string, index: number) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                className={`w-full p-5 text-left rounded-lg border-2 transition-all duration-200 hover-elevate active-elevate-2 ${
                  currentSelectedAnswer === index
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border bg-card shadow-sm"
                }`}
                data-testid={`button-answer-${index}`}
              >
                <span className="font-semibold mr-3 text-base">
                  {String.fromCharCode(65 + index)}.
                </span>
                <span className="text-base">{answer}</span>
              </button>
            ))}
          </div>
        </Card>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="lg"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="transition-all duration-200"
            data-testid="button-previous"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentQuestion === totalQuestions - 1 ? (
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={Object.keys(selectedAnswers).length === 0}
              className="transition-all duration-200"
              data-testid="button-submit"
            >
              Submit Test
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleNext}
              className="transition-all duration-200"
              data-testid="button-next"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
