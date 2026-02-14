'use client';

import { useState, useEffect, useCallback } from 'react';
import { NarrativeRow, IdeaRow, SignalRow } from '@/types/database';

interface NarrativeWithRelations extends NarrativeRow {
  ideas: IdeaRow[];
  narrative_signals?: Array<{
    signal_id: string;
    relevance_score: number;
    signals: SignalRow;
  }>;
}

export function useNarratives(hours: number = 0) {
  const [narratives, setNarratives] = useState<NarrativeWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNarratives = useCallback(async () => {
    setLoading(true);
    try {
      const params = hours > 0 ? `?hours=${hours}` : '';
      const res = await fetch(`/api/narratives${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setNarratives(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load narratives');
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => {
    fetchNarratives();
  }, [fetchNarratives]);

  return { narratives, loading, error, refetch: fetchNarratives };
}

export function useNarrative(id: string) {
  const [narrative, setNarrative] = useState<NarrativeWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNarrative() {
      try {
        const res = await fetch(`/api/narratives/${id}`);
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setNarrative(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load narrative');
      } finally {
        setLoading(false);
      }
    }
    fetchNarrative();
  }, [id]);

  return { narrative, loading, error };
}
