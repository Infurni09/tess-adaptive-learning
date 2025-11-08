import { BarChart as BarChartIcon, AlertCircle, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

const COLORS = ["#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8", "#1e40af"];

export default function Dashboard() {
  const [selectedTest, setSelectedTest] = useState<"FBLA" | "DECA">("DECA");

  const { data: analytics, isLoading } = useQuery<{
    subjects: Array<{ name: string; value: number; total: number; percentage: number }>;
    weakTopics: Array<{ topic: string; subject: string; accuracy: number }>;
    overallScore: number;
    completedTests: number;
  }>({
    queryKey: ['/api/analytics/diagnostics', selectedTest],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/diagnostics?type=${selectedTest}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    },
  });

  // Ensure we have valid data and filter out any NaN values
  const validSubjects = analytics?.subjects?.filter(s => 
    !isNaN(s.value) && !isNaN(s.total) && !isNaN(s.percentage) &&
    isFinite(s.value) && isFinite(s.total) && isFinite(s.percentage)
  ) || [];
  
  const maxValue = validSubjects.length > 0 
    ? Math.max(...validSubjects.map(s => s.total)) + 5 
    : 25;

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <BarChartIcon className="h-10 w-10" />
          <h1 className="text-4xl font-bold tracking-tight" data-testid="text-heading">
            Reports and Analytics Dashboard
          </h1>
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

        <div className="relative p-1 rounded-xl bg-gradient-to-r from-amber-400 via-blue-500 to-blue-600 shadow-lg">
          <Card className="p-8 bg-card border-0">
            <h2 className="text-2xl font-bold mb-8 tracking-tight" data-testid="text-chart-title">
              {selectedTest} Testing Diagnostic
            </h2>
            
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" data-testid="skeleton-loading" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : !analytics || validSubjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 text-center" data-testid="empty-state">
                <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Diagnostic Tests Completed</h3>
                <p className="text-muted-foreground max-w-md">
                  Complete a {selectedTest} diagnostic test to see your performance analytics here.
                </p>
              </div>
            ) : (
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={validSubjects}
                    layout="horizontal"
                    margin={{ top: 20, right: 30, left: 120, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis type="number" domain={[0, maxValue]} />
                    <YAxis type="category" dataKey="name" width={110} />
                    <Bar dataKey="value" label={{ position: "right" }}>
                      {validSubjects.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        {!isLoading && analytics && validSubjects.length > 0 && (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChartIcon className="h-5 w-5" />
                <h3 className="text-xl font-semibold" data-testid="text-stats-title">Overall Statistics</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tests Completed:</span>
                  <span className="text-2xl font-bold" data-testid="text-tests-completed">{analytics.completedTests}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Average Score:</span>
                  <span className="text-2xl font-bold" data-testid="text-average-score">{analytics.overallScore}%</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="h-5 w-5 text-destructive" />
                <h3 className="text-xl font-semibold" data-testid="text-weak-topics-title">Topics Needing Improvement</h3>
              </div>
              {analytics.weakTopics.length === 0 ? (
                <p className="text-muted-foreground" data-testid="text-no-weak-topics">
                  Great job! All topics are above 60% accuracy.
                </p>
              ) : (
                <div className="space-y-3">
                  {analytics.weakTopics.slice(0, 5).map((topic, index) => (
                    <div key={index} className="flex items-center justify-between gap-2" data-testid={`weak-topic-${index}`}>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{topic.topic}</p>
                        <p className="text-xs text-muted-foreground">{topic.subject}</p>
                      </div>
                      <Badge variant="destructive" className="ml-2">
                        {topic.accuracy}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
