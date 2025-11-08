import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";

const subjects = [
  { name: "Finance", mastery: 42, color: "text-orange-500" },
  { name: "Marketing", mastery: 26, color: "text-red-500" },
  { name: "Business Administration", mastery: 58, color: "text-blue-500" },
  { name: "Hospitality", mastery: 34, color: "text-purple-500" },
];

export default function AdaptivePractice() {
  const [, setLocation] = useLocation();

  const handleGeneratePractice = (subject: string) => {
    setLocation("/practice");
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {subjects.map((subject) => (
            <Card 
              key={subject.name} 
              className="shadow-md border-card-border transition-all duration-200 hover-elevate"
              data-testid={`card-subject-${subject.name.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="h-2 bg-gradient-to-r from-blue-400 to-cyan-400"></div>
              <div className="p-10 flex flex-col items-center justify-center text-center space-y-8">
                <div className="space-y-4">
                  <h2 className="text-4xl font-bold tracking-tight" data-testid={`text-subject-${subject.name.toLowerCase().replace(/\s+/g, "-")}`}>
                    {subject.name}
                  </h2>
                  <p className={`text-3xl font-semibold ${subject.color}`} data-testid={`text-mastery-${subject.name.toLowerCase().replace(/\s+/g, "-")}`}>
                    {subject.mastery}% Mastery
                  </p>
                </div>
                <Button 
                  size="lg" 
                  onClick={() => handleGeneratePractice(subject.name)}
                  className="transition-all duration-200"
                  data-testid={`button-generate-${subject.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  Generate Practice Set
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
