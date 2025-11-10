import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Briefcase, Clock, Target, BookOpen, ChevronRight, Sparkles } from "lucide-react";
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
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(1500);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Get sessionId from URL if exists
  const urlParams = new URLSearchParams(window.location.search);
  const urlSessionId = urlParams.get("sessionId");

  // Fetch available subjects when event type is selected
  const { data: subjectsData, isLoading: subjectsLoading } = useQuery<{ subjects: Array<{ subject: string; count: number }> }>({
    queryKey: ['/api/subjects', testType],
    enabled: !!testType && !urlSessionId && !selectedSubject,
    queryFn: async () => {
      const res = await fetch(`/api/subjects?testType=${testType}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch subjects");
      return res.json();
    },
  });

  // Fetch subtopics when subject is selected
  const { data: subtopicsData, isLoading: subtopicsLoading } = useQuery<{ subtopics: Array<{ subtopic: string; subject: string; count: number }> }>({
    queryKey: ['/api/subtopics', testType, selectedSubject],
    enabled: !!testType && !!selectedSubject && !urlSessionId,
    queryFn: async () => {
      const res = await fetch(`/api/subtopics?testType=${testType}&subject=${selectedSubject}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch subtopics");
      return res.json();
    },
  });

  const { data: sessionData, isLoading: sessionLoading, isError: sessionError, error: sessionFetchError } = useQuery({
    queryKey: ['/api/practice-sessions', urlSessionId],
    enabled: !!urlSessionId,
    queryFn: async () => {
      const res = await fetch(`/api/practice-sessions/${urlSessionId}`, {
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch session: ${res.status} ${errorText}`);
      }
      
      return res.json();
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const createSessionMutation = useMutation({
    mutationFn: async ({ testType: selectedTestType, topicFilter, practiceType }: { testType: string; topicFilter?: string; practiceType?: string }) => {
      const res = await fetch("/api/practice-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          testType: selectedTestType,
          topicFilter: topicFilter || undefined,
          practiceType: practiceType || undefined
        }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to create session: ${res.status}`);
      }
      
      return res.json();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to create practice session. Please try selecting a different topic.",
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

  const formatSubtopicName = (subtopic: string) => {
    const parts = subtopic.split("-");
    if (parts.length >= 3) {
      return parts.slice(2).join(" - ");
    }
    return subtopic;
  };

  // Step 1: Event Selection (DECA or FBLA)
  if (!urlSessionId && !testType) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="w-full max-w-2xl p-12">
          <div className="text-center mb-8">
            <Target className="h-16 w-16 mx-auto mb-4 text-primary" />
            <h1 className="text-4xl font-bold mb-4" data-testid="text-select-event">Select Your Event</h1>
            <p className="text-muted-foreground text-lg">
              Choose which exam you're preparing for.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card 
              className="p-8 hover-elevate cursor-pointer transition-all"
              onClick={() => setTestType("DECA")}
              data-testid="card-select-deca"
            >
              <h2 className="text-3xl font-bold mb-4 text-primary">DECA</h2>
              <p className="text-muted-foreground mb-4">
                Practice for DECA competitions
              </p>
              <ul className="space-y-2 text-sm">
                <li>• Choose by subject</li>
                <li>• Pick specific topics</li>
                <li>• 25 targeted questions</li>
              </ul>
            </Card>

            <Card 
              className="p-8 hover-elevate cursor-pointer transition-all"
              onClick={() => setTestType("FBLA")}
              data-testid="card-select-fbla"
            >
              <h2 className="text-3xl font-bold mb-4 text-primary">FBLA</h2>
              <p className="text-muted-foreground mb-4">
                Practice for FBLA competitions
              </p>
              <ul className="space-y-2 text-sm">
                <li>• Choose by subject</li>
                <li>• Pick specific topics</li>
                <li>• 25 targeted questions</li>
              </ul>
            </Card>
          </div>
        </Card>
      </div>
    );
  }

  // Step 2: Subject Selection
  if (testType && !selectedSubject && !urlSessionId && !createSessionMutation.data) {
    if (subjectsLoading) {
      return (
        <div className="min-h-screen p-8">
          <div className="max-w-6xl mx-auto">
            <Card className="p-8">
              <Skeleton className="h-64 w-full" />
              <p className="text-center text-sm text-muted-foreground mt-4">Loading subjects...</p>
            </Card>
          </div>
        </div>
      );
    }

    const subjects = subjectsData?.subjects || [];

    return (
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <Button 
              variant="outline" 
              onClick={() => setTestType(null)}
              className="mb-4"
              data-testid="button-back-to-events"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Event Selection
            </Button>
            
            <div className="flex items-center gap-4 mb-6">
              <BookOpen className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-3xl font-bold" data-testid="text-select-subject">
                  Choose a Subject
                </h1>
                <p className="text-muted-foreground">
                  {testType} - Practice by subject or use adaptive learning
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card
                className="p-6 hover-elevate cursor-pointer transition-all border-2 border-primary/20"
                onClick={() => createSessionMutation.mutate({ testType, practiceType: 'event' })}
                data-testid="button-practice-all-event"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">Practice All {testType}</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Random questions from all subjects
                    </p>
                    <Badge variant="secondary">Event-Level Practice</Badge>
                  </div>
                </div>
              </Card>

              <Card
                className="p-6 hover-elevate cursor-pointer transition-all border-2 border-primary/20"
                onClick={() => createSessionMutation.mutate({ testType })}
                data-testid="button-adaptive-practice"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">Adaptive Practice</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      ML-powered questions targeting your weak areas
                    </p>
                    <Badge variant="secondary">Personalized</Badge>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {subjects.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No subjects found for {testType}.</p>
            </Card>
          ) : (
            <div>
              <h2 className="text-xl font-semibold mb-4">Or choose a subject:</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map((subject, index) => (
                  <Card
                    key={subject.subject}
                    className="p-6 hover-elevate transition-all"
                    data-testid={`card-subject-${index}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold flex-1">{subject.subject}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {subject.count} questions
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={() => createSessionMutation.mutate({ testType, topicFilter: subject.subject })}
                        data-testid={`button-practice-subject-${index}`}
                      >
                        Practice All
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => setSelectedSubject(subject.subject)}
                        data-testid={`button-view-topics-${index}`}
                      >
                        View Topics
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Step 3: Subtopic Selection
  if (testType && selectedSubject && !urlSessionId && !createSessionMutation.data) {
    if (subtopicsLoading) {
      return (
        <div className="min-h-screen p-8">
          <div className="max-w-6xl mx-auto">
            <Card className="p-8">
              <Skeleton className="h-64 w-full" />
              <p className="text-center text-sm text-muted-foreground mt-4">Loading topics...</p>
            </Card>
          </div>
        </div>
      );
    }

    const subtopics = subtopicsData?.subtopics || [];

    return (
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <Button 
              variant="outline" 
              onClick={() => setSelectedSubject(null)}
              className="mb-4"
              data-testid="button-back-to-subjects"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Subjects
            </Button>
            
            <div className="flex items-center gap-4 mb-4">
              <BookOpen className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-3xl font-bold" data-testid="text-select-topic">
                  {selectedSubject} Topics
                </h1>
                <p className="text-muted-foreground">
                  {testType} - Choose a specific topic to practice
                </p>
              </div>
            </div>
          </div>

          {subtopics.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No topics found for {selectedSubject}.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subtopics.map((item, index) => (
                <Card
                  key={item.subtopic}
                  className="p-5 hover-elevate cursor-pointer transition-all"
                  onClick={() => createSessionMutation.mutate({ 
                    testType, 
                    topicFilter: item.subtopic 
                  })}
                  data-testid={`card-subtopic-${index}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-medium text-sm flex-1">
                      {formatSubtopicName(item.subtopic)}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {item.count}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      createSessionMutation.mutate({ 
                        testType, 
                        topicFilter: item.subtopic 
                      });
                    }}
                  >
                    <Target className="h-3 w-3 mr-2" />
                    Practice
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Loading state
  if (createSessionMutation.isPending || sessionLoading || !sessionId) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8">
            <Skeleton className="h-64 w-full" />
            <p className="text-center text-sm text-muted-foreground mt-4">
              Creating your practice session...
            </p>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
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
            {sessionFetchError?.message || createSessionMutation.error?.message || "Unable to load practice session."}
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

  // No questions available
  if (totalQuestions === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="p-8 text-center">
          <p className="text-lg font-medium mb-4">No questions available</p>
          <p className="text-sm text-muted-foreground mb-4">
            We couldn't find any questions for this practice session. Please try a different selection.
          </p>
          <Button onClick={() => setLocation("/practice")} data-testid="button-back-to-practice">
            Back to Practice Selection
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
            <Button className="mt-4" onClick={() => setLocation("/practice")} data-testid="button-back-to-practice">
              Back to Practice Selection
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // Step 4: Practice Session (Question Display)
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
            Question {currentQuestion + 1} of {totalQuestions} • {Object.keys(selectedAnswers).length} answered
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

        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            data-testid="button-previous"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="text-sm text-muted-foreground" data-testid="text-answered-count">
            {Object.keys(selectedAnswers).length} / {totalQuestions} answered
          </div>

          {currentQuestion < totalQuestions - 1 ? (
            <Button
              onClick={handleNext}
              data-testid="button-next"
            >
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
  );
}
