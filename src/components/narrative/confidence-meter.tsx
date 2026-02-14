'use client';

interface ConfidenceMeterProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export function ConfidenceMeter({ score, size = 'md' }: ConfidenceMeterProps) {
  const clampedScore = Math.min(100, Math.max(0, score));
  const color = clampedScore >= 70 ? 'text-green-600' : clampedScore >= 45 ? 'text-yellow-600' : 'text-red-600';
  const bgColor = clampedScore >= 70 ? 'bg-green-600/20' : clampedScore >= 45 ? 'bg-yellow-600/20' : 'bg-red-600/20';

  const sizeClasses = {
    sm: 'text-xs gap-1.5',
    md: 'text-sm gap-2',
    lg: 'text-base gap-2',
  };

  const barHeight = {
    sm: 'h-1',
    md: 'h-1.5',
    lg: 'h-2',
  };

  return (
    <div className={`flex items-center ${sizeClasses[size]}`}>
      <span className={`font-mono font-bold ${color}`}>{clampedScore.toFixed(0)}</span>
      <div className={`w-16 ${barHeight[size]} rounded-full bg-muted overflow-hidden`}>
        <div
          className={`h-full rounded-full ${bgColor} ${color.replace('text-', 'bg-').replace('/20', '')}`}
          style={{ width: `${clampedScore}%` }}
        />
      </div>
    </div>
  );
}
