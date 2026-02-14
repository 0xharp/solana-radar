import { NarrativeRow, SignalRow, IdeaRow } from './database';

export interface ApiResponse<T> {
  data: T;
  error: string | null;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}

export interface NarrativeWithIdeas extends NarrativeRow {
  ideas: IdeaRow[];
  signals: SignalRow[];
}

export interface DashboardStats {
  totalSignals: number;
  totalNarratives: number;
  sourceDiversity: number;
  lastCollectionAt: string | null;
  signalsBySource: Record<string, number>;
  topNarratives: NarrativeRow[];
  recentSignals: SignalRow[];
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  lastCollection: string | null;
  signalCount: number;
  narrativeCount: number;
  uptime: number;
}

export interface CollectionResult {
  source: string;
  signalsCollected: number;
  duration: number;
  error: string | null;
}

export interface ProcessingResult {
  step: string;
  itemsProcessed: number;
  duration: number;
  error: string | null;
}
