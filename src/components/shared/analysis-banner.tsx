'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Info, Sparkles, Loader2 } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils/date';

interface AnalysisBannerProps {
  /** The created_at of the most recent item (narrative or idea) on this page */
  latestItemDate: string | null;
  /** "ideas" or "narratives" — used for messaging */
  itemType: 'ideas' | 'narratives';
  /** Called after a successful analysis run so the parent can refetch data */
  onAnalysisComplete?: () => void;
}

export function AnalysisBanner({ latestItemDate, itemType, onAnalysisComplete }: AnalysisBannerProps) {
  const [totalSignals, setTotalSignals] = useState<number | null>(null);
  const [newSignalCount, setNewSignalCount] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSignalCounts() {
      try {
        // Get total signal count (all time)
        const totalRes = await fetch('/api/signals?pageSize=1');
        const totalData = await totalRes.json();
        setTotalSignals(totalData.total || 0);

        // Count signals newer than the last analysis
        if (latestItemDate) {
          const sinceHours = Math.max(1, (Date.now() - new Date(latestItemDate).getTime()) / 3600000);
          const countRes = await fetch(`/api/signals?hours=${Math.ceil(sinceHours)}&pageSize=1`);
          const countData = await countRes.json();
          setNewSignalCount(countData.total || 0);
        }
      } catch {
        // Silent fail
      }
    }

    fetchSignalCounts();
  }, [latestItemDate]);

  const triggerAnalysis = async () => {
    setAnalyzing(true);
    setResult(null);
    try {
      const res = await fetch('/api/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: 'analyze' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      let msg = `Generated ${data.narrativesGenerated} narratives and ${data.ideasGenerated} ideas`;
      if (data.warning) {
        msg += ` — ${data.warning}`;
      }
      setResult(msg);
      onAnalysisComplete?.();
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setAnalyzing(false);
    }
  };

  // Show result feedback after running analysis
  if (result) {
    const isError = result.startsWith('Error');
    const isWarning = result.includes('rate limit') || result.includes('Warning');
    return (
      <div className={`flex items-start gap-2 rounded-lg border px-4 py-2.5 text-sm ${
        isError ? 'border-red-200 bg-red-50/80' :
        isWarning ? 'border-amber-200 bg-amber-50/80' :
        'border-green-200 bg-green-50/80'
      }`}>
        <Info className={`h-4 w-4 shrink-0 mt-0.5 ${
          isError ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-green-500'
        }`} />
        <p className={isError ? 'text-red-700' : isWarning ? 'text-amber-700' : 'text-green-700'}>
          {result}
        </p>
      </div>
    );
  }

  // Still loading signal counts
  if (totalSignals === null) return null;

  // No signals at all — can't run analysis
  if (totalSignals === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm">
        <Info className="h-4 w-4 text-slate-500 shrink-0" />
        <p className="text-slate-600">
          No {itemType} yet. Collect signals first, then synthesize to detect narratives and generate {itemType}.
        </p>
      </div>
    );
  }

  // Has signals — always show the banner with the button
  const hasAnalysis = !!latestItemDate;

  const getMessage = () => {
    if (!hasAnalysis) {
      return (
        <>
          {totalSignals} signal{totalSignals !== 1 ? 's' : ''} available.
          Synthesize signals to detect narratives and generate {itemType} from the last 14 days of data.
        </>
      );
    }
    if (newSignalCount > 0) {
      return (
        <>
          These {itemType} were synthesized{' '}
          <span className="font-medium">{formatRelativeTime(latestItemDate!)}</span>.
          {' '}{newSignalCount} new signal{newSignalCount !== 1 ? 's' : ''} collected since then.
        </>
      );
    }
    return (
      <>
        These {itemType} were synthesized{' '}
        <span className="font-medium">{formatRelativeTime(latestItemDate!)}</span>.
        No new signals since then.
      </>
    );
  };

  const bannerColor = !hasAnalysis || newSignalCount > 0
    ? 'border-blue-200 bg-blue-50/80'
    : 'border-slate-200 bg-slate-50/80';
  const iconColor = !hasAnalysis || newSignalCount > 0 ? 'text-blue-500' : 'text-slate-400';
  const textColor = !hasAnalysis || newSignalCount > 0 ? 'text-blue-700' : 'text-slate-600';

  return (
    <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-lg border px-4 py-2.5 text-sm ${bannerColor}`}>
      <div className="flex items-start gap-2 flex-1">
        <Info className={`h-4 w-4 shrink-0 mt-0.5 ${iconColor}`} />
        <p className={textColor}>
          {getMessage()}
        </p>
      </div>
      <Button
        onClick={triggerAnalysis}
        disabled={analyzing}
        size="sm"
        className="shrink-0"
      >
        {analyzing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
        {analyzing ? 'Synthesizing...' : 'Detect Narratives & Ideas'}
      </Button>
    </div>
  );
}
