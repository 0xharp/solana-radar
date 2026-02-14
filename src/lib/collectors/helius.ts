import { RawSignal, Collector } from './types';
import { heliusLimiter } from '@/lib/utils/rate-limiter';
import { withRetry } from '@/lib/utils/retry';
import { API_URLS } from '@/lib/config';

async function heliusFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  await heliusLimiter.waitForSlot();
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) throw new Error('HELIUS_API_KEY required');

  const url = new URL(`${API_URLS.helius}${path}`);
  url.searchParams.set('api-key', apiKey);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Helius API error: ${res.status}`);
  return res.json() as Promise<T>;
}

async function heliusRPC<T>(method: string, params: unknown[]): Promise<T> {
  await heliusLimiter.waitForSlot();
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) throw new Error('HELIUS_API_KEY required');

  const res = await fetch(`${API_URLS.heliusRpc}/?api-key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`Helius RPC error: ${res.status}`);
  const data = await res.json();
  return data.result as T;
}

export class HeliusCollector implements Collector {
  name = 'Helius/Onchain';
  category = 'onchain' as const;

  // Helius provides point-in-time network snapshots (TPS, epoch info, transaction patterns).
  // These metrics don't have a historical "since" query — each run captures current state,
  // building a time series across daily collection runs.
  async collect(_since?: Date): Promise<RawSignal[]> {
    const signals: RawSignal[] = [];

    // 1. Get recent transaction stats via supply/performance
    const perfSignals = await this.collectNetworkPerformance();
    signals.push(...perfSignals);

    // 2. Collect recent token creation activity (via DAS)
    const tokenSignals = await this.collectTokenActivity();
    signals.push(...tokenSignals);

    return signals;
  }

  private async collectNetworkPerformance(): Promise<RawSignal[]> {
    const signals: RawSignal[] = [];

    try {
      // Get recent performance samples
      const perfSamples = await withRetry(() =>
        heliusRPC<Array<{
          slot: number;
          numTransactions: number;
          numNonVoteTransactions: number;
          samplePeriodSecs: number;
        }>>('getRecentPerformanceSamples', [10])
      );

      if (perfSamples && perfSamples.length > 0) {
        const avgTps = perfSamples.reduce((sum, s) =>
          sum + s.numTransactions / s.samplePeriodSecs, 0) / perfSamples.length;
        const avgNonVoteTps = perfSamples.reduce((sum, s) =>
          sum + s.numNonVoteTransactions / s.samplePeriodSecs, 0) / perfSamples.length;

        signals.push({
          source: 'onchain',
          title: `Network TPS: ${avgTps.toFixed(0)} (${avgNonVoteTps.toFixed(0)} non-vote)`,
          description: `Solana network processing ${avgTps.toFixed(0)} TPS with ${avgNonVoteTps.toFixed(0)} non-vote transactions per second. High non-vote ratio indicates organic usage.`,
          rawData: {
            avgTps,
            avgNonVoteTps,
            nonVoteRatio: avgNonVoteTps / avgTps,
            samples: perfSamples.length,
          },
          tags: ['network-performance', 'tps', 'transactions'],
          entities: ['solana-network', 'transaction-volume'],
          magnitude: Math.min(100, (avgNonVoteTps / 2000) * 100),
          velocity: 50,
          novelty: 30,
          confidence: 90,
          detectedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Error collecting network performance:', error);
    }

    try {
      // Get epoch info for staking data
      const epochInfo = await withRetry(() =>
        heliusRPC<{
          epoch: number;
          slotIndex: number;
          slotsInEpoch: number;
          absoluteSlot: number;
          transactionCount: number;
        }>('getEpochInfo', [])
      );

      if (epochInfo) {
        const epochProgress = (epochInfo.slotIndex / epochInfo.slotsInEpoch) * 100;
        signals.push({
          source: 'onchain',
          title: `Epoch ${epochInfo.epoch}: ${epochProgress.toFixed(1)}% complete`,
          description: `Current epoch ${epochInfo.epoch} is ${epochProgress.toFixed(1)}% complete. Total transaction count: ${epochInfo.transactionCount?.toLocaleString() || 'N/A'}.`,
          rawData: {
            epoch: epochInfo.epoch,
            epochProgress,
            absoluteSlot: epochInfo.absoluteSlot,
            transactionCount: epochInfo.transactionCount,
          },
          tags: ['epoch', 'network-state'],
          entities: ['solana-network', 'epoch'],
          magnitude: 30,
          velocity: 20,
          novelty: 20,
          confidence: 95,
          detectedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Error collecting epoch info:', error);
    }

    return signals;
  }

  private async collectTokenActivity(): Promise<RawSignal[]> {
    const signals: RawSignal[] = [];

    try {
      // Use Helius DAS API to find recently created assets/programs
      // Search for NFT collections and token activity
      const response = await withRetry(() =>
        heliusFetch<{
          result?: {
            items?: Array<{
              id: string;
              content?: { metadata?: { name?: string; symbol?: string; description?: string } };
              creators?: Array<{ address: string }>;
              grouping?: Array<{ group_key: string; group_value: string }>;
            }>;
            total?: number;
          };
        }>('/token-metadata', {})
      ).catch(() => null);

      // Alternative: collect program activity via enhanced transactions
      const recentTxns = await withRetry(() =>
        heliusFetch<Array<{
          description: string;
          type: string;
          source: string;
          fee: number;
          feePayer: string;
          signature: string;
          slot: number;
          timestamp: number;
          nativeTransfers?: Array<{ amount: number }>;
          tokenTransfers?: Array<{ tokenAmount: number; mint: string }>;
          accountData?: Array<{ account: string; nativeBalanceChange: number }>;
        }>>(`/addresses/So11111111111111111111111111111111111111112/transactions`, { limit: '20' })
      ).catch(() => []);

      if (recentTxns && recentTxns.length > 0) {
        // Analyze transaction types
        const typeCounts: Record<string, number> = {};
        const sourceCounts: Record<string, number> = {};
        let totalFees = 0;

        for (const tx of recentTxns) {
          typeCounts[tx.type] = (typeCounts[tx.type] || 0) + 1;
          sourceCounts[tx.source] = (sourceCounts[tx.source] || 0) + 1;
          totalFees += tx.fee || 0;
        }

        const topTypes = Object.entries(typeCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        const topSources = Object.entries(sourceCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        signals.push({
          source: 'onchain',
          title: `SOL transaction patterns: ${topTypes.map(([t, c]) => `${t}(${c})`).join(', ')}`,
          description: `Recent SOL transaction analysis shows ${recentTxns.length} transactions. Top types: ${topTypes.map(([t, c]) => `${t}: ${c}`).join(', ')}. Top sources: ${topSources.map(([s, c]) => `${s}: ${c}`).join(', ')}.`,
          rawData: {
            transactionCount: recentTxns.length,
            typeCounts,
            sourceCounts,
            averageFee: totalFees / recentTxns.length,
          },
          tags: ['transactions', 'sol', ...topSources.map(([s]) => s.toLowerCase())],
          entities: ['sol', ...topSources.map(([s]) => s.toLowerCase())],
          magnitude: 50,
          velocity: 50,
          novelty: 40,
          confidence: 85,
          detectedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Error collecting token activity:', error);
    }

    return signals;
  }
}
