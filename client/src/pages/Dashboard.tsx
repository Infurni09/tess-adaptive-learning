import Header from "@/components/Header";
import MetricCard from "@/components/MetricCard";
import DiagnosticTestCard from "@/components/DiagnosticTestCard";
import TopicPill from "@/components/TopicPill";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Target, TrendingUp, Zap, ArrowRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Dashboard() {
  const performanceData = [
    { date: "Mon", score: 65 },
    { date: "Tue", score: 72 },
    { date: "Wed", score: 78 },
    { date: "Thu", score: 75 },
    { date: "Fri", score: 82 },
    { date: "Sat", score: 85 },
    { date: "Sun", score: 87 },
  ];

  const topics = [
    { name: "Algebra", score: 92, questionsAnswered: 45 },
    { name: "Geometry", score: 75, questionsAnswered: 32 },
    { name: "Calculus", score: 58, questionsAnswered: 28 },
    { name: "Statistics", score: 88, questionsAnswered: 40 },
    { name: "Trigonometry", score: 67, questionsAnswered: 35 },
    { name: "Linear Algebra", score: 81, questionsAnswered: 38 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header isAuthenticated={true} userName="John Doe" onLogout={() => console.log('Logout')} />
      
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome back, John! 👋</h1>
            <p className="text-muted-foreground">Here's your learning progress overview</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Questions Answered"
              value={1247}
              icon={CheckCircle2}
              trend={{ value: 12, isPositive: true }}
            />
            <MetricCard
              title="Accuracy Rate"
              value="87%"
              icon={Target}
              trend={{ value: 5, isPositive: true }}
            />
            <MetricCard
              title="Topics Mastered"
              value={23}
              icon={TrendingUp}
              trend={{ value: 3, isPositive: true }}
            />
            <MetricCard
              title="Study Streak"
              value="14 days"
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
                  <p className="text-sm font-medium mb-1">Focus Area</p>
                  <p className="font-semibold text-lg">Calculus</p>
                  <p className="text-sm text-muted-foreground mt-1">20 questions available</p>
                </div>
                <Button className="w-full" data-testid="button-start-practice">
                  Start Practice
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Diagnostic Tests</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DiagnosticTestCard
                testNumber={1}
                title="Foundation Assessment"
                description="Evaluate your understanding of core mathematical concepts."
                questionCount={30}
                timeEstimate="45 min"
                status="completed"
                score={87}
                onRetake={() => console.log('Retake test 1')}
              />
              <DiagnosticTestCard
                testNumber={2}
                title="Intermediate Skills"
                description="Test your proficiency in advanced topics."
                questionCount={35}
                timeEstimate="50 min"
                status="in_progress"
                progress={65}
                onContinue={() => console.log('Continue test 2')}
              />
              <DiagnosticTestCard
                testNumber={3}
                title="Advanced Mastery"
                description="Challenge yourself with complex problems."
                questionCount={40}
                timeEstimate="60 min"
                status="not_started"
                onStart={() => console.log('Start test 3')}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Topic Performance</h2>
              <Button variant="ghost" data-testid="button-view-all">View All</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topics.map((topic, index) => (
                <TopicPill
                  key={index}
                  name={topic.name}
                  score={topic.score}
                  questionsAnswered={topic.questionsAnswered}
                  onClick={() => console.log(`${topic.name} clicked`)}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
