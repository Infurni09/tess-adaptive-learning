import MetricCard from '../MetricCard';
import { CheckCircle2, Target, TrendingUp, Zap } from 'lucide-react';

export default function MetricCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
      <MetricCard
        title="Questions Answered"
        value={1247}
        icon={CheckCircle2}
        trend={{ value: 12, isPositive: true }}
      />
      <MetricCard
        title="Accuracy Rate"
        value="87%"
        icon={Target}
        trend={{ value: 5, isPositive: true }}
      />
      <MetricCard
        title="Topics Mastered"
        value={23}
        icon={TrendingUp}
        trend={{ value: 3, isPositive: true }}
      />
      <MetricCard
        title="Study Streak"
        value="14 days"
        icon={Zap}
      />
    </div>
  );
}
