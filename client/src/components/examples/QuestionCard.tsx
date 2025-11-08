import QuestionCard from '../QuestionCard';
import { useState } from 'react';

export default function QuestionCardExample() {
  const [selected, setSelected] = useState<number>();

  return (
    <div className="space-y-8 p-6">
      <div>
        <p className="text-sm text-muted-foreground mb-4">Normal State:</p>
        <QuestionCard
          questionNumber={5}
          totalQuestions={30}
          topic="Algebra"
          question="What is the value of x in the equation 2x + 5 = 13?"
          options={[
            "x = 3",
            "x = 4",
            "x = 5",
            "x = 6"
          ]}
          selectedAnswer={selected}
          onAnswerSelect={(index) => {
            setSelected(index);
            console.log('Selected:', index);
          }}
        />
      </div>
      
      <div>
        <p className="text-sm text-muted-foreground mb-4">With Feedback:</p>
        <QuestionCard
          questionNumber={5}
          totalQuestions={30}
          topic="Algebra"
          question="What is the value of x in the equation 2x + 5 = 13?"
          options={[
            "x = 3",
            "x = 4",
            "x = 5",
            "x = 6"
          ]}
          selectedAnswer={1}
          showFeedback={true}
          correctAnswer={1}
          explanation="To solve 2x + 5 = 13, subtract 5 from both sides to get 2x = 8, then divide both sides by 2 to get x = 4."
        />
      </div>
    </div>
  );
}
