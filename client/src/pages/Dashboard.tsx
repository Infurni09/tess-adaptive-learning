import Header from "@/components/Header";
import MetricCard from "@/components/MetricCard";
import DiagnosticTestCard from "@/components/DiagnosticTestCard";
import TopicPill from "@/components/TopicPill";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Target, TrendingUp, Zap, ArrowRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/analytics/stats"],
  });

  const { data: testsData, isLoading: testsLoading } = useQuery({
    queryKey: ["/api/diagnostic-tests"],
  });

  const { data: topicsData, isLoading: topicsLoading } = useQuery({
    queryKey: ["/api/analytics/topics"],
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/auth/logout", {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/");
    },
  });

  const startDiagnosticMutation = useMutation({
    mutationFn: async (testNumber: number) => {
      return await apiRequest("/api/diagnostic-tests", {
        method: "POST",
        body: JSON.stringify({ testNumber }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diagnostic-tests"] });
      setLocation("/practice");
    },
  });

  if (userLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header isAuthenticated={false} onLogout={() => {}} />
        <main className="pt-24 pb-12">
          <div className="container mx-auto px-4">
            <Skeleton className="h-12 w-64 mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const user = userData?.user;
  const stats = statsData?.stats || {};
  const tests = testsData?.tests || [];
  const topics = topicsData?.performance || [];

  const performanceData = [
    { date: "Mon", score: 65 },
    { date: "Tue", score: 72 },
    { date: "Wed", score: 78 },
    { date: "Thu", score: 75 },
    { date: "Fri", score: 82 },
    { date: "Sat", score: 85 },
    { date: "Sun", score: stats.accuracyRate || 0 },
  ];

  const weakestTopic = topics.length > 0 
    ? (topics.find(t => t.averageScore < 70) || topics[0])
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Header 
        isAuthenticated={true} 
        userName={user?.username || "Student"} 
        onLogout={() => logoutMutation.mutate()} 
      />
      
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.username}!</h1>
            <p className="text-muted-foreground">Here's your learning progress overview</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Questions Answered"
              value={stats.totalQuestions || 0}
              icon={CheckCircle2}
            />
            <MetricCard
              title="Accuracy Rate"
              value={`${stats.accuracyRate || 0}%`}
              icon={Target}
            />
            <MetricCard
              title="Topics Mastered"
              value={stats.topicsMastered || 0}
              icon={TrendingUp}
            />
            <MetricCard
              title="Study Streak"
              value={`${stats.studyStreak || 0} days`}
              icon={Zap}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Performance Trend</h2>
                  <Button variant="ghost" size="sm">7 Days</Button>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Daily Recommendation</h2>
              <div className="space-y-4">
                <div className="p-4 bg-primary/5 rounded-lg">
                  {weakestTopic ? (
                    <>
                      <p className="text-sm font-medium mb-1">Focus Area</p>
                      <p className="font-semibold text-lg">{weakestTopic.topic}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Current score: {weakestTopic.averageScore}%
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium mb-1">Get Started</p>
                      <p className="font-semibold text-lg">Begin Your Learning Journey</p>
                      <p className="text-sm text-muted-foreground mt-1">Start practicing to build your profile</p>
                    </>
                  )}
                </div>
                <Button 
                  className="w-full" 
                  data-testid="button-start-practice"
                  onClick={() => setLocation("/practice")}
                >
                  Start Practice
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Diagnostic Tests</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2, 3].map((testNum) => {
                const test = tests.find((t: any) => t.testNumber === testNum);
                const titles = [
                  "Foundation Assessment",
                  "Intermediate Skills",
                  "Advanced Mastery"
                ];
                const descriptions = [
                  "Evaluate your understanding of core DECA concepts.",
                  "Test your proficiency in advanced topics.",
                  "Challenge yourself with complex problems."
                ];
                
                return (
                  <DiagnosticTestCard
                    key={testNum}
                    testNumber={testNum}
                    title={titles[testNum - 1]}
                    description={descriptions[testNum - 1]}
                    questionCount={30}
                    timeEstimate="45 min"
                    status={test?.status || "not_started"}
                    score={test?.score}
                    onStart={() => startDiagnosticMutation.mutate(testNum)}
                    onRetake={() => startDiagnosticMutation.mutate(testNum)}
                  />
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Topic Performance</h2>
              <Button 
                variant="ghost" 
                data-testid="button-view-all"
                onClick={() => setLocation("/analytics")}
              >
                View All
              </Button>
            </div>
            {topics.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topics.slice(0, 6).map((topic: any, index: number) => (
                  <TopicPill
                    key={index}
                    name={topic.topic}
                    score={topic.averageScore}
                    questionsAnswered={topic.totalAttempted}
                    onClick={() => setLocation(`/practice?topic=${encodeURIComponent(topic.topic)}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No practice data yet</p>
                <Button onClick={() => setLocation("/practice")}>
                  Start Practicing
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
