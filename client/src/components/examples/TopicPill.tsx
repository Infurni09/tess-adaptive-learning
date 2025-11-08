import TopicPill from '../TopicPill';

export default function TopicPillExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
      <TopicPill
        name="Algebra"
        score={92}
        questionsAnswered={45}
        onClick={() => console.log('Algebra clicked')}
      />
      <TopicPill
        name="Geometry"
        score={75}
        questionsAnswered={32}
        onClick={() => console.log('Geometry clicked')}
      />
      <TopicPill
        name="Calculus"
        score={58}
        questionsAnswered={28}
        onClick={() => console.log('Calculus clicked')}
      />
      <TopicPill
        name="Statistics"
        score={88}
        questionsAnswered={40}
        onClick={() => console.log('Statistics clicked')}
      />
      <TopicPill
        name="Trigonometry"
        score={67}
        questionsAnswered={35}
        onClick={() => console.log('Trigonometry clicked')}
      />
      <TopicPill
        name="Linear Algebra"
        score={81}
        questionsAnswered={38}
        onClick={() => console.log('Linear Algebra clicked')}
      />
    </div>
  );
}
