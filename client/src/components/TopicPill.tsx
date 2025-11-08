import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface TopicPillProps {
  name: string;
  score: number;
  questionsAnswered: number;
  onClick?: () => void;
}

export default function TopicPill({ name, score, questionsAnswered, onClick }: TopicPillProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div 
      className="p-4 rounded-lg border hover-elevate active-elevate-2 cursor-pointer transition-all"
      onClick={onClick}
      data-testid={`topic-${name.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-sm">{name}</h4>
        <Badge variant="secondary" className="text-xs">
          {questionsAnswered} questions
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        <Progress value={score} className="flex-1" />
        <span className={`text-sm font-semibold ${getScoreColor(score)}`} data-testid={`score-${name.toLowerCase().replace(/\s+/g, '-')}`}>
          {score}%
        </span>
      </div>
    </div>
  );
}
