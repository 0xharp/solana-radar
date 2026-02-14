'use client';

import { useState, useEffect, useCallback } from 'react';
import { SignalRow } from '@/types/database';

interface UseSignalsOptions {
  source?: string;
  strength?: string;
  hours?: number;
  page?: number;
  pageSize?: number;
}

export function useSignals(options: UseSignalsOptions = {}) {
  const [signals, setSignals] = useState<SignalRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { source, strength, hours = 0, page = 1, pageSize = 50 } = options;

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (source) params.set('source', source);
      if (strength) params.set('strength', strength);
      if (hours > 0) params.set('hours', String(hours));
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));

      const res = await fetch(`/api/signals?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setSignals(json.data || []);
      setTotal(json.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load signals');
    } finally {
      setLoading(false);
    }
  }, [source, strength, hours, page, pageSize]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  return { signals, total, loading, error, refetch: fetchSignals };
}
