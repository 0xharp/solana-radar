'use client';

import { Button } from '@/components/ui/button';

export const TIME_FILTERS = [
  { label: '24h', hours: 24 },
  { label: '7d', hours: 168 },
  { label: '14d', hours: 336 },
  { label: '30d', hours: 720 },
  { label: 'All', hours: 0 },
];

interface TimeFilterProps {
  value: number;
  onChange: (hours: number) => void;
}

export function TimeFilter({ value, onChange }: TimeFilterProps) {
  return (
    <div className="flex items-center gap-1">
      {TIME_FILTERS.map(tf => (
        <Button
          key={tf.label}
          variant={value === tf.hours ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(tf.hours)}
          className="text-xs"
        >
          {tf.label}
        </Button>
      ))}
    </div>
  );
}
