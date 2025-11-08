import Header from "@/components/Header";
import TopicPill from "@/components/TopicPill";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function Analytics() {
  const topicPerformance = [
    { topic: "Algebra", score: 92 },
    { topic: "Geometry", score: 75 },
    { topic: "Calculus", score: 58 },
    { topic: "Statistics", score: 88 },
    { topic: "Trigonometry", score: 67 },
    { topic: "Linear Algebra", score: 81 },
  ];

  const radarData = [
    { subject: "Algebra", score: 92, fullMark: 100 },
    { subject: "Geometry", score: 75, fullMark: 100 },
    { subject: "Calculus", score: 58, fullMark: 100 },
    { subject: "Statistics", score: 88, fullMark: 100 },
    { subject: "Trigonometry", score: 67, fullMark: 100 },
    { subject: "Linear Algebra", score: 81, fullMark: 100 },
  ];

  const strengthsAndWeaknesses = {
    strengths: [
      { name: "Algebra", score: 92, improvement: 5 },
      { name: "Statistics", score: 88, improvement: 8 },
      { name: "Linear Algebra", score: 81, improvement: 3 },
    ],
    weaknesses: [
      { name: "Calculus", score: 58, improvement: -2 },
      { name: "Trigonometry", score: 67, improvement: 2 },
      { name: "Geometry", score: 75, improvement: 4 },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <Header isAuthenticated={true} userName="John Doe" onLogout={() => console.log('Logout')} />
      
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Performance Analytics</h1>
            <p className="text-muted-foreground">Detailed insights into your learning progress</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">Topic Mastery Overview</h2>
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
              <h2 className="text-xl font-semibold mb-6">Performance by Topic</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topicPerformance}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="topic" className="text-xs" angle={-45} textAnchor="end" height={80} />
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
              <div className="space-y-4">
                {strengthsAndWeaknesses.strengths.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300">
                          +{item.improvement}%
                        </Badge>
                        <span className="text-sm font-semibold text-green-600">{item.score}%</span>
                      </div>
                    </div>
                    <Progress value={item.score} className="h-2" />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="h-5 w-5 text-orange-600" />
                <h2 className="text-xl font-semibold">Areas for Improvement</h2>
              </div>
              <div className="space-y-4">
                {strengthsAndWeaknesses.weaknesses.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={item.improvement > 0 ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"}>
                          {item.improvement > 0 ? '+' : ''}{item.improvement}%
                        </Badge>
                        <span className="text-sm font-semibold text-orange-600">{item.score}%</span>
                      </div>
                    </div>
                    <Progress value={item.score} className="h-2" />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">All Topics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topicPerformance.map((topic, index) => (
                <TopicPill
                  key={index}
                  name={topic.topic}
                  score={topic.score}
                  questionsAnswered={Math.floor(Math.random() * 50) + 20}
                  onClick={() => console.log(`${topic.topic} clicked`)}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
