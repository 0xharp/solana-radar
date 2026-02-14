import { RawSignal, Collector } from './types';
import { coingeckoLimiter } from '@/lib/utils/rate-limiter';
import { withRetry } from '@/lib/utils/retry';
import { API_URLS } from '@/lib/config';

async function cgFetch<T>(path: string): Promise<T> {
  await coingeckoLimiter.waitForSlot();
  const res = await fetch(`${API_URLS.coingecko}${path}`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);
  return res.json() as Promise<T>;
}

interface CoinMarketData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency: number;
  price_change_percentage_30d_in_currency: number;
  market_cap_rank: number;
  ath: number;
  ath_change_percentage: number;
}

interface TrendingCoin {
  item: {
    id: string;
    name: string;
    symbol: string;
    market_cap_rank: number;
    data?: {
      price: number;
      price_change_percentage_24h?: Record<string, number>;
      market_cap?: string;
      total_volume?: string;
    };
  };
}

export class CoinGeckoCollector implements Collector {
  name = 'CoinGecko';
  category = 'market' as const;

  // CoinGecko provides current market snapshots with pre-computed change percentages (24h/7d/30d).
  // No "since" filtering available — each call returns current prices and market state.
  // Daily runs capture market evolution: price movements, volume shifts, and trending coins
  // naturally differ each day, building a market sentiment time series.
  async collect(_since?: Date): Promise<RawSignal[]> {
    const signals: RawSignal[] = [];

    // 1. SOL price and market data
    const solSignals = await this.collectSOLData();
    signals.push(...solSignals);

    // 2. Solana ecosystem tokens
    const ecosystemSignals = await this.collectEcosystemTokens();
    signals.push(...ecosystemSignals);

    // 3. Trending coins (check for Solana presence)
    const trendingSignals = await this.collectTrending();
    signals.push(...trendingSignals);

    return signals;
  }

  private async collectSOLData(): Promise<RawSignal[]> {
    const signals: RawSignal[] = [];

    try {
      const data = await withRetry(() =>
        cgFetch<CoinMarketData[]>(
          '/coins/markets?vs_currency=usd&ids=solana&sparkline=false&price_change_percentage=7d,30d'
        )
      );

      if (data && data.length > 0) {
        const sol = data[0];
        const change24h = sol.price_change_percentage_24h || 0;
        const change7d = sol.price_change_percentage_7d_in_currency || 0;
        const change30d = sol.price_change_percentage_30d_in_currency || 0;

        signals.push({
          source: 'market',
          sourceUrl: 'https://www.coingecko.com/en/coins/solana',
          title: `SOL: $${sol.current_price.toFixed(2)} (${change24h > 0 ? '+' : ''}${change24h.toFixed(1)}% 24h)`,
          description: `SOL trading at $${sol.current_price.toFixed(2)}. 24h: ${change24h.toFixed(1)}%, 7d: ${change7d.toFixed(1)}%, 30d: ${change30d.toFixed(1)}%. Market cap rank #${sol.market_cap_rank}. Volume: $${(sol.total_volume / 1e9).toFixed(2)}B. ${Math.abs(change7d) > 10 ? 'Significant weekly movement.' : ''}`,
          rawData: {
            price: sol.current_price,
            marketCap: sol.market_cap,
            volume: sol.total_volume,
            change24h,
            change7d,
            change30d,
            rank: sol.market_cap_rank,
            athChangePercent: sol.ath_change_percentage,
          },
          tags: ['sol-price', 'market-data', change7d > 5 ? 'bullish' : change7d < -5 ? 'bearish' : 'neutral'],
          entities: ['sol', 'solana'],
          magnitude: Math.min(100, (sol.market_cap / 1e11) * 50),
          velocity: Math.min(100, Math.abs(change7d) * 4),
          novelty: Math.abs(change24h) > 5 ? 50 : 20,
          confidence: 95,
          detectedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Error collecting SOL data:', error);
    }

    return signals;
  }

  private async collectEcosystemTokens(): Promise<RawSignal[]> {
    const signals: RawSignal[] = [];

    try {
      // Get Solana ecosystem tokens
      const tokens = await withRetry(() =>
        cgFetch<CoinMarketData[]>(
          '/coins/markets?vs_currency=usd&category=solana-ecosystem&order=market_cap_desc&per_page=30&sparkline=false&price_change_percentage=7d,30d'
        )
      );

      if (tokens) {
        // Analyze ecosystem trends
        const gainers = tokens.filter(t => (t.price_change_percentage_7d_in_currency || 0) > 15);
        const losers = tokens.filter(t => (t.price_change_percentage_7d_in_currency || 0) < -15);

        // Individual token signals for big movers
        for (const token of tokens.slice(0, 20)) {
          const change7d = token.price_change_percentage_7d_in_currency || 0;
          const change30d = token.price_change_percentage_30d_in_currency || 0;

          if (Math.abs(change7d) < 10 && token.market_cap_rank > 100) continue;

          signals.push({
            source: 'market',
            sourceUrl: `https://www.coingecko.com/en/coins/${token.id}`,
            title: `${token.name} (${token.symbol.toUpperCase()}): $${token.current_price < 0.01 ? token.current_price.toExponential(2) : token.current_price.toFixed(2)} (${change7d > 0 ? '+' : ''}${change7d.toFixed(1)}% 7d)`,
            description: `${token.name} ${Math.abs(change7d) > 20 ? (change7d > 0 ? 'surging' : 'falling') : 'trading'} at $${token.current_price < 0.01 ? token.current_price.toExponential(2) : token.current_price.toFixed(2)}. Market cap: $${(token.market_cap / 1e6).toFixed(1)}M. 7d: ${change7d.toFixed(1)}%, 30d: ${change30d.toFixed(1)}%.`,
            rawData: {
              id: token.id,
              symbol: token.symbol,
              price: token.current_price,
              marketCap: token.market_cap,
              volume: token.total_volume,
              change7d,
              change30d,
              rank: token.market_cap_rank,
            },
            tags: ['ecosystem-token', token.symbol.toLowerCase(), change7d > 10 ? 'gainer' : change7d < -10 ? 'loser' : 'stable'],
            entities: [token.name.toLowerCase(), token.symbol.toLowerCase()],
            magnitude: Math.min(100, (token.market_cap / 1e9) * 30),
            velocity: Math.min(100, Math.abs(change7d) * 3),
            novelty: Math.abs(change7d) > 25 ? 70 : 30,
            confidence: 85,
            detectedAt: new Date(),
          });
        }

        // Ecosystem-wide sentiment signal
        if (gainers.length > 0 || losers.length > 0) {
          const sentimentRatio = gainers.length / Math.max(1, gainers.length + losers.length);
          signals.push({
            source: 'market',
            title: `Solana ecosystem: ${gainers.length} gainers, ${losers.length} losers (7d >15%)`,
            description: `Of tracked Solana ecosystem tokens, ${gainers.length} are up >15% and ${losers.length} are down >15% over 7 days. Sentiment ratio: ${(sentimentRatio * 100).toFixed(0)}% bullish. ${sentimentRatio > 0.6 ? 'Ecosystem-wide bullish momentum.' : sentimentRatio < 0.4 ? 'Bearish pressure across ecosystem.' : 'Mixed sentiment.'}`,
            rawData: {
              gainersCount: gainers.length,
              losersCount: losers.length,
              sentimentRatio,
              topGainers: gainers.slice(0, 3).map(g => ({ name: g.name, change: g.price_change_percentage_7d_in_currency })),
              topLosers: losers.slice(0, 3).map(l => ({ name: l.name, change: l.price_change_percentage_7d_in_currency })),
            },
            tags: ['ecosystem-sentiment', sentimentRatio > 0.6 ? 'bullish' : sentimentRatio < 0.4 ? 'bearish' : 'mixed'],
            entities: ['solana-ecosystem', 'market-sentiment'],
            magnitude: 50,
            velocity: Math.min(100, (gainers.length + losers.length) * 5),
            novelty: 40,
            confidence: 80,
            detectedAt: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('Error collecting ecosystem tokens:', error);
    }

    return signals;
  }

  private async collectTrending(): Promise<RawSignal[]> {
    const signals: RawSignal[] = [];

    try {
      const trending = await withRetry(() =>
        cgFetch<{ coins: TrendingCoin[] }>('/search/trending')
      );

      if (trending?.coins) {
        const solanaTrending = trending.coins.filter(c =>
          c.item.id.includes('sol') ||
          c.item.name.toLowerCase().includes('solana') ||
          c.item.symbol.toLowerCase() === 'sol'
        );

        // Also check all trending coins for Solana ecosystem presence
        for (const coin of trending.coins.slice(0, 7)) {
          const isSolana = solanaTrending.includes(coin);
          signals.push({
            source: 'market',
            sourceUrl: `https://www.coingecko.com/en/coins/${coin.item.id}`,
            title: `Trending on CoinGecko: ${coin.item.name} (${coin.item.symbol.toUpperCase()})${isSolana ? ' [Solana]' : ''}`,
            description: `${coin.item.name} is trending on CoinGecko. Market cap rank: #${coin.item.market_cap_rank || 'unranked'}.${isSolana ? ' This is a Solana ecosystem token, indicating growing interest in the ecosystem.' : ''}`,
            rawData: {
              id: coin.item.id,
              name: coin.item.name,
              symbol: coin.item.symbol,
              rank: coin.item.market_cap_rank,
              isSolanaEcosystem: isSolana,
            },
            tags: ['trending', coin.item.symbol.toLowerCase(), isSolana ? 'solana-ecosystem' : 'cross-chain'],
            entities: [coin.item.name.toLowerCase(), coin.item.symbol.toLowerCase()],
            magnitude: coin.item.market_cap_rank ? Math.min(100, (1000 / coin.item.market_cap_rank) * 20) : 30,
            velocity: 70, // Trending implies high velocity
            novelty: 75,
            confidence: 70,
            detectedAt: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('Error collecting trending coins:', error);
    }

    return signals;
  }
}
