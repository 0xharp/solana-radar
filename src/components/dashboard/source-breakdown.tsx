'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SignalRow } from '@/types/database';

const SOURCE_COLORS: Record<string, string> = {
  github: 'bg-chart-1',
  onchain: 'bg-chart-2',
  defi: 'bg-chart-3',
  market: 'bg-chart-4',
  twitter: 'bg-blue-500',
  reddit: 'bg-orange-500',
  rss: 'bg-chart-5',
  social: 'bg-chart-5',
};

const SOURCE_LABELS: Record<string, string> = {
  github: 'GitHub',
  onchain: 'On-chain (Helius)',
  defi: 'DeFi (DeFiLlama)',
  market: 'Market (CoinGecko)',
  twitter: 'Twitter / X',
  reddit: 'Reddit',
  rss: 'RSS / News',
  social: 'Social',
};

interface SourceBreakdownProps {
  signals: SignalRow[];
}

export function SourceBreakdown({ signals }: SourceBreakdownProps) {
  const counts: Record<string, number> = {};
  for (const s of signals) {
    counts[s.source] = (counts[s.source] || 0) + 1;
  }

  const total = signals.length || 1;
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Signal Sources
          <span className="text-xs font-normal text-muted-foreground ml-1.5">
            ({entries.length} active)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground">No signals collected yet</p>
        )}
        {entries.map(([source, count]) => {
          const pct = (count / total) * 100;
          return (
            <div key={source} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{SOURCE_LABELS[source] || source}</span>
                <span className="text-muted-foreground">{count} ({pct.toFixed(0)}%)</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${SOURCE_COLORS[source] || 'bg-primary'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
