import DiagnosticTestCard from '../DiagnosticTestCard';

export default function DiagnosticTestCardExample() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      <DiagnosticTestCard
        testNumber={1}
        title="Foundation Assessment"
        description="Evaluate your understanding of core mathematical concepts and identify your baseline knowledge level."
        questionCount={30}
        timeEstimate="45 min"
        status="not_started"
        onStart={() => console.log('Start test 1')}
      />
      <DiagnosticTestCard
        testNumber={2}
        title="Intermediate Skills"
        description="Test your proficiency in advanced topics and problem-solving strategies."
        questionCount={35}
        timeEstimate="50 min"
        status="in_progress"
        progress={65}
        onContinue={() => console.log('Continue test 2')}
      />
      <DiagnosticTestCard
        testNumber={3}
        title="Advanced Mastery"
        description="Challenge yourself with complex problems requiring deep conceptual understanding."
        questionCount={40}
        timeEstimate="60 min"
        status="completed"
        score={87}
        onRetake={() => console.log('Retake test 3')}
      />
    </div>
  );
}
