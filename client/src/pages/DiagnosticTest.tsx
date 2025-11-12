import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Clipboard, Clock, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function DiagnosticTest() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: string]: number}>({});
  const [testId, setTestId] = useState<string | null>(null);
  const [testType, setTestType] = useState<string | null>(null); // DECA or FBLA - NEVER mix
  const [subject, setSubject] = useState<string | null>(null); // Subject within the event
  const [timeRemaining, setTimeRemaining] = useState(9000); // 150 minutes for 100 questions
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const createTestMutation = useMutation({
    mutationFn: async ({ testType: selectedTestType, subject: selectedSubject }: { testType: string; subject?: string }) => {
      // IMPORTANT: testType separates DECA and FBLA - they NEVER mix
      // subject (optional) filters to specific subject within the event
      const res = await apiRequest("POST", "/api/diagnostic-tests", { 
        testNumber: 1,
        testType: selectedTestType,
        subject: selectedSubject 
      });
      return await res.json();
    },
    onSuccess: (data: any) => {
      setTestId(data.test.id);
      setTestType(data.test.testType);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to create diagnostic test. Please try again.",
        variant: "destructive",
      });
    },
  });

  const { data: questionsData, isLoading: questionsLoading, isError: questionsError, error: questionsFetchError } = useQuery({
    queryKey: ["/api/diagnostic-tests", testId, "questions"],
    enabled: !!testId,
    queryFn: async () => {
      console.log(`[DiagnosticTest] Fetching questions for testId: ${testId}`);
      const res = await fetch(`/api/diagnostic-tests/${testId}/questions`, {
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[DiagnosticTest] Failed to fetch questions. Status: ${res.status}, Error: ${errorText}`);
        throw new Error(`Failed to fetch questions: ${res.status} ${errorText}`);
      }
      
      const data = await res.json();
      console.log(`[DiagnosticTest] Successfully fetched ${data.questions?.length || 0} questions`);
      return data;
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Don't auto-create test - wait for user to select event type

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const rawQuestions = questionsData?.questions || [];
  const questions = rawQuestions.map((q: any) => ({
    ...q,
    questionText: q.question,
    answers: [q.optionA, q.optionB, q.optionC, q.optionD],
  }));
  const totalQuestions = questions.length;
  const progress = totalQuestions > 0 ? ((currentQuestion + 1) / totalQuestions) * 100 : 0;
  const answeredCount = Object.keys(selectedAnswers).length;

  const submitTestMutation = useMutation({
    mutationFn: async (answers: {[key: string]: number}) => {
      const res = await apiRequest("POST", `/api/diagnostic-tests/${testId}/submit`, { answers });
      return await res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Diagnostic Test Complete!",
        description: `You scored ${data.score}%. Your performance has been saved.`,
      });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Submission Error",
        description: "Failed to submit test. Please try again.",
        variant: "destructive",
      });
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
    if (testId && Object.keys(selectedAnswers).length > 0) {
      submitTestMutation.mutate(selectedAnswers);
    } else {
      toast({
        title: "No answers provided",
        description: "Please answer at least one question before submitting.",
        variant: "destructive",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Event selection screen - IMPORTANT: DECA and FBLA NEVER mix
  if (!testType) {
    return (
      <div className="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4" data-testid="text-select-event">Select Your Event</h1>
            <p className="text-muted-foreground text-lg">
              Choose which competition you're preparing for.
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <Card 
              className="p-8 cursor-pointer hover-elevate active-elevate-2 transition-all duration-200 border-2"
              onClick={() => setTestType("DECA")}
              data-testid="button-select-deca"
            >
              <h2 className="text-3xl font-bold text-primary mb-4">DECA</h2>
              <p className="text-muted-foreground mb-4">
                Distributive Education Clubs of America
              </p>
              <ul className="text-sm space-y-2">
                <li>• Finance</li>
                <li>• Marketing</li>
                <li>• Entrepreneurship</li>
                <li>• Business Administration</li>
                <li>• Hospitality & Tourism</li>
              </ul>
            </Card>
            
            <Card 
              className="p-8 cursor-pointer hover-elevate active-elevate-2 transition-all duration-200 border-2"
              onClick={() => setTestType("FBLA")}
              data-testid="button-select-fbla"
            >
              <h2 className="text-3xl font-bold text-primary mb-4">FBLA</h2>
              <p className="text-muted-foreground mb-4">
                Future Business Leaders of America
              </p>
              <ul className="text-sm space-y-2">
                <li>• Business Law</li>
                <li>• Economics</li>
                <li>• Accounting</li>
                <li>• Management</li>
                <li>• Computer Applications</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Fetch available subjects for the selected event type
  const { data: subjectsData, isLoading: subjectsLoading } = useQuery<{ subjects: Array<{ subject: string; count: number }> }>({
    queryKey: ['/api/subjects', testType],
    queryFn: async () => {
      const res = await fetch(`/api/subjects?testType=${testType}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error('Failed to fetch subjects');
      return res.json();
    },
    enabled: !!testType && !testId,
  });

  // Subject selection screen - appears after event selection
  if (testType && !subject && !testId) {
    const availableSubjects = subjectsData?.subjects || [];

    if (subjectsLoading) {
      return (
        <div className="min-h-screen p-8">
          <div className="max-w-4xl mx-auto">
            <Card className="p-8">
              <Skeleton className="h-8 w-64 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-64 w-full" />
              <p className="text-center text-sm text-muted-foreground mt-4">Loading subjects...</p>
            </Card>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTestType(null)}
            className="mb-6"
            data-testid="button-back-to-event"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Event Selection
          </Button>

          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4" data-testid="text-select-subject">
              Select {testType} Subject
            </h1>
            <p className="text-muted-foreground text-lg">
              Choose a specific subject for your diagnostic test, or select "All Subjects" for a comprehensive test.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card
              className="p-6 cursor-pointer hover-elevate active-elevate-2 transition-all duration-200 border-2 border-primary"
              onClick={() => {
                setSubject("all");
                createTestMutation.mutate({ testType, subject: undefined });
              }}
              data-testid="button-select-all-subjects"
            >
              <h3 className="text-xl font-bold text-primary mb-2">All Subjects</h3>
              <p className="text-sm text-muted-foreground">
                Comprehensive test covering all {testType} subjects
              </p>
            </Card>

            {availableSubjects.map((subj) => {
              const hasQuestions = subj.count > 0;
              return (
                <Card
                  key={subj.subject}
                  className={`p-6 transition-all duration-200 border-2 ${
                    hasQuestions
                      ? "cursor-pointer hover-elevate active-elevate-2"
                      : "opacity-50 cursor-not-allowed"
                  }`}
                  onClick={() => {
                    if (hasQuestions) {
                      setSubject(subj.subject);
                      createTestMutation.mutate({ testType, subject: subj.subject });
                    }
                  }}
                  data-testid={`button-select-${subj.subject.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <h3 className={`text-lg font-bold mb-2 ${!hasQuestions && "text-muted-foreground"}`}>
                    {subj.subject}
                  </h3>
                  <Badge 
                    variant={hasQuestions ? "secondary" : "outline"} 
                    className="text-xs"
                  >
                    {subj.count} question{subj.count !== 1 ? 's' : ''}
                    {!hasQuestions && " - Coming Soon"}
                  </Badge>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (createTestMutation.isPending || questionsLoading || !testId) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8">
            <Skeleton className="h-8 w-64 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-8" />
            <Skeleton className="h-64 w-full" />
            <p className="text-center text-sm text-muted-foreground mt-4">Loading your diagnostic test...</p>
          </Card>
        </div>
      </div>
    );
  }

  if (questionsError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="p-8 text-center max-w-md">
          <div className="text-destructive mb-4">
            <svg className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Failed to Load Questions</h2>
          <p className="text-muted-foreground mb-4">
            {questionsFetchError?.message || "Unable to fetch questions. Please check your authentication and try again."}
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
          <p className="text-lg font-medium mb-4">No questions available for {testType}</p>
          <p className="text-sm text-muted-foreground mb-4">
            We couldn't find any questions for this test type. Please try a different test or contact support.
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
            <p className="text-lg text-muted-foreground">Loading question...</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Clipboard className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight" data-testid="text-test-title">
                {testType} {subject && subject !== "all" ? `${subject} ` : ""}Diagnostic Test
              </h1>
              <p className="text-sm text-muted-foreground">
                {subject && subject !== "all" ? `Subject-Specific Assessment` : "100 Questions - Comprehensive Assessment"}
              </p>
            </div>
          </div>
          <Badge className="text-lg px-4 py-2" variant="outline" data-testid="text-timer">
            <Clock className="h-4 w-4 mr-2" />
            {formatTime(timeRemaining)}
          </Badge>
        </div>

        <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-4 mb-2">
            <Progress value={progress} className="flex-1 h-3 transition-all duration-300" />
            <span className="text-base font-semibold min-w-[4rem] text-right" data-testid="text-progress">
              {currentQuestion + 1}/{totalQuestions}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span data-testid="text-answered-count">{answeredCount} answered</span>
            </div>
            <span>{totalQuestions - answeredCount} remaining</span>
          </div>
        </div>

        <Card className="p-8 mb-6 shadow-lg">
          <div className="mb-2">
            <Badge variant="secondary" className="mb-4">
              Question {currentQuestion + 1}
            </Badge>
            {currentQ.topic && (
              <Badge variant="outline" className="mb-4 ml-2">
                {currentQ.topic}
              </Badge>
            )}
          </div>
          
          <h2 className="text-xl font-semibold mb-8 leading-relaxed" data-testid="text-question">
            {currentQ.questionText}
          </h2>

          <div className="space-y-3">
            {currentQ.answers && currentQ.answers.map((answer: string, index: number) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                className={`w-full p-5 text-left rounded-lg border-2 transition-all duration-200 hover-elevate active-elevate-2 ${
                  currentSelectedAnswer === index
                    ? "border-primary bg-primary/10 shadow-md"
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

          <div className="text-center text-sm text-muted-foreground">
            {currentSelectedAnswer !== undefined ? (
              <span className="text-green-600 dark:text-green-400 font-medium">
                ✓ Answer selected
              </span>
            ) : (
              <span>Select an answer to continue</span>
            )}
          </div>

          {currentQuestion === totalQuestions - 1 ? (
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={submitTestMutation.isPending}
              className="transition-all duration-200"
              data-testid="button-submit"
            >
              {submitTestMutation.isPending ? "Submitting..." : "Submit Test"}
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

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Your progress is automatically saved. You can navigate back and forth between questions.</p>
        </div>
      </div>
    </div>
  );
}
