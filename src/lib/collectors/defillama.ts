import { RawSignal, Collector } from './types';
import { defillamaLimiter } from '@/lib/utils/rate-limiter';
import { withRetry } from '@/lib/utils/retry';
import { percentChange } from '@/lib/utils/math';
import { API_URLS } from '@/lib/config';

async function defillamaFetch<T>(path: string): Promise<T> {
  await defillamaLimiter.waitForSlot();
  const res = await fetch(`${API_URLS.defillama}${path}`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`DeFiLlama API error: ${res.status}`);
  return res.json() as Promise<T>;
}

interface DeFiLlamaProtocol {
  name: string;
  slug: string;
  url: string;
  category: string;
  chains: string[];
  tvl: number;
  change_1d: number | null;
  change_7d: number | null;
  change_1m: number | null;
  mcap?: number;
  logo?: string;
}

interface DeFiLlamaChainTVL {
  date: number;
  tvl: number;
}

export class DeFiLlamaCollector implements Collector {
  name = 'DeFiLlama';
  category = 'defi' as const;

  // DeFiLlama provides current TVL snapshots and pre-computed change percentages (1d/7d/30d).
  // The API doesn't support "since" filtering — each call returns current state.
  // Daily runs build a time series: each snapshot captures that day's TVL/volume state,
  // and the built-in change percentages already encode multi-day trends.
  async collect(_since?: Date): Promise<RawSignal[]> {
    const signals: RawSignal[] = [];

    // 1. Solana chain TVL trends
    const tvlSignals = await this.collectChainTVL();
    signals.push(...tvlSignals);

    // 2. Protocol-level TVL changes
    const protocolSignals = await this.collectProtocolTVL();
    signals.push(...protocolSignals);

    // 3. DEX volume data
    const dexSignals = await this.collectDEXVolumes();
    signals.push(...dexSignals);

    return signals;
  }

  private async collectChainTVL(): Promise<RawSignal[]> {
    const signals: RawSignal[] = [];

    try {
      const tvlData = await withRetry(() =>
        defillamaFetch<DeFiLlamaChainTVL[]>('/v2/historicalChainTvl/Solana')
      );

      if (tvlData && tvlData.length > 0) {
        const latest = tvlData[tvlData.length - 1];
        const weekAgo = tvlData[Math.max(0, tvlData.length - 8)];
        const monthAgo = tvlData[Math.max(0, tvlData.length - 31)];

        const weeklyChange = percentChange(latest.tvl, weekAgo.tvl);
        const monthlyChange = percentChange(latest.tvl, monthAgo.tvl);

        signals.push({
          source: 'defi',
          sourceUrl: 'https://defillama.com/chain/Solana',
          title: `Solana TVL: $${(latest.tvl / 1e9).toFixed(2)}B (${weeklyChange > 0 ? '+' : ''}${weeklyChange.toFixed(1)}% 7d)`,
          description: `Solana total value locked is $${(latest.tvl / 1e9).toFixed(2)}B. Weekly change: ${weeklyChange.toFixed(1)}%, Monthly change: ${monthlyChange.toFixed(1)}%. ${weeklyChange > 10 ? 'Significant capital inflow detected.' : weeklyChange < -10 ? 'Notable capital outflow detected.' : 'TVL is relatively stable.'}`,
          rawData: {
            currentTVL: latest.tvl,
            weekAgoTVL: weekAgo.tvl,
            monthAgoTVL: monthAgo.tvl,
            weeklyChange,
            monthlyChange,
            date: new Date(latest.date * 1000).toISOString(),
          },
          tags: ['tvl', 'solana-chain', 'capital-flows'],
          entities: ['solana-tvl', 'defi-ecosystem'],
          magnitude: Math.min(100, (latest.tvl / 1e10) * 50),
          velocity: Math.min(100, Math.abs(weeklyChange) * 3),
          novelty: Math.abs(weeklyChange) > 15 ? 70 : 30,
          confidence: 90,
          detectedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Error collecting chain TVL:', error);
    }

    return signals;
  }

  private async collectProtocolTVL(): Promise<RawSignal[]> {
    const signals: RawSignal[] = [];

    try {
      const protocols = await withRetry(() =>
        defillamaFetch<DeFiLlamaProtocol[]>('/protocols')
      );

      // Filter to Solana protocols
      const solanaProtocols = protocols
        .filter(p => p.chains?.includes('Solana') && p.tvl > 1_000_000)
        .sort((a, b) => (b.tvl || 0) - (a.tvl || 0));

      // Top protocols by TVL
      for (const protocol of solanaProtocols.slice(0, 15)) {
        const change7d = protocol.change_7d || 0;
        const change1m = protocol.change_1m || 0;

        // Only create signals for notable changes or top protocols
        const isTopProtocol = protocol.tvl > 100_000_000;
        const hasSignificantChange = Math.abs(change7d) > 15 || Math.abs(change1m) > 30;

        if (!isTopProtocol && !hasSignificantChange) continue;

        signals.push({
          source: 'defi',
          sourceUrl: `https://defillama.com/protocol/${protocol.slug}`,
          title: `${protocol.name}: $${(protocol.tvl / 1e6).toFixed(1)}M TVL (${change7d > 0 ? '+' : ''}${change7d.toFixed(1)}% 7d)`,
          description: `${protocol.name} (${protocol.category}) has $${(protocol.tvl / 1e6).toFixed(1)}M TVL on Solana. 7-day change: ${change7d.toFixed(1)}%, 30-day change: ${change1m.toFixed(1)}%. ${hasSignificantChange ? 'Significant TVL movement detected.' : 'Major Solana DeFi protocol.'}`,
          rawData: {
            name: protocol.name,
            slug: protocol.slug,
            category: protocol.category,
            tvl: protocol.tvl,
            change1d: protocol.change_1d,
            change7d: protocol.change_7d,
            change1m: protocol.change_1m,
            chains: protocol.chains,
          },
          tags: ['protocol-tvl', protocol.category?.toLowerCase() || 'defi', protocol.name.toLowerCase()],
          entities: [protocol.name.toLowerCase(), protocol.category?.toLowerCase() || 'defi'],
          magnitude: Math.min(100, (protocol.tvl / 1e9) * 30),
          velocity: Math.min(100, Math.abs(change7d) * 3),
          novelty: hasSignificantChange ? 60 : 25,
          confidence: 85,
          detectedAt: new Date(),
        });
      }

      // Detect category rotation
      const categoryTVL: Record<string, { total: number; count: number; avgChange: number }> = {};
      for (const p of solanaProtocols) {
        const cat = p.category || 'Other';
        if (!categoryTVL[cat]) categoryTVL[cat] = { total: 0, count: 0, avgChange: 0 };
        categoryTVL[cat].total += p.tvl;
        categoryTVL[cat].count++;
        categoryTVL[cat].avgChange += (p.change_7d || 0);
      }

      const rotations = Object.entries(categoryTVL)
        .map(([cat, data]) => ({ category: cat, tvl: data.total, avgChange: data.avgChange / data.count }))
        .filter(r => Math.abs(r.avgChange) > 10)
        .sort((a, b) => b.avgChange - a.avgChange);

      for (const rotation of rotations.slice(0, 3)) {
        signals.push({
          source: 'defi',
          sourceUrl: 'https://defillama.com/chains',
          title: `Category rotation: ${rotation.category} ${rotation.avgChange > 0 ? 'gaining' : 'losing'} (${rotation.avgChange.toFixed(1)}% avg 7d)`,
          description: `The ${rotation.category} category on Solana is ${rotation.avgChange > 0 ? 'attracting' : 'losing'} capital with an average 7-day change of ${rotation.avgChange.toFixed(1)}%. Total category TVL: $${(rotation.tvl / 1e6).toFixed(1)}M.`,
          rawData: {
            category: rotation.category,
            totalTVL: rotation.tvl,
            avgWeeklyChange: rotation.avgChange,
          },
          tags: ['category-rotation', rotation.category.toLowerCase(), 'tvl-shift'],
          entities: [rotation.category.toLowerCase(), 'defi-categories'],
          magnitude: Math.min(100, (rotation.tvl / 1e9) * 40),
          velocity: Math.min(100, Math.abs(rotation.avgChange) * 4),
          novelty: 65,
          confidence: 75,
          detectedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Error collecting protocol TVL:', error);
    }

    return signals;
  }

  private async collectDEXVolumes(): Promise<RawSignal[]> {
    const signals: RawSignal[] = [];

    try {
      const dexVolumes = await withRetry(() =>
        defillamaFetch<{
          totalDataChart: Array<[number, number]>;
          totalDataChartBreakdown: Array<[number, Record<string, Record<string, number>>]>;
          protocols: Array<{
            name: string;
            displayName: string;
            total24h: number | null;
            total7d: number | null;
            total30d: number | null;
            change_1d: number | null;
            change_7d: number | null;
            change_1m: number | null;
            chains: string[];
          }>;
        }>('/overview/dexs/Solana')
      );

      if (dexVolumes?.protocols) {
        const topDexes = dexVolumes.protocols
          .filter(d => (d.total24h || 0) > 1_000_000)
          .sort((a, b) => (b.total24h || 0) - (a.total24h || 0))
          .slice(0, 8);

        const totalVolume = topDexes.reduce((sum, d) => sum + (d.total24h || 0), 0);

        signals.push({
          source: 'defi',
          sourceUrl: 'https://defillama.com/dexs/Solana',
          title: `Solana DEX Volume: $${(totalVolume / 1e9).toFixed(2)}B (24h)`,
          description: `Top Solana DEXes processed $${(totalVolume / 1e9).toFixed(2)}B in 24h. Leaders: ${topDexes.slice(0, 3).map(d => `${d.displayName || d.name}: $${((d.total24h || 0) / 1e6).toFixed(0)}M`).join(', ')}.`,
          rawData: {
            totalVolume24h: totalVolume,
            dexes: topDexes.map(d => ({
              name: d.displayName || d.name,
              volume24h: d.total24h,
              volume7d: d.total7d,
              change1d: d.change_1d,
              change7d: d.change_7d,
            })),
          },
          tags: ['dex-volume', 'trading', 'liquidity'],
          entities: ['solana-dex', ...topDexes.slice(0, 5).map(d => (d.displayName || d.name).toLowerCase())],
          magnitude: Math.min(100, (totalVolume / 5e9) * 60),
          velocity: 50,
          novelty: 35,
          confidence: 90,
          detectedAt: new Date(),
        });

        // Individual DEX signals for notable volume changes
        for (const dex of topDexes) {
          const change7d = dex.change_7d || 0;
          if (Math.abs(change7d) > 20) {
            signals.push({
              source: 'defi',
              sourceUrl: 'https://defillama.com/dexs/Solana',
              title: `${dex.displayName || dex.name} volume ${change7d > 0 ? 'surge' : 'drop'}: ${change7d > 0 ? '+' : ''}${change7d.toFixed(0)}% (7d)`,
              description: `${dex.displayName || dex.name} DEX volume ${change7d > 0 ? 'surged' : 'dropped'} ${Math.abs(change7d).toFixed(0)}% over 7 days. Current 24h volume: $${((dex.total24h || 0) / 1e6).toFixed(1)}M.`,
              rawData: {
                name: dex.displayName || dex.name,
                volume24h: dex.total24h,
                change7d: dex.change_7d,
              },
              tags: ['dex-volume', (dex.displayName || dex.name).toLowerCase(), change7d > 0 ? 'volume-surge' : 'volume-drop'],
              entities: [(dex.displayName || dex.name).toLowerCase()],
              magnitude: Math.min(100, ((dex.total24h || 0) / 1e9) * 50),
              velocity: Math.min(100, Math.abs(change7d) * 2),
              novelty: 55,
              confidence: 85,
              detectedAt: new Date(),
            });
          }
        }
      }
    } catch (error) {
      console.error('Error collecting DEX volumes:', error);
    }

    return signals;
  }
}
