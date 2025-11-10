import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Briefcase, Clock, Target } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function Practice() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: string]: number}>({});
  const [testType, setTestType] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(1500);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Get sessionId from URL if exists
  const urlParams = new URLSearchParams(window.location.search);
  const urlSessionId = urlParams.get("sessionId");

  const { data: sessionData, isLoading: sessionLoading, isError: sessionError, error: sessionFetchError } = useQuery({
    queryKey: ['/api/practice-sessions', urlSessionId],
    enabled: !!urlSessionId,
    queryFn: async () => {
      console.log(`[Practice] Fetching session for sessionId: ${urlSessionId}`);
      const res = await fetch(`/api/practice-sessions/${urlSessionId}`, {
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[Practice] Failed to fetch session. Status: ${res.status}, Error: ${errorText}`);
        throw new Error(`Failed to fetch session: ${res.status} ${errorText}`);
      }
      
      const data = await res.json();
      console.log(`[Practice] Successfully fetched session with ${data.questions?.length || 0} questions`);
      return data;
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const createSessionMutation = useMutation({
    mutationFn: async (selectedTestType: string) => {
      console.log(`[Practice] Creating session for testType: ${selectedTestType}`);
      const res = await fetch("/api/practice-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ testType: selectedTestType }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[Practice] Failed to create session. Status: ${res.status}, Error: ${errorText}`);
        throw new Error(`Failed to create session: ${res.status}`);
      }
      
      const data = await res.json();
      console.log(`[Practice] Successfully created session with ${data.questions?.length || 0} questions`);
      return data;
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to create practice session. Please check your authentication and try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const sessionId = urlSessionId || createSessionMutation.data?.session?.id;
  const rawQuestions = sessionData?.questions || createSessionMutation.data?.questions || [];
  const questions = rawQuestions.map((q: any) => ({
    ...q,
    questionText: q.question,
    answers: [q.optionA, q.optionB, q.optionC, q.optionD],
  }));
  const totalQuestions = questions.length;
  const progress = totalQuestions > 0 ? ((currentQuestion + 1) / totalQuestions) * 100 : 0;

  const submitSessionMutation = useMutation({
    mutationFn: async (answers: {[key: string]: number}) => {
      const res = await fetch(`/api/practice-sessions/${sessionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      return res.json();
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
    } else {
      toast({
        title: "No answers provided",
        description: "Please answer at least one question before submitting.",
        variant: "destructive",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // If no session ID in URL and no test type selected, show test type selection
  if (!urlSessionId && !testType) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="w-full max-w-2xl p-12">
          <div className="text-center mb-8">
            <Target className="h-16 w-16 mx-auto mb-4 text-primary" />
            <h1 className="text-4xl font-bold mb-4" data-testid="text-select-test">Start Practice Session</h1>
            <p className="text-muted-foreground text-lg">
              Choose which exam you're preparing for.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card 
              className="p-8 hover-elevate cursor-pointer transition-all"
              onClick={() => {
                setTestType("DECA");
                createSessionMutation.mutate("DECA");
              }}
              data-testid="card-test-deca"
            >
              <h2 className="text-3xl font-bold mb-4 text-primary">DECA</h2>
              <p className="text-muted-foreground mb-4">
                Practice for DECA competitions
              </p>
              <ul className="space-y-2 text-sm">
                <li>• 25 questions</li>
                <li>• Targeted practice</li>
                <li>• Real-time feedback</li>
              </ul>
            </Card>

            <Card 
              className="p-8 hover-elevate cursor-pointer transition-all"
              onClick={() => {
                setTestType("FBLA");
                createSessionMutation.mutate("FBLA");
              }}
              data-testid="card-test-fbla"
            >
              <h2 className="text-3xl font-bold mb-4 text-primary">FBLA</h2>
              <p className="text-muted-foreground mb-4">
                Practice for FBLA competitions
              </p>
              <ul className="space-y-2 text-sm">
                <li>• 25 questions</li>
                <li>• Targeted practice</li>
                <li>• Real-time feedback</li>
              </ul>
            </Card>
          </div>

          {createSessionMutation.isPending && (
            <div className="mt-6 text-center">
              <p className="text-muted-foreground">Creating practice session...</p>
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (createSessionMutation.isPending || sessionLoading || !sessionId) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8">
            <Skeleton className="h-64 w-full" />
            <p className="text-center text-sm text-muted-foreground mt-4">Loading your practice session...</p>
          </Card>
        </div>
      </div>
    );
  }

  if (sessionError || createSessionMutation.isError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="p-8 text-center max-w-md">
          <div className="text-destructive mb-4">
            <svg className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Failed to Load Practice Session</h2>
          <p className="text-muted-foreground mb-4">
            {sessionFetchError?.message || createSessionMutation.error?.message || "Unable to load practice session. Please check your authentication and try again."}
          </p>
          <div className="space-y-2">
            <Button 
              onClick={() => window.location.reload()} 
              data-testid="button-retry"
              className="w-full"
            >
              Retry
            </Button>
            <Button 
              variant="outline"
              onClick={() => setLocation("/dashboard")} 
              data-testid="button-back-to-dashboard"
              className="w-full"
            >
              Return to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (totalQuestions === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="p-8 text-center">
          <p className="text-lg font-medium mb-4">No questions available</p>
          <p className="text-sm text-muted-foreground mb-4">
            We couldn't find any questions for this practice session. Please try again or contact support.
          </p>
          <Button onClick={() => setLocation("/dashboard")} data-testid="button-back-to-dashboard">
            Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const currentSelectedAnswer = currentQ ? selectedAnswers[currentQ.id] : undefined;

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
            <Briefcase className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-test-title">
              Practice Session
            </h1>
          </div>
          <Badge className="text-lg bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300" data-testid="text-timer">
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
          <p className="text-sm text-muted-foreground">
            Question {currentQuestion + 1} of {totalQuestions}
          </p>
        </div>

        <Card className="p-8 mb-6">
          <h2 className="text-xl font-semibold mb-6" data-testid="text-question">
            {currentQ.questionText}
          </h2>
          
          <div className="space-y-3">
            {currentQ.answers.map((answer: string, index: number) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                  currentSelectedAnswer === index
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50 hover-elevate"
                }`}
                data-testid={`button-answer-${index}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    currentSelectedAnswer === index ? "border-primary bg-primary" : "border-border"
                  }`}>
                    {currentSelectedAnswer === index && (
                      <div className="w-3 h-3 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="text-base">{answer}</span>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            data-testid="button-previous"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex gap-3">
            {currentQuestion < totalQuestions - 1 ? (
              <Button onClick={handleNext} data-testid="button-next">
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={submitSessionMutation.isPending}
                data-testid="button-submit"
              >
                {submitSessionMutation.isPending ? "Submitting..." : "Submit Practice"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
