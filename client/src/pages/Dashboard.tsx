import { BarChart as BarChartIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { useState } from "react";

const testData = {
  FBLA: [
    { name: "Business Knowledge", value: 8 },
    { name: "Communication", value: 12 },
    { name: "Finance", value: 16 },
    { name: "Marketing", value: 20 },
  ],
  DECA: [
    { name: "Finance", value: 14 },
    { name: "Marketing", value: 18 },
    { name: "Operations", value: 10 },
    { name: "Management", value: 15 },
  ],
};

const COLORS = ["#93c5fd", "#60a5fa", "#3b82f6", "#2563eb"];

export default function Dashboard() {
  const [selectedTest, setSelectedTest] = useState<"FBLA" | "DECA">("FBLA");

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
            
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={testData[selectedTest]}
                  layout="horizontal"
                  margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis type="number" domain={[0, 25]} />
                  <YAxis type="category" dataKey="name" width={90} />
                  <Bar dataKey="value" label={{ position: "right" }}>
                    {testData[selectedTest].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
