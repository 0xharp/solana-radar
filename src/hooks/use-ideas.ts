'use client';

import { useState, useEffect, useCallback } from 'react';
import { IdeaRow, NarrativeRow, SignalRow } from '@/types/database';

export type IdeaWithNarrative = IdeaRow & {
  narratives: Pick<NarrativeRow, 'id' | 'title' | 'slug' | 'confidence_score' | 'signal_count' | 'source_diversity' | 'status' | 'tags'>;
};

export type IdeaWithFullNarrative = IdeaRow & {
  narratives: NarrativeRow & {
    narrative_signals: Array<{
      signal_id: string;
      relevance_score: number;
      signals: SignalRow;
    }>;
  };
};

export function useIdeas(hours: number = 0) {
  const [ideas, setIdeas] = useState<IdeaWithNarrative[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    try {
      const params = hours > 0 ? `?hours=${hours}` : '';
      const res = await fetch(`/api/ideas${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setIdeas(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ideas');
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  return { ideas, loading, error, refetch: fetchIdeas };
}

export function useIdea(id: string) {
  const [idea, setIdea] = useState<IdeaWithFullNarrative | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchIdea() {
      try {
        const res = await fetch(`/api/ideas/${id}`);
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setIdea(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load idea');
      } finally {
        setLoading(false);
      }
    }
    fetchIdea();
  }, [id]);

  return { idea, loading, error };
}
