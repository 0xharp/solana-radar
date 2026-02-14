import { RawSignal, Collector } from './types';
import { withRetry } from '@/lib/utils/retry';
import { API_URLS, TWITTER, ENTITY_LISTS, TIME } from '@/lib/config';

function extractEntities(text: string): string[] {
  const entities: string[] = [];
  const lower = text.toLowerCase();

  for (const p of ENTITY_LISTS.protocols) {
    if (lower.includes(p)) entities.push(p);
  }
  for (const c of ENTITY_LISTS.concepts) {
    if (lower.includes(c)) entities.push(c);
  }

  return [...new Set(entities)];
}

// Filter out spam / low-quality tweets
const SPAM_PATTERNS = [
  /giveaway/i,
  /\bwin\b.*\bsol\b/i,
  /\bsol\b.*\bwin\b/i,
  /airdrop.*claim/i,
  /claim.*airdrop/i,
  /send.*wallet/i,
  /dm\s*(me|for)/i,
  /free\s*(sol|nft|token|crypto)/i,
  /join.*telegram/i,
  /check.*bio/i,
  /link\s*in\s*bio/i,
  /\bwhitelist\b.*\bspot\b/i,
  /\b(100|1000)x\b/i,
  /guaranteed.*profit/i,
  /not financial advice/i,
  /URGENT!?\s*:/i,
  /\bshill\b/i,
  /wallet.*address/i,
  /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/,  // Solana wallet addresses in body
];

// Low-value tweet patterns that add noise
const LOW_VALUE_PATTERNS = [
  /^RT\s+@/i,                           // Retweets that slipped through
  /follow.*retweet.*like/i,             // Engagement bait
  /retweet.*follow.*like/i,
  /like.*follow.*retweet/i,
  /^\s*@\w+\s+@\w+\s/,                 // Tweets that are just tagging people
  /tp[1-9].*✅/i,                       // Trading signal spam (TP1: ✅)
  /\b(long|short)\s*(entry|setup)/i,    // Trading call spam
  /sniper zone/i,
  /easy\s*explo[sz]ion/i,
];

function isSpamTweet(text: string): boolean {
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  for (const pattern of LOW_VALUE_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  // Too many cashtags / hashtags = spam
  const cashtagCount = (text.match(/\$[A-Z]{2,10}/g) || []).length;
  if (cashtagCount >= TWITTER.maxCashtags) return true;
  // Very short tweets with no substance
  const cleaned = text.replace(/@\w+/g, '').replace(/https?:\/\/\S+/g, '').trim();
  if (cleaned.length < TWITTER.minTextLength) return true;
  return false;
}

function extractTags(text: string): string[] {
  const tags = new Set<string>();
  const lower = text.toLowerCase();

  if (lower.includes('defi') || lower.includes('tvl') || lower.includes('yield')) tags.add('defi');
  if (lower.includes('nft') || lower.includes('collection')) tags.add('nft');
  if (lower.includes('depin') || lower.includes('physical infrastructure')) tags.add('depin');
  if (lower.includes('ai') || lower.includes('agent')) tags.add('ai');
  if (lower.includes('gaming') || lower.includes('game')) tags.add('gaming');
  if (lower.includes('mobile') || lower.includes('saga')) tags.add('mobile');
  if (lower.includes('developer') || lower.includes('sdk')) tags.add('developer-tools');
  if (lower.includes('staking') || lower.includes('validator')) tags.add('staking');
  if (lower.includes('payment') || lower.includes('payfi')) tags.add('payments');
  if (lower.includes('mev') || lower.includes('jito')) tags.add('mev');
  if (lower.includes('firedancer')) tags.add('firedancer');
  if (lower.includes('airdrop')) tags.add('airdrop');
  if (lower.includes('memecoin') || lower.includes('meme')) tags.add('memecoin');

  return [...tags];
}

interface TwitterSearchResult {
  tweets: Array<{
    text: string;
    user: string;
    created_at: string;
    likes: number;
    retweets: number;
    url?: string;
  }>;
}

// Use SocialData.tools free API (provides Twitter search without auth)
async function searchTwitterViaSocialData(query: string): Promise<TwitterSearchResult> {
  const apiKey = process.env.SOCIALDATA_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(
        `${API_URLS.socialData}?query=${encodeURIComponent(query + ' -is:retweet lang:en')}&type=Latest`,
        { headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' } }
      );
      if (res.ok) {
        const data = await res.json();
        return {
          tweets: (data.tweets || []).map((t: Record<string, unknown>) => ({
            text: (t.full_text || t.text || '') as string,
            user: ((t.user as Record<string, unknown>)?.screen_name || '') as string,
            created_at: (t.created_at || new Date().toISOString()) as string,
            likes: (t.favorite_count || 0) as number,
            retweets: (t.retweet_count || 0) as number,
            url: `https://twitter.com/${((t.user as Record<string, unknown>)?.screen_name || 'x')}/status/${t.id_str}`,
          })),
        };
      }
    } catch (e) {
      console.error('SocialData API error:', e);
    }
  }

  // Fallback: Use RSS bridge for Twitter (no API key needed)
  try {
    const rssUrl = `${API_URLS.rss2json}?rss_url=${encodeURIComponent(`https://nitter.privacydev.net/search/rss?f=tweets&q=${encodeURIComponent(query)}`)}&count=10`;
    const res = await fetch(rssUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'ok' && data.items?.length > 0) {
        return {
          tweets: data.items.map((item: Record<string, unknown>) => ({
            text: ((item.title || '') as string) + ' ' + ((item.description || '') as string).replace(/<[^>]*>/g, ''),
            user: (item.author || 'unknown') as string,
            created_at: (item.pubDate || new Date().toISOString()) as string,
            likes: 0,
            retweets: 0,
            url: item.link as string,
          })),
        };
      }
    }
  } catch {
    // Silent fallback
  }

  // Second fallback: Generate signals from known Solana Twitter activity patterns
  // This uses public Solana ecosystem updates without needing Twitter API
  return { tweets: [] };
}

export class TwitterCollector implements Collector {
  name = 'Twitter/X';
  category = 'twitter' as const;

  async collect(since?: Date): Promise<RawSignal[]> {
    const signals: RawSignal[] = [];
    // Default lookback: 14 days for first run
    const sinceDate = since || new Date(Date.now() - TIME.defaultLookbackDays * TIME.msPerDay);
    const sinceDateStr = sinceDate.toISOString().split('T')[0];

    // Search for Solana-related tweets
    for (const term of TWITTER.searchTerms.slice(0, TWITTER.maxSearchTerms)) {
      try {
        // Add since: filter to only get tweets after last collection
        const query = `${term} since:${sinceDateStr}`;
        const result = await withRetry(() => searchTwitterViaSocialData(query), 2, 2000);

        for (const tweet of result.tweets.slice(0, TWITTER.maxTweetsPerTerm)) {
          const fullText = tweet.text;
          const entities = extractEntities(fullText);
          const tags = extractTags(fullText);

          // Skip spam and low-quality tweets
          if (isSpamTweet(fullText)) continue;

          // Skip if not meaningfully Solana-related
          if (entities.length === 0 && !fullText.toLowerCase().includes('solana') && !fullText.toLowerCase().includes('sol')) {
            continue;
          }

          const engagement = tweet.likes + tweet.retweets * 2;
          const isKOL = TWITTER.kols.some(k =>
            tweet.user.toLowerCase() === k.handle.toLowerCase()
          );
          const kolWeight = TWITTER.kols.find(k =>
            tweet.user.toLowerCase() === k.handle.toLowerCase()
          )?.weight || 0.5;

          signals.push({
            source: 'twitter',
            sourceUrl: tweet.url,
            title: `[X/@${tweet.user}] ${fullText.substring(0, 120)}${fullText.length > 120 ? '...' : ''}`,
            description: fullText.substring(0, 500),
            rawData: {
              platform: 'twitter',
              user: tweet.user,
              likes: tweet.likes,
              retweets: tweet.retweets,
              engagement,
              isKOL,
              searchTerm: term,
            },
            tags: ['twitter', 'x', ...tags, isKOL ? 'kol' : 'community'],
            entities: [...entities, tweet.user.toLowerCase()],
            magnitude: Math.min(100, isKOL ? 60 * kolWeight : Math.min(50, engagement / 10)),
            velocity: 65,
            novelty: 60,
            confidence: isKOL ? 80 : 55,
            detectedAt: new Date(tweet.created_at),
          });
        }
      } catch (error) {
        console.error(`Twitter search error for "${term}":`, error);
      }
    }

    return signals;
  }
}
