import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { correlateSignals, findNarrativeCandidates } from '@/lib/engine/correlator';
import { clusterSignals, synthesizeNarratives } from '@/lib/engine/narrative-clusterer';
import { generateIdeasBatch } from '@/lib/engine/idea-generator';
import { ScoredSignal, SynthesizedNarrative } from '@/types/domain';
import { SignalRow } from '@/types/database';
import { ANALYSIS, TIME } from '@/lib/config';

export const maxDuration = 300;

// ── Job 2: Narrative Synthesis + Idea Generation ──
// Triggered manually or on a 14-day schedule. Reads ALL signals accumulated
// over the last 14 days from the DB, then runs the full analysis pipeline:
//   1. Cross-source correlation
//   2. Agglomerative clustering into proto-narratives
//   3. LLM synthesis (1 call) — names and describes each narrative
//   4. LLM idea generation (1 call) — one product idea per top narrative
//
// This separation ensures:
// - Data collection (daily) and analysis (periodic) are independent
// - Ideas are generated with a full fortnight of accumulated context
// - No duplicate ideas across daily runs — analysis only runs when triggered
// - LLM usage is minimized: 2 calls per analysis run, not 2 calls per day
//
// Guardrails:
// - Requires at least 50 signals to run (ensures enough data for meaningful analysis)
// - Handles LLM rate limits gracefully (free-tier APIs have strict quotas)

function dbRowToScoredSignal(row: SignalRow): ScoredSignal {
  return {
    source: row.source,
    sourceUrl: row.source_url || undefined,
    title: row.title,
    description: row.description,
    rawData: row.raw_data,
    tags: row.tags || [],
    entities: row.entities || [],
    magnitude: row.magnitude,
    velocity: row.velocity,
    novelty: row.novelty,
    confidence: row.confidence,
    compositeScore: row.composite_score,
    zScore: row.z_score,
    strength: row.strength,
    detectedAt: new Date(row.detected_at),
  };
}

function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('429') ||
      msg.includes('rate limit') ||
      msg.includes('quota') ||
      msg.includes('too many requests') ||
      msg.includes('resource exhausted') ||
      msg.includes('rate_limit_exceeded')
    );
  }
  return false;
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // ── Load all signals from the last 14 days ──
    const fourteenDaysAgo = new Date(Date.now() - TIME.analysisWindowDays * TIME.msPerDay).toISOString();

    const { data: signalRows, error: sigError } = await supabase
      .from('signals')
      .select('*')
      .gte('detected_at', fourteenDaysAgo)
      .order('composite_score', { ascending: false })
      .limit(ANALYSIS.maxSignalsToLoad);

    if (sigError) throw sigError;

    if (!signalRows || signalRows.length === 0) {
      return NextResponse.json({
        job: 'analyze',
        error: 'No signals found in the last 14 days. Run data collection first.',
      }, { status: 400 });
    }

    // ── Minimum signal threshold ──
    if (signalRows.length < ANALYSIS.minSignals) {
      return NextResponse.json({
        job: 'analyze',
        error: `Not enough data for meaningful analysis. Found ${signalRows.length} signals, but at least ${ANALYSIS.minSignals} are required. Run data collection a few more times to accumulate sufficient signals.`,
        signalsFound: signalRows.length,
        signalsRequired: ANALYSIS.minSignals,
      }, { status: 400 });
    }

    console.log(`Loaded ${signalRows.length} signals from last 14 days for analysis`);

    const allSignals: ScoredSignal[] = signalRows.map(dbRowToScoredSignal);

    // ── Step 1: Correlate + Cluster (purely algorithmic, no LLM) ──
    const correlations = correlateSignals(allSignals);
    const candidates = findNarrativeCandidates(correlations);
    console.log(`Found ${candidates.length} narrative candidates from ${correlations.length} correlations`);

    const protos = clusterSignals(allSignals, correlations);
    console.log(`Clustered into ${protos.length} proto-narratives`);

    // ── Step 2: LLM Synthesis (1 call) ──
    let synthesized: SynthesizedNarrative[] = [];
    let llmWarning: string | null = null;

    try {
      synthesized = await synthesizeNarratives(protos);
      console.log(`Synthesized ${synthesized.length} narratives`);
    } catch (error) {
      if (isRateLimitError(error)) {
        llmWarning = 'LLM rate limit reached (free-tier API quota exceeded). Narratives were saved with algorithmic descriptions. Try again later or upgrade your API key for higher limits.';
        console.warn('LLM rate limit on synthesis, falling back to algorithmic descriptions');
        // Fallback: create basic narratives from proto-narratives without LLM
        synthesized = protos.map((proto, i) => ({
          title: proto.entities.slice(0, 3).join(' + '),
          slug: proto.entities.slice(0, 2).join('-').toLowerCase().replace(/[^a-z0-9-]/g, ''),
          summary: `Emerging trend detected across ${proto.entities.slice(0, 5).join(', ')} with ${proto.signals.length} supporting signals from ${proto.sourceDiversity} sources.`,
          explanation: `This narrative was algorithmically detected through cross-source signal correlation. The cluster contains ${proto.signals.length} signals with an average score of ${proto.averageScore.toFixed(1)}/100, spanning ${proto.sourceDiversity} independent data sources. LLM synthesis was unavailable due to free-tier rate limits — the raw evidence chain below provides the full detail.`,
          confidenceScore: Math.min(100, proto.averageScore * 1.2),
          status: 'emerging' as const,
          tags: proto.tags.slice(0, 6),
          evidenceChain: {
            rawDataPoints: proto.signals.slice(0, 10).map(s => ({
              source: s.source,
              title: s.title,
              url: s.sourceUrl,
              timestamp: s.detectedAt.toISOString(),
              value: `Score: ${s.compositeScore.toFixed(0)}, Strength: ${s.strength}`,
            })),
            scoredSignals: proto.signals.slice(0, 10).map(s => ({
              title: s.title,
              compositeScore: s.compositeScore,
              strength: s.strength,
            })),
            correlations: proto.entities.slice(0, 5).map(e => ({
              entity: e,
              sourceCount: proto.sourceDiversity,
              averageScore: proto.averageScore,
            })),
            clusterInfo: {
              signalCount: proto.signals.length,
              entityCount: proto.entities.length,
              averageScore: proto.averageScore,
            },
          },
        }));
      } else {
        throw error;
      }
    }

    // ── Store narratives ──
    let narrativesGenerated = 0;
    const storedNarratives: Array<{ id: string; narrative: SynthesizedNarrative; signalTitles: string[] }> = [];

    for (const narrative of synthesized) {
      const { data: inserted, error: insertError } = await supabase
        .from('narratives')
        .insert({
          title: narrative.title,
          slug: narrative.slug + '-' + Date.now().toString(36),
          summary: narrative.summary,
          explanation: narrative.explanation,
          confidence_score: narrative.confidenceScore,
          signal_count: narrative.evidenceChain.clusterInfo.signalCount,
          source_diversity: new Set(
            narrative.evidenceChain.rawDataPoints.map(dp => dp.source)
          ).size,
          status: narrative.status,
          tags: narrative.tags,
          evidence_chain: narrative.evidenceChain as unknown as Record<string, unknown>,
        })
        .select('id')
        .single();

      if (inserted && !insertError) {
        narrativesGenerated++;

        const signalTitles = narrative.evidenceChain.rawDataPoints.map(dp => dp.title);
        const matchingSignals = signalRows.filter(s => signalTitles.includes(s.title));
        const links = matchingSignals.map(s => ({
          narrative_id: inserted.id,
          signal_id: s.id,
          relevance_score: 50,
        }));
        if (links.length > 0) {
          await supabase.from('narrative_signals').insert(links);
        }

        storedNarratives.push({ id: inserted.id, narrative, signalTitles });
      }
    }
    console.log(`Stored ${narrativesGenerated} narratives`);

    // ── Step 3: Generate ideas (1 batch LLM call) ──
    let ideasGenerated = 0;

    const topNarratives = storedNarratives
      .sort((a, b) => b.narrative.confidenceScore - a.narrative.confidenceScore)
      .slice(0, ANALYSIS.topNarrativesForIdeas);

    try {
      const batchInput = topNarratives.map(({ narrative, signalTitles }) => ({
        narrative,
        signalEvidence: signalTitles.slice(0, 8),
      }));

      const ideaMap = await generateIdeasBatch(batchInput);

      for (let i = 0; i < topNarratives.length; i++) {
        const idea = ideaMap.get(i);
        if (idea) {
          await supabase.from('ideas').insert({
            narrative_id: topNarratives[i].id,
            title: idea.title,
            description: idea.description,
            target_user: idea.targetUser,
            technical_approach: idea.technicalApproach,
            differentiation: idea.differentiation,
            feasibility_score: idea.feasibilityScore,
            impact_score: idea.impactScore,
          });
          ideasGenerated++;
        }
      }
      console.log(`Generated ${ideasGenerated} ideas (1 batch call)`);
    } catch (error) {
      if (isRateLimitError(error)) {
        llmWarning = (llmWarning ? llmWarning + ' ' : '') +
          'LLM rate limit reached during idea generation (free-tier API quota exceeded). Narratives were saved but ideas could not be generated. Try again later or upgrade your API key.';
        console.warn('LLM rate limit on idea generation');
      } else {
        // Log but don't fail the whole run — we still saved narratives
        console.error('Idea generation error:', error);
        llmWarning = (llmWarning ? llmWarning + ' ' : '') +
          `Idea generation failed: ${error instanceof Error ? error.message : 'Unknown error'}. Narratives were saved successfully.`;
      }
    }

    return NextResponse.json({
      job: 'analyze',
      signalsAnalyzed: signalRows.length,
      timeWindow: '14 days',
      narrativesGenerated,
      ideasGenerated,
      ...(llmWarning ? { warning: llmWarning } : {}),
    });
  } catch (error) {
    console.error('Analysis run error:', error);

    // Check if the top-level error is a rate limit
    if (isRateLimitError(error)) {
      return NextResponse.json({
        job: 'analyze',
        error: 'LLM rate limit reached — the free-tier API quota has been exceeded. Please wait a few minutes and try again, or configure a paid API key for higher limits.',
        rateLimited: true,
      }, { status: 429 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
