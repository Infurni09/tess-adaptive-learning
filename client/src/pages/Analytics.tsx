import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { TrendingUp, TrendingDown, Target } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

type TopicPerformance = {
  topic: string;
  averageScore: number;
  totalAttempted: number;
  totalCorrect: number;
};

export default function Analytics() {
  const [selectedTest, setSelectedTest] = useState<"FBLA" | "DECA">("DECA");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: performance, isLoading } = useQuery<{ performance: TopicPerformance[] }>({
    queryKey: ['/api/analytics/topics'],
  });

  const createPracticeSession = useMutation({
    mutationFn: async (topicFilter: string) => {
      const response = await fetch(`/api/practice-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ topicFilter, testType: selectedTest }),
      });
      if (!response.ok) throw new Error("Failed to create practice session");
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/practice-sessions'] });
      setLocation(`/practice?sessionId=${data.session.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create practice session",
        variant: "destructive",
      });
    },
  });

  // Filter subtopics by selected test type
  const filteredPerformance = performance?.performance?.filter(p => 
    p.topic.startsWith(selectedTest + "-")
  ) || [];

  // Format subtopic names for display (remove EVENT- prefix for cleaner display)
  const formatSubtopic = (topic: string) => {
    const parts = topic.split("-");
    if (parts.length >= 3) {
      return parts.slice(1).join(" - ");
    }
    return topic;
  };

  const topicPerformance = filteredPerformance
    .map(p => ({
      topic: formatSubtopic(p.topic),
      fullTopic: p.topic,
      score: p.averageScore,
    }))
    .sort((a, b) => b.score - a.score);

  const radarData = topicPerformance.slice(0, 6).map(p => ({
    subject: p.topic,
    score: p.score,
    fullMark: 100,
  }));

  const strengthsAndWeaknesses = {
    strengths: topicPerformance
      .filter(p => p.score >= 70)
      .slice(0, 5),
    weaknesses: topicPerformance
      .filter(p => p.score < 70)
      .slice(0, 5),
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-heading">Performance Analytics</h1>
          <p className="text-muted-foreground">Detailed insights into your learning progress by subtopic</p>
        </div>

        <div className="mb-8 flex gap-4">
          <Button
            variant={selectedTest === "FBLA" ? "default" : "outline"}
            size="lg"
            onClick={() => setSelectedTest("FBLA")}
            className="transition-all duration-200"
            data-testid="button-test-fbla"
          >
            FBLA
          </Button>
          <Button
            variant={selectedTest === "DECA" ? "default" : "outline"}
            size="lg"
            onClick={() => setSelectedTest("DECA")}
            className="transition-all duration-200"
            data-testid="button-test-deca"
          >
            DECA
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : topicPerformance.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No performance data yet. Complete some practice sessions or diagnostic tests to see your analytics.</p>
          </Card>
        ) : (
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-6">Subtopic Mastery Overview</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid className="stroke-muted" />
                    <PolarAngleAxis dataKey="subject" className="text-xs" />
                    <PolarRadiusAxis className="text-xs" />
                    <Radar 
                      name="Score" 
                      dataKey="score" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary))" 
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-6">Performance by Subtopic</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topicPerformance.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="topic" className="text-xs" angle={-45} textAnchor="end" height={100} />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="score" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <h2 className="text-xl font-semibold">Top Strengths</h2>
                </div>
                {strengthsAndWeaknesses.strengths.length === 0 ? (
                  <p className="text-muted-foreground">No strengths yet. Complete more practice to see your strong areas.</p>
                ) : (
                  <div className="space-y-4">
                    {strengthsAndWeaknesses.strengths.map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{item.topic}</span>
                          <span className="text-sm font-semibold text-green-600">{item.score}%</span>
                        </div>
                        <Progress value={item.score} className="h-2" />
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingDown className="h-5 w-5 text-orange-600" />
                  <h2 className="text-xl font-semibold">Areas for Improvement</h2>
                </div>
                {strengthsAndWeaknesses.weaknesses.length === 0 ? (
                  <p className="text-muted-foreground">Great job! All subtopics are above 70%.</p>
                ) : (
                  <div className="space-y-4">
                    {strengthsAndWeaknesses.weaknesses.map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{item.topic}</span>
                          <span className="text-sm font-semibold text-orange-600">{item.score}%</span>
                        </div>
                        <Progress value={item.score} className="h-2" />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => createPracticeSession.mutate(item.fullTopic)}
                          disabled={createPracticeSession.isPending}
                          className="w-full gap-2"
                          data-testid={`button-practice-weak-${index}`}
                        >
                          <Target className="h-4 w-4" />
                          Practice This Subtopic
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">All Subtopics ({topicPerformance.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topicPerformance.map((item, index) => (
                  <Card key={index} className="p-4 hover-elevate">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-sm flex-1">{item.topic}</h3>
                      <Badge variant={item.score >= 70 ? "secondary" : "destructive"}>
                        {item.score}%
                      </Badge>
                    </div>
                    <Progress value={item.score} className="h-2 mb-2" />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => createPracticeSession.mutate(item.fullTopic)}
                      disabled={createPracticeSession.isPending}
                      className="w-full gap-2"
                      data-testid={`button-practice-all-${index}`}
                    >
                      <Target className="h-4 w-4" />
                      Practice
                    </Button>
                  </Card>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
