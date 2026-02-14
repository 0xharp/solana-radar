import { ScoredSignal, ProtoNarrative, SynthesizedNarrative, EvidenceChain } from '@/types/domain';
import { EntityCorrelation } from '@/types/domain';
import { jaccardSimilarity, mean } from '@/lib/utils/math';
import { getLLMProvider } from '@/lib/llm/provider';
import { narrativeSynthesisPrompt } from '@/lib/llm/prompts';
import { expandEntities } from './correlator';
import { CLUSTERING, ANALYSIS } from '@/lib/config';

export function clusterSignals(
  signals: ScoredSignal[],
  correlations: EntityCorrelation[]
): ProtoNarrative[] {
  // Take signals with composite score > 30
  const strongSignals = signals.filter(s => s.compositeScore > CLUSTERING.minSignalScore);
  if (strongSignals.length === 0) return [];

  // Build entity co-occurrence groups using normalized entities
  const entityGroups: Map<string, Set<string>> = new Map();
  for (const signal of strongSignals) {
    const normalizedEntities = expandEntities(signal.entities);
    for (const entity of normalizedEntities) {
      if (!entity) continue;
      if (!entityGroups.has(entity)) entityGroups.set(entity, new Set());
      for (const otherEntity of normalizedEntities) {
        if (otherEntity && otherEntity !== entity) {
          entityGroups.get(entity)!.add(otherEntity);
        }
      }
    }
  }

  // Filter out overly generic entities that would merge everything
  const GENERIC_ENTITIES = new Set<string>(CLUSTERING.genericEntities);

  // Agglomerative clustering using Jaccard similarity on normalized entities + tags
  const clusters: Array<{ signals: ScoredSignal[]; entities: Set<string>; tags: Set<string> }> = [];

  for (const signal of strongSignals) {
    // Use normalized entities for clustering (cross-source matching)
    const normalizedEntities = new Set(expandEntities(signal.entities).filter(e => !GENERIC_ENTITIES.has(e)));
    const signalTags = new Set(signal.tags.map(t => t.toLowerCase().trim()).filter(Boolean));
    const combined = new Set([...normalizedEntities, ...signalTags]);

    // Find best matching cluster
    let bestCluster = -1;
    let bestSimilarity = 0;

    for (let i = 0; i < clusters.length; i++) {
      const clusterCombined = new Set([...clusters[i].entities, ...clusters[i].tags]);
      const similarity = jaccardSimilarity(combined, clusterCombined);

      // Boost similarity when signals come from different sources (cross-source clustering)
      const clusterSources = new Set(clusters[i].signals.map(s => s.source));
      const crossSourceBonus = !clusterSources.has(signal.source) ? CLUSTERING.crossSourceBonus : 0;
      const adjustedSimilarity = similarity + crossSourceBonus;

      if (adjustedSimilarity > bestSimilarity && adjustedSimilarity > CLUSTERING.initialThreshold) {
        bestSimilarity = adjustedSimilarity;
        bestCluster = i;
      }
    }

    if (bestCluster >= 0) {
      clusters[bestCluster].signals.push(signal);
      for (const e of normalizedEntities) clusters[bestCluster].entities.add(e);
      for (const t of signalTags) clusters[bestCluster].tags.add(t);
    } else {
      clusters.push({
        signals: [signal],
        entities: normalizedEntities,
        tags: signalTags,
      });
    }
  }

  // Merge small clusters if they overlap
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const similarity = jaccardSimilarity(clusters[i].entities, clusters[j].entities);
        if (similarity > CLUSTERING.mergeThreshold) {
          // Merge j into i
          for (const s of clusters[j].signals) clusters[i].signals.push(s);
          for (const e of clusters[j].entities) clusters[i].entities.add(e);
          for (const t of clusters[j].tags) clusters[i].tags.add(t);
          clusters.splice(j, 1);
          merged = true;
          break;
        }
      }
      if (merged) break;
    }
  }

  // Convert to ProtoNarratives, filter out tiny clusters
  return clusters
    .filter(c => c.signals.length >= CLUSTERING.minClusterSize)
    .map((cluster, i) => {
      const timestamps = cluster.signals.map(s => s.detectedAt.getTime());
      const sources = new Set(cluster.signals.map(s => s.source));

      return {
        id: `proto-${i}`,
        signals: cluster.signals,
        entities: [...cluster.entities],
        tags: [...cluster.tags],
        averageScore: mean(cluster.signals.map(s => s.compositeScore)),
        sourceDiversity: sources.size,
        temporalSpan: {
          start: new Date(Math.min(...timestamps)),
          end: new Date(Math.max(...timestamps)),
        },
      };
    })
    .sort((a, b) => {
      // Sort by source diversity first, then score
      if (b.sourceDiversity !== a.sourceDiversity) return b.sourceDiversity - a.sourceDiversity;
      return b.averageScore - a.averageScore;
    })
    .slice(0, CLUSTERING.maxProtoNarratives);
}

export async function synthesizeNarratives(
  protos: ProtoNarrative[]
): Promise<SynthesizedNarrative[]> {
  if (protos.length === 0) return [];

  const llm = getLLMProvider();

  // Prepare prompt data
  const promptData = protos.slice(0, ANALYSIS.maxProtosForLLM).map(p => ({
    entities: p.entities.slice(0, 10),
    tags: p.tags.slice(0, 10),
    averageScore: p.averageScore,
    sourceDiversity: p.sourceDiversity,
    signalSummaries: p.signals.slice(0, 8).map(s =>
      `[${s.source}] ${s.title} (score: ${s.compositeScore.toFixed(0)}, strength: ${s.strength})`
    ),
  }));

  const prompt = narrativeSynthesisPrompt(promptData);

  try {
    const result = await llm.generateJSON<{
      narratives: Array<{
        clusterIndex: number;
        title: string;
        summary: string;
        explanation: string;
        confidenceScore: number;
        status: string;
        tags: string[];
      }>;
    }>(prompt, { temperature: 0.3, maxTokens: 6000 });

    return result.narratives
      .filter(n => n.confidenceScore >= ANALYSIS.minNarrativeConfidence)
      .map((n, i) => {
        const proto = protos[n.clusterIndex] || protos[i];
        const status = (['emerging', 'active', 'declining'] as const).includes(n.status as 'emerging' | 'active' | 'declining')
          ? (n.status as 'emerging' | 'active' | 'declining')
          : 'emerging';
        return {
          title: n.title,
          slug: n.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          summary: n.summary,
          explanation: n.explanation,
          confidenceScore: n.confidenceScore,
          status,
          tags: n.tags,
          evidenceChain: buildEvidenceChain(proto),
        };
      });
  } catch (error) {
    console.error('LLM synthesis failed, using algorithmic fallback:', error);
    // Fallback: generate narratives without LLM
    return protos.slice(0, ANALYSIS.maxProtosForLLM).map(p => ({
      title: `Emerging: ${p.entities.slice(0, 3).join(', ')}`,
      slug: p.entities.slice(0, 3).join('-').toLowerCase().replace(/[^a-z0-9-]+/g, ''),
      summary: `Signal cluster around ${p.entities.slice(0, 5).join(', ')} with ${p.signals.length} correlated signals from ${p.sourceDiversity} sources.`,
      explanation: `This narrative was detected algorithmically based on ${p.signals.length} signals with an average score of ${p.averageScore.toFixed(1)}/100. Key entities include ${p.entities.slice(0, 8).join(', ')}. The signals span ${p.sourceDiversity} distinct data sources, indicating cross-domain correlation.`,
      confidenceScore: Math.min(90, p.averageScore * (p.sourceDiversity / 3)),
      status: 'emerging' as const,
      tags: p.tags.slice(0, 8),
      evidenceChain: buildEvidenceChain(p),
    }));
  }
}

function buildEvidenceChain(proto: ProtoNarrative): EvidenceChain {
  return {
    rawDataPoints: proto.signals.slice(0, 10).map(s => ({
      source: s.source,
      title: s.title,
      url: s.sourceUrl,
      timestamp: s.detectedAt.toISOString(),
      value: `Score: ${s.compositeScore.toFixed(0)}, Magnitude: ${s.magnitude.toFixed(0)}, Velocity: ${s.velocity.toFixed(0)}`,
    })),
    scoredSignals: proto.signals.slice(0, 10).map(s => ({
      title: s.title,
      compositeScore: s.compositeScore,
      strength: s.strength,
    })),
    correlations: proto.entities.slice(0, 8).map(entity => {
      const relatedSignals = proto.signals.filter(s =>
        s.entities.some(e => e.toLowerCase() === entity.toLowerCase())
      );
      return {
        entity,
        sourceCount: new Set(relatedSignals.map(s => s.source)).size,
        averageScore: relatedSignals.length > 0
          ? mean(relatedSignals.map(s => s.compositeScore))
          : 0,
      };
    }),
    clusterInfo: {
      signalCount: proto.signals.length,
      entityCount: proto.entities.length,
      averageScore: proto.averageScore,
    },
  };
}
