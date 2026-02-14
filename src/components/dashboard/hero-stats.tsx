'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Activity, BarChart3, Layers, Clock } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils/date';

interface HeroStatsProps {
  totalSignals: number;
  totalNarratives: number;
  sourceDiversity: number;
  lastCollectionAt: string | null;
}

export function HeroStats({ totalSignals, totalNarratives, sourceDiversity, lastCollectionAt }: HeroStatsProps) {
  const stats = [
    {
      label: 'Signals Detected',
      value: totalSignals,
      icon: Activity,
      color: 'text-chart-1',
    },
    {
      label: 'Active Narratives',
      value: totalNarratives,
      icon: Layers,
      color: 'text-chart-2',
    },
    {
      label: 'Data Sources',
      value: sourceDiversity,
      icon: BarChart3,
      color: 'text-chart-3',
    },
    {
      label: 'Last Updated',
      value: lastCollectionAt ? formatRelativeTime(lastCollectionAt) : 'Never',
      icon: Clock,
      color: 'text-chart-4',
      isText: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map(stat => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <div className={`text-2xl font-bold ${stat.isText ? 'text-sm' : ''}`}>
                {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
