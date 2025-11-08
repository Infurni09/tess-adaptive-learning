import { useState, useEffect } from "react";
import QuestionCard from "@/components/QuestionCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Practice() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: string]: number}>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/practice-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
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

  const questions = createSessionMutation.data?.questions || [];
  const totalQuestions = questions.length;
  const progress = totalQuestions > 0 ? ((currentQuestion + 1) / totalQuestions) * 100 : 0;

  const submitSessionMutation = useMutation({
    mutationFn: async (answers: {[key: string]: number}) => {
      return await apiRequest(`/api/practice-sessions/${sessionId}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers }),
        headers: { "Content-Type": "application/json" },
      });
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

  if (createSessionMutation.isPending || !sessionId) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 pt-24">
          <Skeleton className="h-64 w-full max-w-4xl mx-auto" />
        </div>
      </div>
    );
  }

  if (totalQuestions === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button 
              variant="ghost" 
              size="sm" 
              data-testid="button-exit"
              onClick={() => setLocation("/dashboard")}
            >
              <X className="h-4 w-4 mr-2" />
              Exit Practice
            </Button>
            <div className="text-sm font-medium" data-testid="text-progress">
              Question {currentQuestion + 1} of {totalQuestions}
            </div>
          </div>
        </div>
        <Progress value={progress} className="h-2 rounded-none" />
      </header>

      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <QuestionCard
            questionNumber={currentQuestion + 1}
            totalQuestions={totalQuestions}
            topic={currentQ.topic}
            question={currentQ.question}
            options={[currentQ.optionA, currentQ.optionB, currentQ.optionC, currentQ.optionD]}
            selectedAnswer={currentSelectedAnswer}
            onAnswerSelect={handleAnswerSelect}
          />

          <div className="flex items-center justify-between mt-8 max-w-3xl mx-auto">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              data-testid="button-previous"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentQuestion === totalQuestions - 1 ? (
              <Button
                onClick={handleSubmit}
                disabled={currentSelectedAnswer === undefined || submitSessionMutation.isPending}
                data-testid="button-submit"
              >
                {submitSessionMutation.isPending ? "Submitting..." : "Submit Practice"}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={currentSelectedAnswer === undefined}
                data-testid="button-next"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
