'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { HeroStats } from '@/components/dashboard/hero-stats';
import { SourceBreakdown } from '@/components/dashboard/source-breakdown';
import { RunHistory } from '@/components/dashboard/run-history';
import { Card, CardContent } from '@/components/ui/card';
import { TimeFilter } from '@/components/shared/time-filter';
import { SignalRow } from '@/types/database';
import { Lightbulb, Layers, ArrowRight } from 'lucide-react';

export default function DashboardPage() {
  const [timeFilter, setTimeFilter] = useState(336);
  const [signals, setSignals] = useState<SignalRow[]>([]);
  const [totalSignals, setTotalSignals] = useState(0);
  const [totalNarratives, setTotalNarratives] = useState(0);
  const [totalIdeas, setTotalIdeas] = useState(0);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [runs, setRuns] = useState<Array<{ id: string; started_at: string; completed_at: string | null; status: string; signals_collected: number; sources_queried: string[] }>>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const timeParam = timeFilter > 0 ? `?hours=${timeFilter}` : '';
      const sigTimeParam = timeFilter > 0 ? `?hours=${timeFilter}&pageSize=500` : '?pageSize=500';
      const [narrRes, sigRes, healthRes, runsRes, ideasRes] = await Promise.all([
        fetch(`/api/narratives${timeParam}`),
        fetch(`/api/signals${sigTimeParam}`),
        fetch('/api/health'),
        fetch('/api/runs'),
        fetch(`/api/ideas${timeParam}`),
      ]);

      const [narrData, sigData, healthData, runsData, ideasData] = await Promise.all([
        narrRes.json(),
        sigRes.json(),
        healthRes.json(),
        runsRes.json().catch(() => ({ data: [] })),
        ideasRes.json().catch(() => ({ data: [] })),
      ]);

      setTotalNarratives(narrData.data?.length || 0);
      setSignals(sigData.data || []);
      setTotalSignals(sigData.total || sigData.data?.length || 0);
      setLastRun(healthData.lastCollection || null);
      setRuns(runsData.data || []);
      setTotalIdeas(ideasData.data?.length || 0);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [timeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sources = new Set(signals.map(s => s.source));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">System Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time pipeline metrics, data source activity, and collection history
          </p>
        </div>
        <TimeFilter value={timeFilter} onChange={setTimeFilter} />
      </div>

      <HeroStats
        totalSignals={totalSignals}
        totalNarratives={totalNarratives}
        sourceDiversity={sources.size}
        lastCollectionAt={lastRun}
      />

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/ideas">
          <Card className="glass hover:shadow-xl hover:scale-[1.01] transition-all cursor-pointer">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-3">
                  <Lightbulb className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Product Ideas</h3>
                  <p className="text-sm text-muted-foreground">
                    {loading ? '...' : `${totalIdeas} ideas generated`}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/narratives">
          <Card className="glass hover:shadow-xl hover:scale-[1.01] transition-all cursor-pointer">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-chart-2/10 p-3">
                  <Layers className="h-6 w-6 text-chart-2" />
                </div>
                <div>
                  <h3 className="font-semibold">Detected Narratives</h3>
                  <p className="text-sm text-muted-foreground">
                    {loading ? '...' : `${totalNarratives} narratives active`}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SourceBreakdown signals={signals} />
        <RunHistory runs={runs} />
      </div>
    </div>
  );
}
