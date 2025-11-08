import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface QuestionCardProps {
  questionNumber: number;
  totalQuestions: number;
  topic: string;
  question: string;
  options: string[];
  selectedAnswer?: number;
  onAnswerSelect?: (optionIndex: number) => void;
  showFeedback?: boolean;
  correctAnswer?: number;
  explanation?: string;
}

export default function QuestionCard({
  questionNumber,
  totalQuestions,
  topic,
  question,
  options,
  selectedAnswer,
  onAnswerSelect,
  showFeedback = false,
  correctAnswer,
  explanation,
}: QuestionCardProps) {
  const [localSelected, setLocalSelected] = useState<number | undefined>(selectedAnswer);

  const handleSelect = (value: string) => {
    const index = parseInt(value);
    setLocalSelected(index);
    onAnswerSelect?.(index);
  };

  const getOptionClassName = (index: number) => {
    if (!showFeedback) return "";
    if (index === correctAnswer) return "border-green-600 bg-green-50 dark:bg-green-950";
    if (index === localSelected && index !== correctAnswer) return "border-red-600 bg-red-50 dark:bg-red-950";
    return "";
  };

  return (
    <Card className="p-8 max-w-3xl mx-auto" data-testid="card-question">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Badge variant="secondary" data-testid="text-question-number">
            Question {questionNumber} of {totalQuestions}
          </Badge>
          <Badge data-testid="text-topic">{topic}</Badge>
        </div>
        <h2 className="text-xl font-semibold leading-relaxed" data-testid="text-question">
          {question}
        </h2>
      </div>

      <RadioGroup
        value={localSelected?.toString()}
        onValueChange={handleSelect}
        className="space-y-4"
      >
        {options.map((option, index) => (
          <div
            key={index}
            className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-all hover-elevate cursor-pointer ${getOptionClassName(index)}`}
            data-testid={`option-${index}`}
          >
            <RadioGroupItem value={index.toString()} id={`option-${index}`} className="mt-0.5" />
            <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer text-base leading-relaxed">
              {option}
            </Label>
          </div>
        ))}
      </RadioGroup>

      {showFeedback && explanation && (
        <div className="mt-6 p-4 rounded-lg bg-muted" data-testid="text-explanation">
          <p className="text-sm font-medium mb-2">Explanation:</p>
          <p className="text-sm text-muted-foreground">{explanation}</p>
        </div>
      )}
    </Card>
  );
}
