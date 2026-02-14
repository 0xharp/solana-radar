import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { GitHubCollector } from '@/lib/collectors/github';
import { HeliusCollector } from '@/lib/collectors/helius';
import { DeFiLlamaCollector } from '@/lib/collectors/defillama';
import { CoinGeckoCollector } from '@/lib/collectors/coingecko';
import { RSSCollector, RedditCollector } from '@/lib/collectors/social';
import { TwitterCollector } from '@/lib/collectors/twitter';
import { scoreSignals } from '@/lib/engine/signal-scorer';
import { detectTrends } from '@/lib/engine/trend-detector';
import { ScoredSignal } from '@/types/domain';
import { Collector } from '@/lib/collectors/types';

export const maxDuration = 300;

// ── Job 1: Data Collection ──
// Runs once daily via Vercel cron. Collects signals from all 7 sources, scores them,
// and stores them in the DB. Does NOT run narrative synthesis or idea generation.
//
// Time strategy:
// - Queries the last completed collection run's timestamp
// - Event-based collectors (GitHub, Twitter, RSS, Reddit) use this as their "since"
//   date to only fetch NEW data since the last run
// - Snapshot collectors (Helius, DeFiLlama, CoinGecko) always capture current state
//   regardless — each daily snapshot builds a time series
// - First run (no previous run): defaults to 14-day lookback for event-based sources

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // ── Determine "since" from last completed collection run ──
    const { data: lastRun } = await supabase
      .from('collection_runs')
      .select('completed_at')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    // If no previous run, event-based collectors default to 14 days internally
    const since = lastRun?.completed_at ? new Date(lastRun.completed_at) : undefined;
    console.log(`Collection since: ${since ? since.toISOString() : 'first run (14d lookback)'}`);

    // ── Create a new collection run ──
    const { data: run, error: runError } = await supabase
      .from('collection_runs')
      .insert({ status: 'running', sources_queried: [] })
      .select('id')
      .single();

    if (runError || !run) throw new Error('Failed to create collection run');
    const runId = run.id;

    // ── Collect from all sources ──
    const collectors: Collector[] = [
      new GitHubCollector(),
      new DeFiLlamaCollector(),
      new CoinGeckoCollector(),
      new RSSCollector(),
      new RedditCollector(),
      new TwitterCollector(),
    ];
    if (process.env.HELIUS_API_KEY) {
      collectors.splice(1, 0, new HeliusCollector());
    }

    const collectionResults = [];
    const allScored: ScoredSignal[] = [];

    for (const collector of collectors) {
      try {
        const rawSignals = await collector.collect(since);
        const scored = scoreSignals(rawSignals);

        const rows = scored.map(s => ({
          collection_run_id: runId,
          source: s.source,
          source_url: s.sourceUrl || null,
          title: s.title,
          description: s.description,
          raw_data: s.rawData,
          tags: s.tags,
          entities: s.entities,
          magnitude: s.magnitude,
          velocity: s.velocity,
          novelty: s.novelty,
          confidence: s.confidence,
          composite_score: s.compositeScore,
          z_score: s.zScore,
          strength: s.strength,
          detected_at: s.detectedAt.toISOString(),
        }));

        if (rows.length > 0) {
          await supabase.from('signals').insert(rows);
        }

        allScored.push(...scored);
        collectionResults.push({ source: collector.category, signalsCollected: scored.length });
        console.log(`Collected ${scored.length} signals from ${collector.name}`);
      } catch (error) {
        console.error(`Collection error for ${collector.name}:`, error);
        collectionResults.push({ source: collector.category, signalsCollected: 0, error: String(error) });
      }
    }

    const totalSignals = allScored.length;
    const sourcesQueried = collectionResults.map(r => r.source);

    await supabase.from('collection_runs').update({
      signals_collected: totalSignals,
      sources_queried: sourcesQueried,
    }).eq('id', runId);

    console.log(`Total signals collected: ${totalSignals}`);

    // ── Z-score trend detection ──
    try {
      const enhanced = await detectTrends(allScored);
      const { data: dbSignals } = await supabase
        .from('signals')
        .select('id, title, source')
        .eq('collection_run_id', runId);

      if (dbSignals) {
        for (const signal of enhanced) {
          if (signal.zScore !== null) {
            const match = dbSignals.find(s => s.title === signal.title && s.source === signal.source);
            if (match) {
              await supabase.from('signals').update({
                z_score: signal.zScore,
                strength: signal.strength,
              }).eq('id', match.id);
            }
          }
        }
      }
      console.log('Trend detection complete');
    } catch (error) {
      console.error('Trend detection error:', error);
    }

    // ── Mark run as completed ──
    await supabase.from('collection_runs').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', runId);

    return NextResponse.json({
      job: 'collect',
      runId,
      since: since?.toISOString() || null,
      totalSignals,
      sources: collectionResults,
    });
  } catch (error) {
    console.error('Collection run error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
