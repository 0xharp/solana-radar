'use client';

import { useState } from 'react';
import { useSignals } from '@/hooks/use-signals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TimeFilter } from '@/components/shared/time-filter';
import { formatRelativeTime } from '@/lib/utils/date';
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

const SOURCES = ['all', 'github', 'onchain', 'defi', 'market', 'twitter', 'reddit', 'rss'];

const SOURCE_LABELS: Record<string, string> = {
  all: 'All',
  github: 'GitHub',
  onchain: 'On-chain',
  defi: 'DeFi',
  market: 'Market',
  twitter: 'X / Twitter',
  reddit: 'Reddit',
  rss: 'RSS / News',
};
const STRENGTHS = ['all', 'extreme', 'strong', 'medium', 'weak'];

const STRENGTH_COLORS: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  extreme: 'destructive',
  strong: 'default',
  medium: 'secondary',
  weak: 'outline',
};

export default function SignalsPage() {
  const [source, setSource] = useState('all');
  const [strength, setStrength] = useState('all');
  const [timeFilter, setTimeFilter] = useState(336);
  const [page, setPage] = useState(1);

  const { signals, total, loading } = useSignals({
    source: source === 'all' ? undefined : source,
    strength: strength === 'all' ? undefined : strength,
    hours: timeFilter,
    page,
    pageSize: 30,
  });

  const totalPages = Math.ceil(total / 30);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Signals Explorer</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Raw signals collected from all data sources, scored and ranked by our detection engine
          </p>
        </div>
        <TimeFilter value={timeFilter} onChange={(h) => { setTimeFilter(h); setPage(1); }} />
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-4">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Source</label>
          <div className="flex flex-wrap gap-1">
            {SOURCES.map(s => (
              <Button
                key={s}
                variant={source === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setSource(s); setPage(1); }}
                className="text-xs"
              >
                {SOURCE_LABELS[s] || s}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Strength</label>
          <div className="flex flex-wrap gap-1">
            {STRENGTHS.map(s => (
              <Button
                key={s}
                variant={strength === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setStrength(s); setPage(1); }}
                className="text-xs"
              >
                {s === 'all' ? 'All' : s}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span>{total.toLocaleString()} signals</span>
            <span className="text-muted-foreground font-normal">Page {page} of {totalPages || 1}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Score</TableHead>
                  <TableHead className="w-[80px]">Source</TableHead>
                  <TableHead>Signal</TableHead>
                  <TableHead className="w-[80px]">Strength</TableHead>
                  <TableHead className="w-[80px] text-right">Z-Score</TableHead>
                  <TableHead className="w-[100px] text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signals.map(signal => (
                  <TableRow key={signal.id}>
                    <TableCell className="font-mono font-bold">{signal.composite_score.toFixed(0)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{signal.source}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-md">
                        <div className="text-sm font-medium truncate flex items-center gap-1">
                          {signal.title}
                          {signal.source_url && (
                            <a href={signal.source_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                              <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </a>
                          )}
                        </div>
                        <div className="flex gap-1 mt-0.5">
                          {signal.tags?.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="outline" className="text-[9px] py-0">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STRENGTH_COLORS[signal.strength] || 'outline'} className="text-[10px]">
                        {signal.strength}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {signal.z_score !== null ? signal.z_score.toFixed(2) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatRelativeTime(signal.detected_at)}
                    </TableCell>
                  </TableRow>
                ))}
                {signals.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No signals found. Run a collection cycle first.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
