import { cn } from '../../lib/utils';

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  color?: 'violet' | 'blue' | 'emerald' | 'amber' | 'rose' | 'cyan';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
}

export function Progress({
  value,
  max = 100,
  className,
  color = 'violet',
  size = 'md',
  showLabel = false,
  animated = false,
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  const colors = {
    violet: 'bg-gradient-to-r from-violet-600 to-violet-400',
    blue: 'bg-gradient-to-r from-blue-600 to-blue-400',
    emerald: 'bg-gradient-to-r from-emerald-600 to-emerald-400',
    amber: 'bg-gradient-to-r from-amber-600 to-amber-400',
    rose: 'bg-gradient-to-r from-rose-600 to-rose-400',
    cyan: 'bg-gradient-to-r from-cyan-600 to-cyan-400',
  };

  const sizes = {
    sm: 'h-1',
    md: 'h-1.5',
    lg: 'h-2.5',
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn('flex-1 bg-gray-800 rounded-full overflow-hidden', sizes[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', colors[color], animated && 'animate-pulse')}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-gray-400 w-9 text-right">{Math.round(pct)}%</span>
      )}
    </div>
  );
}
