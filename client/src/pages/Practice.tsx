import { useState } from "react";
import QuestionCard from "@/components/QuestionCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Link } from "wouter";

export default function Practice() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: number]: number}>({});

  const questions = [
    {
      topic: "Algebra",
      question: "What is the value of x in the equation 2x + 5 = 13?",
      options: ["x = 3", "x = 4", "x = 5", "x = 6"],
      correctAnswer: 1,
      explanation: "To solve 2x + 5 = 13, subtract 5 from both sides to get 2x = 8, then divide both sides by 2 to get x = 4."
    },
    {
      topic: "Geometry",
      question: "What is the area of a circle with radius 5?",
      options: ["25π", "10π", "5π", "15π"],
      correctAnswer: 0,
      explanation: "The area of a circle is πr². With r = 5, the area is π(5)² = 25π."
    },
    {
      topic: "Calculus",
      question: "What is the derivative of x² + 3x?",
      options: ["2x + 3", "x + 3", "2x", "x²"],
      correctAnswer: 0,
      explanation: "The derivative of x² is 2x, and the derivative of 3x is 3. Therefore, the derivative of x² + 3x is 2x + 3."
    },
  ];

  const totalQuestions = questions.length;
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;

  const handleNext = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestion]: answerIndex
    });
  };

  const handleSubmit = () => {
    console.log('Submit practice session', selectedAnswers);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" data-testid="button-exit">
                <X className="h-4 w-4 mr-2" />
                Exit Practice
              </Button>
            </Link>
            <div className="text-sm font-medium" data-testid="text-progress">
              Question {currentQuestion + 1} of {totalQuestions}
            </div>
          </div>
        </div>
        <Progress value={progress} className="h-2 rounded-none" />
      </header>

      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <QuestionCard
            questionNumber={currentQuestion + 1}
            totalQuestions={totalQuestions}
            topic={questions[currentQuestion].topic}
            question={questions[currentQuestion].question}
            options={questions[currentQuestion].options}
            selectedAnswer={selectedAnswers[currentQuestion]}
            onAnswerSelect={handleAnswerSelect}
          />

          <div className="flex items-center justify-between mt-8 max-w-3xl mx-auto">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              data-testid="button-previous"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentQuestion === totalQuestions - 1 ? (
              <Button
                onClick={handleSubmit}
                disabled={!selectedAnswers[currentQuestion]}
                data-testid="button-submit"
              >
                Submit Practice
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!selectedAnswers[currentQuestion]}
                data-testid="button-next"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
