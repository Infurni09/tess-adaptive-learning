import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  Radar, Legend, ScatterChart, Scatter
} from "recharts";
import { TrendingUp, TrendingDown, Brain, Zap, Target, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

type SubjectMastery = {
  subject: string;
  mastery: number;
  hasData: boolean;
  totalAttempts: number;
};

type TopicPerformance = {
  topic: string;
  averageScore: number;
  totalAttempted: number;
  totalCorrect: number;
};

type DiagnosticAnalytics = {
  completedTests: number;
  averageScore: number;
  bestScore: number;
  worstScore: number;
  improvementTrend: number;
};

export default function Reports() {
  const [selectedTest, setSelectedTest] = useState<"FBLA" | "DECA">("DECA");

  // Fetch all data in parallel
  const { data: topicPerf, isLoading: topicLoading } = useQuery<{ performance: TopicPerformance[] }>({
    queryKey: ['/api/analytics/topics'],
  });

  const { data: subjectMastery, isLoading: masteryLoading } = useQuery<{ subjectMastery: SubjectMastery[] }>({
    queryKey: ['/api/analytics/subject-mastery', { testType: selectedTest }],
  });

  const { data: diagnostics, isLoading: diagnosticsLoading } = useQuery<DiagnosticAnalytics>({
    queryKey: ['/api/analytics/diagnostics', { type: selectedTest }],
  });

  const { data: abilityData, isLoading: abilityLoading } = useQuery({
    queryKey: ['/api/ml/ability', selectedTest],
    retry: false,
  });

  const { data: masteredTopics, isLoading: masteredLoading } = useQuery<{ masteredTopics: string[]; count: number }>({
    queryKey: ['/api/ml/mastered-topics'],
    retry: false,
  });

  const { data: engagementData, isLoading: engagementLoading } = useQuery({
    queryKey: ['/api/ml/engagement'],
    retry: false,
  });

  const filteredPerformance = topicPerf?.performance?.filter(p => 
    p.topic.startsWith(selectedTest + "-")
  ) || [];

  const formatSubtopic = (topic: string) => {
    const parts = topic.split("-");
    if (parts.length >= 3) {
      return parts.slice(1).join(" - ");
    }
    return topic;
  };

  const topicData = filteredPerformance
    .map(p => ({
      topic: formatSubtopic(p.topic),
      score: p.averageScore,
      attempts: p.totalAttempted,
      correct: p.totalCorrect,
    }))
    .sort((a, b) => b.score - a.score);

  const radarData = topicData.slice(0, 8).map(p => ({
    name: p.topic.length > 15 ? p.topic.substring(0, 12) + "..." : p.topic,
    score: p.score,
    fullMark: 100,
  }));

  const chartData = topicData.slice(0, 10).map(p => ({
    name: p.topic.length > 12 ? p.topic.substring(0, 10) + "..." : p.topic,
    score: p.score,
  }));

  const strengthsWeaknesses = {
    strengths: topicData.filter(t => t.score >= 75).slice(0, 5),
    weaknesses: topicData.filter(t => t.score < 60).slice(0, 5),
  };

  const abilityLevel = (abilityData as any)?.ability ?? 0;
  const abilityInterpretation = abilityLevel > 1 ? "Advanced" : abilityLevel > 0 ? "Intermediate" : "Developing";

  const isLoading = topicLoading || masteryLoading || diagnosticsLoading || abilityLoading || masteredLoading || engagementLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-12 w-48 mb-8" />
          <div className="grid gap-4 mb-8">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 dark:from-slate-950 dark:to-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-2" data-testid="text-reports-heading">
            <Brain className="w-8 h-8 text-blue-600" />
            Comprehensive Learning Report
          </h1>
          <p className="text-muted-foreground text-lg">AI-powered analytics combining ML models with performance data</p>
        </div>

        {/* Test Type Selection */}
        <div className="flex gap-3">
          <Button
            variant={selectedTest === "FBLA" ? "default" : "outline"}
            size="lg"
            onClick={() => setSelectedTest("FBLA")}
            data-testid="button-report-fbla"
          >
            FBLA
          </Button>
          <Button
            variant={selectedTest === "DECA" ? "default" : "outline"}
            size="lg"
            onClick={() => setSelectedTest("DECA")}
            data-testid="button-report-deca"
          >
            DECA
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Overall Mastery */}
          <Card className="p-6 hover-elevate" data-testid="card-overall-mastery">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-muted-foreground text-sm">Overall Mastery</p>
                <h3 className="text-3xl font-bold">
                  {subjectMastery?.subjectMastery
                    ? Math.round(
                        subjectMastery.subjectMastery.reduce((sum, s) => sum + s.mastery, 0) /
                        subjectMastery.subjectMastery.length
                      )
                    : 0}%
                </h3>
              </div>
              <Target className="w-8 h-8 text-green-600" />
            </div>
            <Progress
              value={
                subjectMastery?.subjectMastery
                  ? Math.round(
                      subjectMastery.subjectMastery.reduce((sum, s) => sum + s.mastery, 0) /
                      subjectMastery.subjectMastery.length
                    )
                  : 0
              }
              className="h-2"
            />
          </Card>

          {/* AI Ability Estimate */}
          <Card className="p-6 hover-elevate" data-testid="card-ability-estimate">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-muted-foreground text-sm">IRT Ability (θ)</p>
                <h3 className="text-3xl font-bold">{abilityLevel.toFixed(2)}</h3>
                <p className="text-xs text-muted-foreground mt-1">{abilityInterpretation}</p>
              </div>
              <Brain className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-xs text-muted-foreground">ML-estimated ability level</p>
          </Card>

          {/* Mastered Topics */}
          <Card className="p-6 hover-elevate" data-testid="card-mastered-topics">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-muted-foreground text-sm">Mastered Topics</p>
                <h3 className="text-3xl font-bold">{masteredTopics?.count || 0}</h3>
              </div>
              <CheckCircle2 className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-xs text-muted-foreground">P(Knowledge) ≥ 0.95</p>
          </Card>

          {/* Engagement Score */}
          <Card className="p-6 hover-elevate" data-testid="card-engagement-score">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-muted-foreground text-sm">Engagement</p>
                <h3 className="text-3xl font-bold">{(engagementData as any)?.engagementScore || 0}/100</h3>
                <Badge 
                  variant={(engagementData as any)?.riskLevel === "High" ? "destructive" : (engagementData as any)?.riskLevel === "Medium" ? "secondary" : "default"}
                  className="mt-2"
                >
                  {(engagementData as any)?.riskLevel || "Unknown"} Risk
                </Badge>
              </div>
              <Zap className="w-8 h-8 text-orange-600" />
            </div>
          </Card>
        </div>

        {/* Main Analytics Tabs */}
        <Tabs defaultValue="performance" className="w-full" data-testid="tabs-reports">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="ml-insights">ML Insights</TabsTrigger>
            <TabsTrigger value="diagnostic">Diagnostics</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
          </TabsList>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Topic Performance Chart */}
              <Card className="p-6 lg:col-span-2" data-testid="card-topic-performance">
                <h3 className="text-xl font-bold mb-6">Topic Performance (Top 10)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="score" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Summary Stats */}
              <Card className="p-6" data-testid="card-summary-stats">
                <h3 className="text-lg font-bold mb-6">Summary</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Topics Practiced</p>
                    <p className="text-2xl font-bold">{topicData.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Average Score</p>
                    <p className="text-2xl font-bold">
                      {topicData.length > 0 
                        ? Math.round(topicData.reduce((sum, t) => sum + t.score, 0) / topicData.length)
                        : 0}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Attempts</p>
                    <p className="text-2xl font-bold">
                      {topicData.reduce((sum, t) => sum + t.attempts, 0)}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Radar Chart */}
            <Card className="p-6" data-testid="card-radar-chart">
              <h3 className="text-xl font-bold mb-6">Overall Topic Strengths</h3>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </Card>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6" data-testid="card-strengths">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Top Strengths
                </h3>
                <div className="space-y-3">
                  {strengthsWeaknesses.strengths.map((topic, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <span className="font-medium text-sm">{topic.topic}</span>
                      <Badge variant="outline" className="bg-green-100 dark:bg-green-900">
                        {topic.score}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6" data-testid="card-weaknesses">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  Areas to Improve
                </h3>
                <div className="space-y-3">
                  {strengthsWeaknesses.weaknesses.map((topic, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                      <span className="font-medium text-sm">{topic.topic}</span>
                      <Badge variant="destructive" className="bg-red-200 dark:bg-red-900">
                        {topic.score}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* ML Insights Tab */}
          <TabsContent value="ml-insights" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* BKT Knowledge State */}
              <Card className="p-6" data-testid="card-bkt-insights">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-blue-600" />
                  Bayesian Knowledge Tracing (BKT)
                </h3>
                <div className="space-y-4 text-sm">
                  <p className="text-muted-foreground">
                    BKT models your knowledge as a hidden Markov process. We track the probability that you truly understand each topic vs guessing correctly.
                  </p>
                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-2">Key Parameters:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• P(L): Initial knowledge probability</li>
                      <li>• P(T): Learning probability per attempt</li>
                      <li>• P(G): Guessing probability</li>
                      <li>• P(S): Slip probability</li>
                    </ul>
                  </div>
                  <Badge variant="outline" className="w-full justify-center">
                    📊 Trained on {diagnostics?.completedTests || 0} tests
                  </Badge>
                </div>
              </Card>

              {/* IRT Model */}
              <Card className="p-6" data-testid="card-irt-insights">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  Item Response Theory (IRT)
                </h3>
                <div className="space-y-4 text-sm">
                  <p className="text-muted-foreground">
                    IRT calibrates each question's difficulty and your latent ability (θ). Optimal questions are those most informative at your ability level.
                  </p>
                  <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-2">Your Ability: {abilityLevel.toFixed(2)}</p>
                    <Progress value={(abilityLevel + 3) * 16.67} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">Range: -3 (Beginner) to +3 (Expert)</p>
                  </div>
                  <Badge variant="outline" className="w-full justify-center">
                    📈 Predicted accuracy: {(50 + abilityLevel * 15).toFixed(0)}%
                  </Badge>
                </div>
              </Card>

              {/* Learning Curves */}
              <Card className="p-6" data-testid="card-learning-curves">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Learning Curves (Power Law)
                </h3>
                <div className="space-y-4 text-sm">
                  <p className="text-muted-foreground">
                    Learning follows a power law: Performance = A - B × N^(-α). We fit this curve to predict future performance and optimal practice.
                  </p>
                  <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                    <p className="text-xs text-muted-foreground">Model tracks:</p>
                    <ul className="space-y-1 text-xs mt-2">
                      <li>• Trial-by-trial accuracy progression</li>
                      <li>• Learning rate (α parameter)</li>
                      <li>• Asymptotic performance ceiling</li>
                      <li>• Practice efficiency</li>
                    </ul>
                  </div>
                  <Badge variant="outline" className="w-full justify-center">
                    📊 {topicData.length} topics tracked
                  </Badge>
                </div>
              </Card>

              {/* Engagement & Churn */}
              <Card className="p-6" data-testid="card-engagement-insights">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  Engagement & Churn Risk
                </h3>
                <div className="space-y-4 text-sm">
                  <p className="text-muted-foreground">
                    We predict dropout risk using session frequency, time spent, performance trends, and streak consistency.
                  </p>
                  <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg">
                    <p className="text-lg font-bold">{((engagementData as any)?.churnRisk ?? 0).toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">Current churn risk</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Status: <span className="font-semibold">{(engagementData as any)?.riskLevel}</span>
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* ML Model Status */}
            <Card className="p-6" data-testid="card-model-status">
              <h3 className="text-lg font-bold mb-4">Advanced ML Models Status</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: "BKT", status: "Trained", icon: "🧠" },
                  { name: "IRT", status: "Calibrated", icon: "🎯" },
                  { name: "Learning Curves", status: "Fitted", icon: "📈" },
                  { name: "Thompson Sampling", status: "Active", icon: "🎲" },
                ].map((model, i) => (
                  <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
                    <p className="text-2xl mb-2">{model.icon}</p>
                    <p className="font-semibold text-sm">{model.name}</p>
                    <Badge variant="outline" className="mt-2 text-xs">{model.status}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Diagnostics Tab */}
          <TabsContent value="diagnostic" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6" data-testid="card-diagnostic-stats">
                <h3 className="text-lg font-bold mb-6">Diagnostic Test Statistics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded">
                    <span className="text-sm font-medium">Tests Completed</span>
                    <span className="text-2xl font-bold">{diagnostics?.completedTests || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded">
                    <span className="text-sm font-medium">Average Score</span>
                    <span className="text-2xl font-bold">{diagnostics?.averageScore?.toFixed(0) || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950 rounded">
                    <span className="text-sm font-medium">Best Score</span>
                    <span className="text-2xl font-bold text-green-600">{diagnostics?.bestScore || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950 rounded">
                    <span className="text-sm font-medium">Lowest Score</span>
                    <span className="text-2xl font-bold text-red-600">{diagnostics?.worstScore || 0}%</span>
                  </div>
                  {diagnostics?.improvementTrend && (
                    <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950 rounded">
                      <span className="text-sm font-medium">Improvement Trend</span>
                      <div className="flex items-center gap-1">
                        <TrendingUp className={diagnostics.improvementTrend > 0 ? "w-5 h-5 text-green-600" : "w-5 h-5 text-red-600"} />
                        <span className="text-lg font-bold">{diagnostics.improvementTrend > 0 ? "+" : ""}{diagnostics.improvementTrend.toFixed(1)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-6" data-testid="card-recommendations">
                <h3 className="text-lg font-bold mb-6">Personalized Recommendations</h3>
                <div className="space-y-3">
                  {strengthsWeaknesses.weaknesses.length > 0 && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <p className="text-sm font-semibold mb-2">🎯 Focus Areas</p>
                      <p className="text-xs text-muted-foreground">
                        Prioritize practice on: {strengthsWeaknesses.weaknesses.map(w => w.topic).join(", ")}
                      </p>
                    </div>
                  )}
                  {(engagementData as any)?.riskLevel === "High" && (
                    <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                      <p className="text-sm font-semibold mb-2">⚡ Engagement Alert</p>
                      <p className="text-xs text-muted-foreground">
                        Consider shorter, more frequent practice sessions to maintain momentum
                      </p>
                    </div>
                  )}
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <p className="text-sm font-semibold mb-2">✨ Next Steps</p>
                    <p className="text-xs text-muted-foreground">
                      You've mastered {masteredTopics?.count || 0} topics. Continue adaptive practice to improve weaker areas.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Subjects Tab */}
          <TabsContent value="subjects" className="space-y-6">
            <Card className="p-6" data-testid="card-subject-breakdown">
              <h3 className="text-lg font-bold mb-6">Subject Mastery Breakdown</h3>
              <div className="space-y-4">
                {subjectMastery?.subjectMastery?.map((subject, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{subject.subject}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{subject.mastery}%</span>
                        {subject.hasData ? (
                          <Badge variant="outline" className="text-xs">{subject.totalAttempts} attempts</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">No data</Badge>
                        )}
                      </div>
                    </div>
                    <Progress value={subject.mastery} className="h-3" />
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer Notes */}
        <Card className="p-6 bg-slate-50 dark:bg-slate-800" data-testid="card-footer-notes">
          <h3 className="text-sm font-bold mb-3">📊 Report Information</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• BKT (Bayesian Knowledge Tracing): Probabilistic model tracking P(Know) for each skill</li>
            <li>• IRT (Item Response Theory): Psychometric calibration of questions and your latent ability (θ)</li>
            <li>• Learning Curves: Power law models tracking improvement trajectory over practice trials</li>
            <li>• Engagement Score: 0-100 health metric based on activity, performance, and consistency</li>
            <li>• Churn Risk: Predicted probability of disengagement (0-1 scale)</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
