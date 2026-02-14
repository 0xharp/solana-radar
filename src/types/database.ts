export type SignalCategory = 'github' | 'onchain' | 'defi' | 'market' | 'social' | 'twitter' | 'reddit' | 'rss';
export type SignalStrength = 'weak' | 'medium' | 'strong' | 'extreme';
export type NarrativeStatus = 'emerging' | 'active' | 'declining';
export type CollectionStatus = 'running' | 'completed' | 'failed';

export interface CollectionRunRow {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: CollectionStatus;
  signals_collected: number;
  sources_queried: string[];
  error_message: string | null;
}

export interface SignalRow {
  id: string;
  collection_run_id: string | null;
  source: SignalCategory;
  source_url: string | null;
  title: string;
  description: string;
  raw_data: Record<string, unknown>;
  tags: string[];
  entities: string[];
  magnitude: number;
  velocity: number;
  novelty: number;
  confidence: number;
  composite_score: number;
  z_score: number | null;
  strength: SignalStrength;
  detected_at: string;
  created_at: string;
}

export interface NarrativeRow {
  id: string;
  collection_run_id: string | null;
  title: string;
  slug: string;
  summary: string;
  explanation: string;
  confidence_score: number;
  signal_count: number;
  source_diversity: number;
  status: NarrativeStatus;
  tags: string[];
  evidence_chain: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface NarrativeSignalRow {
  narrative_id: string;
  signal_id: string;
  relevance_score: number;
}

export interface IdeaRow {
  id: string;
  narrative_id: string;
  title: string;
  description: string;
  target_user: string;
  technical_approach: string;
  differentiation: string;
  feasibility_score: number;
  impact_score: number;
  created_at: string;
}

export interface MetricHistoryRow {
  id: string;
  metric_name: string;
  metric_value: number;
  source: SignalCategory;
  recorded_at: string;
}

export interface DataSourceRow {
  id: string;
  name: string;
  category: SignalCategory;
  url: string;
  last_collected_at: string | null;
  is_active: boolean;
  config: Record<string, unknown>;
}
