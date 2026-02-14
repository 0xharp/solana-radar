import { ScoredSignal } from '@/types/domain';
import { mean, stdDev, zScore as calcZScore } from '@/lib/utils/math';
import { createServerClient } from '@/lib/supabase/server';
import { Z_SCORE, TIME } from '@/lib/config';

export async function detectTrends(signals: ScoredSignal[]): Promise<ScoredSignal[]> {
  const supabase = createServerClient();

  // Group signals by source category
  const bySource = new Map<string, ScoredSignal[]>();
  for (const signal of signals) {
    const key = signal.source;
    if (!bySource.has(key)) bySource.set(key, []);
    bySource.get(key)!.push(signal);
  }

  // Get historical baseline from metric_history
  const { data: history } = await supabase
    .from('metric_history')
    .select('*')
    .gte('recorded_at', new Date(Date.now() - TIME.baselineWindowDays * TIME.msPerDay).toISOString())
    .order('recorded_at', { ascending: true });

  // Compute baseline statistics per source
  const baselines = new Map<string, { mean: number; stdDev: number; values: number[] }>();

  if (history && history.length > 0) {
    const byMetric = new Map<string, number[]>();
    for (const h of history) {
      const key = `${h.source}:${h.metric_name}`;
      if (!byMetric.has(key)) byMetric.set(key, []);
      byMetric.get(key)!.push(h.metric_value);
    }

    for (const [key, values] of byMetric) {
      baselines.set(key, {
        mean: mean(values),
        stdDev: stdDev(values),
        values,
      });
    }
  }

  // Apply z-scores to each signal
  const enhanced = signals.map(signal => {
    const baselineKey = `${signal.source}:composite_score`;
    const baseline = baselines.get(baselineKey);

    let z: number | null = null;
    if (baseline && baseline.stdDev > 0) {
      z = calcZScore(signal.compositeScore, baseline.mean, baseline.stdDev);
    } else {
      // No baseline data — use signals themselves as baseline
      const sourceSignals = bySource.get(signal.source) || [];
      const scores = sourceSignals.map(s => s.compositeScore);
      if (scores.length >= 3) {
        const m = mean(scores);
        const sd = stdDev(scores);
        if (sd > 0) {
          z = calcZScore(signal.compositeScore, m, sd);
        }
      }
    }

    // Adjust strength based on z-score
    let strength = signal.strength;
    if (z !== null) {
      if (z > Z_SCORE.extreme) strength = 'extreme';
      else if (z > Z_SCORE.strong) strength = 'strong';
      else if (z > Z_SCORE.medium) strength = 'medium';
    }

    return { ...signal, zScore: z, strength };
  });

  // Record current metrics for future baseline
  const metricsToStore = [];
  for (const [source, sourceSignals] of bySource) {
    const avgScore = mean(sourceSignals.map(s => s.compositeScore));
    metricsToStore.push({
      metric_name: 'composite_score',
      metric_value: avgScore,
      source,
      recorded_at: new Date().toISOString(),
    });
    metricsToStore.push({
      metric_name: 'signal_count',
      metric_value: sourceSignals.length,
      source,
      recorded_at: new Date().toISOString(),
    });
  }

  if (metricsToStore.length > 0) {
    await supabase.from('metric_history').insert(metricsToStore);
  }

  return enhanced;
}

