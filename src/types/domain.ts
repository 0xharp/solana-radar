import { SignalCategory, SignalStrength } from './database';

export interface RawSignal {
  source: SignalCategory;
  sourceUrl?: string;
  title: string;
  description: string;
  rawData: Record<string, unknown>;
  tags: string[];
  entities: string[];
  magnitude: number;
  velocity: number;
  novelty: number;
  confidence: number;
  detectedAt: Date;
}

export interface ScoredSignal extends RawSignal {
  compositeScore: number;
  zScore: number | null;
  strength: SignalStrength;
}

export interface EntityCorrelation {
  entity: string;
  sources: SignalCategory[];
  sourceDiversity: number;
  totalMentions: number;
  averageScore: number;
  temporalDensity: number;
  signals: ScoredSignal[];
}

export interface ProtoNarrative {
  id: string;
  signals: ScoredSignal[];
  entities: string[];
  tags: string[];
  averageScore: number;
  sourceDiversity: number;
  temporalSpan: { start: Date; end: Date };
}

export interface SynthesizedNarrative {
  title: string;
  slug: string;
  summary: string;
  explanation: string;
  confidenceScore: number;
  status: 'emerging' | 'active' | 'declining';
  tags: string[];
  evidenceChain: EvidenceChain;
}

export interface EvidenceChain {
  rawDataPoints: Array<{
    source: string;
    title: string;
    url?: string;
    timestamp: string;
    value: string;
  }>;
  scoredSignals: Array<{
    title: string;
    compositeScore: number;
    strength: string;
  }>;
  correlations: Array<{
    entity: string;
    sourceCount: number;
    averageScore: number;
  }>;
  clusterInfo: {
    signalCount: number;
    entityCount: number;
    averageScore: number;
  };
}

export interface ProductIdea {
  title: string;
  description: string;
  targetUser: string;
  technicalApproach: string;
  differentiation: string;
  feasibilityScore: number;
  impactScore: number;
}

export interface Collector {
  name: string;
  category: SignalCategory;
  collect(since?: Date): Promise<RawSignal[]>;
}

export interface LLMProvider {
  generateText(prompt: string, options?: LLMOptions): Promise<string>;
  generateJSON<T>(prompt: string, options?: LLMOptions): Promise<T>;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}
