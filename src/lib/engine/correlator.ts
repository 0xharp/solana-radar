import { ScoredSignal, EntityCorrelation } from '@/types/domain';
import { SignalCategory } from '@/types/database';
import { mean } from '@/lib/utils/math';
import { ENTITY_ALIASES, ENTITY_STRIP_SUFFIXES, CORRELATION } from '@/lib/config';

export function normalizeEntity(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (!lower || lower.length < 2) return lower;

  // Direct alias lookup
  if (ENTITY_ALIASES[lower]) return ENTITY_ALIASES[lower];

  // Strip common suffixes
  for (const suffix of ENTITY_STRIP_SUFFIXES) {
    if (lower.endsWith(suffix)) {
      const stripped = lower.slice(0, -suffix.length);
      if (ENTITY_ALIASES[stripped]) return ENTITY_ALIASES[stripped];
      return stripped;
    }
  }

  return lower;
}

// Returns both the canonical entity AND the original, so signals can be linked via either
export function expandEntities(entities: string[]): string[] {
  const expanded = new Set<string>();
  for (const entity of entities) {
    const normalized = normalizeEntity(entity);
    if (normalized && normalized.length >= 2) {
      expanded.add(normalized);
    }
    // Also keep original if different (for specificity)
    const lower = entity.toLowerCase().trim();
    if (lower && lower.length >= 2 && lower !== normalized) {
      expanded.add(lower);
    }
  }
  return [...expanded];
}

export function correlateSignals(signals: ScoredSignal[]): EntityCorrelation[] {
  // Extract entity-to-signal mappings with normalization
  const entityMap = new Map<string, ScoredSignal[]>();

  for (const signal of signals) {
    const normalizedEntities = expandEntities(signal.entities);
    for (const entity of normalizedEntities) {
      if (!entity || entity.length < 2) continue;
      if (!entityMap.has(entity)) entityMap.set(entity, []);
      entityMap.get(entity)!.push(signal);
    }
  }

  const correlations: EntityCorrelation[] = [];

  for (const [entity, entitySignals] of entityMap) {
    // Count distinct source categories
    const sources = new Set(entitySignals.map(s => s.source));
    const sourceDiversity = sources.size;

    // Compute temporal density (signals per day over the span)
    const timestamps = entitySignals.map(s => s.detectedAt.getTime());
    const timeSpan = Math.max(1, (Math.max(...timestamps) - Math.min(...timestamps)) / 86400000);
    const temporalDensity = entitySignals.length / timeSpan;

    const averageScore = mean(entitySignals.map(s => s.compositeScore));

    correlations.push({
      entity,
      sources: [...sources] as SignalCategory[],
      sourceDiversity,
      totalMentions: entitySignals.length,
      averageScore,
      temporalDensity,
      signals: entitySignals,
    });
  }

  // Sort by source diversity first, then average score
  return correlations
    .filter(c => c.totalMentions >= CORRELATION.minMentions)
    .sort((a, b) => {
      if (b.sourceDiversity !== a.sourceDiversity) return b.sourceDiversity - a.sourceDiversity;
      return b.averageScore - a.averageScore;
    });
}

export function findNarrativeCandidates(correlations: EntityCorrelation[]): EntityCorrelation[] {
  // Entities from 2+ sources with score >40 = narrative candidate
  return correlations.filter(c => c.sourceDiversity >= CORRELATION.minSourceDiversity && c.averageScore > CORRELATION.minAverageScore);
}
