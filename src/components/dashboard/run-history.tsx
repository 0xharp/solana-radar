'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils/date';
import { History, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface RunHistoryProps {
  runs: Array<{
    id: string;
    started_at: string;
    completed_at: string | null;
    status: string;
    signals_collected: number;
    sources_queried: string[];
  }>;
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  completed: { icon: CheckCircle, color: 'text-green-600', variant: 'default' },
  running: { icon: Loader2, color: 'text-yellow-600', variant: 'secondary' },
  failed: { icon: XCircle, color: 'text-red-600', variant: 'destructive' },
};

export function RunHistory({ runs }: RunHistoryProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
          <History className="h-4 w-4" />
          Collection Runs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-[11px] text-muted-foreground mb-2">
          Each run <strong>appends</strong> new signals and generates new narratives. Previous data is preserved for trend analysis.
        </p>
        {runs.length === 0 && (
          <p className="text-sm text-muted-foreground">No runs yet</p>
        )}
        {runs.map(run => {
          const config = STATUS_CONFIG[run.status] || STATUS_CONFIG.failed;
          const Icon = config.icon;
          return (
            <div key={run.id} className="flex items-center justify-between text-xs border-b border-border pb-1.5 last:border-0">
              <div className="flex items-center gap-1.5">
                <Icon className={`h-3 w-3 ${config.color} ${run.status === 'running' ? 'animate-spin' : ''}`} />
                <span>{formatRelativeTime(run.started_at)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">{run.signals_collected} signals</span>
                <Badge variant={config.variant} className="text-[9px] py-0">{run.status}</Badge>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
