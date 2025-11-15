import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface SubjectMastery {
  subject: string;
  mastery: number;
  hasData: boolean;
  totalAttempts: number;
}

// Assign color based on mastery level
function getMasteryColor(mastery: number): string {
  if (mastery >= 70) return "text-green-500";
  if (mastery >= 50) return "text-blue-500";
  if (mastery >= 30) return "text-orange-500";
  return "text-red-500";
}

export default function AdaptivePractice() {
  const [, setLocation] = useLocation();

  // Fetch subject-level mastery data from backend
  const { data, isLoading } = useQuery<{ subjectMastery: SubjectMastery[] }>({
    queryKey: ["/api/analytics/subject-mastery"],
  });

  const handleGeneratePractice = (subject: string) => {
    setLocation("/practice");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center py-12">
            <p className="text-muted-foreground" data-testid="text-loading">Loading your performance data...</p>
          </div>
        </div>
      </div>
    );
  }

  const subjects = data?.subjectMastery || [];

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Adaptive Practice Generator</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Select a subject to generate a personalized practice set based on your performance
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subjects.map((subject) => {
            const color = subject.hasData ? getMasteryColor(subject.mastery) : "text-muted-foreground";
            
            return (
              <Card 
                key={subject.subject} 
                className="shadow-md border-card-border transition-all duration-200 hover-elevate"
                data-testid={`card-subject-${subject.subject.toLowerCase().replace(/\s+/g, "-").replace(/&/g, "and")}`}
              >
                <div className="h-2 bg-gradient-to-r from-blue-400 to-cyan-400"></div>
                <div className="p-8 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="space-y-3">
                    <h2 className="text-3xl font-bold tracking-tight" data-testid={`text-subject-${subject.subject.toLowerCase().replace(/\s+/g, "-").replace(/&/g, "and")}`}>
                      {subject.subject}
                    </h2>
                    {subject.hasData ? (
                      <p className={`text-2xl font-semibold ${color}`} data-testid={`text-mastery-${subject.subject.toLowerCase().replace(/\s+/g, "-").replace(/&/g, "and")}`}>
                        {subject.mastery}% Mastery
                      </p>
                    ) : (
                      <p className="text-lg text-muted-foreground" data-testid={`text-no-data-${subject.subject.toLowerCase().replace(/\s+/g, "-").replace(/&/g, "and")}`}>
                        No practice data yet
                      </p>
                    )}
                  </div>
                  <Button 
                    size="lg" 
                    onClick={() => handleGeneratePractice(subject.subject)}
                    className="transition-all duration-200"
                    data-testid={`button-generate-${subject.subject.toLowerCase().replace(/\s+/g, "-").replace(/&/g, "and")}`}
                  >
                    Generate Practice Set
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
