import { RawSignal, Collector } from './types';
import { withRetry } from '@/lib/utils/retry';
import { API_URLS, RSS_FEEDS, REDDIT, USER_AGENT, TIME } from '@/lib/config';

interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet?: string;
  content?: string;
  categories?: string[];
  creator?: string;
}

async function fetchRSS(feedUrl: string): Promise<RSSItem[]> {
  try {
    // Use a simple RSS parsing approach via public RSS-to-JSON service
    const res = await fetch(`${API_URLS.rss2json}?rss_url=${encodeURIComponent(feedUrl)}&count=10`);
    if (!res.ok) return [];
    const data = await res.json();
    if (data.status !== 'ok') return [];
    return (data.items || []).map((item: Record<string, unknown>) => ({
      title: item.title as string || '',
      link: item.link as string || '',
      pubDate: item.pubDate as string || '',
      contentSnippet: (item.description as string || '').replace(/<[^>]*>/g, '').substring(0, 500),
      categories: item.categories as string[] || [],
      creator: item.author as string || '',
    }));
  } catch {
    return [];
  }
}

async function fetchRedditPosts(subreddit: string): Promise<RSSItem[]> {
  try {
    const res = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=${REDDIT.postsPerSubreddit}`, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data?.children || [])
      .filter((post: Record<string, unknown>) => {
        const d = post.data as Record<string, unknown>;
        return !d.stickied;
      })
      .map((post: Record<string, unknown>) => {
        const d = post.data as Record<string, unknown>;
        return {
          title: d.title as string || '',
          link: `https://reddit.com${d.permalink as string || ''}`,
          pubDate: new Date((d.created_utc as number || 0) * 1000).toISOString(),
          contentSnippet: (d.selftext as string || '').substring(0, 500),
          categories: [d.link_flair_text as string].filter(Boolean),
          creator: d.author as string || '',
        };
      });
  } catch {
    return [];
  }
}

function extractEntities(text: string): string[] {
  const entities: string[] = [];
  const lower = text.toLowerCase();

  const protocols = [
    'jupiter', 'jito', 'marinade', 'raydium', 'orca', 'drift', 'tensor',
    'helius', 'metaplex', 'phantom', 'solflare', 'marginfi', 'kamino',
    'sanctum', 'pyth', 'switchboard', 'wormhole', 'squads', 'dialect',
    'helium', 'render', 'hivemapper', 'drip', 'backpack', 'mad lads',
    'bonk', 'dogwifhat', 'jup', 'mango', 'serum', 'openbook',
  ];

  const concepts = [
    'depin', 'rwa', 'restaking', 'liquid staking', 'mev', 'intent',
    'account abstraction', 'compressed nft', 'cnft', 'token extensions',
    'token-2022', 'blinks', 'actions', 'firedancer', 'frankendancer',
    'validator', 'staking', 'airdrop', 'memecoin', 'ai agent',
    'payfi', 'defi', 'nft', 'gaming', 'mobile', 'saga',
  ];

  for (const p of protocols) {
    if (lower.includes(p)) entities.push(p);
  }
  for (const c of concepts) {
    if (lower.includes(c)) entities.push(c);
  }

  return [...new Set(entities)];
}

function extractTags(text: string, categories: string[]): string[] {
  const tags = new Set<string>();
  const lower = text.toLowerCase();

  if (lower.includes('defi') || lower.includes('tvl') || lower.includes('liquidity')) tags.add('defi');
  if (lower.includes('nft') || lower.includes('digital art') || lower.includes('collection')) tags.add('nft');
  if (lower.includes('depin') || lower.includes('physical infrastructure')) tags.add('depin');
  if (lower.includes('ai') || lower.includes('artificial intelligence') || lower.includes('machine learning')) tags.add('ai');
  if (lower.includes('gaming') || lower.includes('game')) tags.add('gaming');
  if (lower.includes('mobile') || lower.includes('saga') || lower.includes('phone')) tags.add('mobile');
  if (lower.includes('developer') || lower.includes('sdk') || lower.includes('framework')) tags.add('developer-tools');
  if (lower.includes('staking') || lower.includes('validator')) tags.add('staking');
  if (lower.includes('payment') || lower.includes('payfi')) tags.add('payments');
  if (lower.includes('governance') || lower.includes('dao')) tags.add('governance');
  if (lower.includes('mev') || lower.includes('jito')) tags.add('mev');
  if (lower.includes('token extension') || lower.includes('token-2022')) tags.add('token-extensions');

  for (const cat of categories) {
    if (cat) tags.add(cat.toLowerCase());
  }

  return [...tags];
}

export class RSSCollector implements Collector {
  name = 'RSS Feeds';
  category = 'rss' as const;

  async collect(since?: Date): Promise<RawSignal[]> {
    const signals: RawSignal[] = [];
    // Default lookback: 14 days for first run, otherwise since last collection
    const sinceDate = since || new Date(Date.now() - TIME.defaultLookbackDays * TIME.msPerDay);

    for (const feed of RSS_FEEDS) {
      try {
        const items = await withRetry(() => fetchRSS(feed.url), 2);

        for (const item of items) {
          const pubDate = new Date(item.pubDate);
          if (pubDate < sinceDate) continue;

          const fullText = `${item.title} ${item.contentSnippet || ''}`;
          const isSolanaRelated = fullText.toLowerCase().includes('solana') ||
            fullText.toLowerCase().includes('sol') ||
            feed.category === 'official' || feed.category === 'developer';

          if (!isSolanaRelated) continue;

          const entities = extractEntities(fullText);
          const tags = extractTags(fullText, item.categories || []);

          signals.push({
            source: 'rss',
            sourceUrl: item.link,
            title: `[${feed.name}] ${item.title}`,
            description: item.contentSnippet || item.title,
            rawData: {
              feedName: feed.name,
              feedCategory: feed.category,
              pubDate: item.pubDate,
              creator: item.creator,
              categories: item.categories,
            },
            tags: [feed.category, 'rss', ...tags],
            entities,
            magnitude: feed.category === 'official' ? 60 : feed.category === 'developer' ? 55 : 40,
            velocity: (Date.now() - pubDate.getTime()) < 3 * TIME.msPerDay ? 65 : 35,
            novelty: 60,
            confidence: feed.category === 'official' ? 85 : 65,
            detectedAt: pubDate,
          });
        }
      } catch (error) {
        console.error(`Error fetching RSS feed ${feed.name}:`, error);
      }
    }

    return signals;
  }
}

export class RedditCollector implements Collector {
  name = 'Reddit';
  category = 'reddit' as const;

  async collect(since?: Date): Promise<RawSignal[]> {
    const signals: RawSignal[] = [];
    // Default lookback: 14 days for first run
    const sinceDate = since || new Date(Date.now() - TIME.defaultLookbackDays * TIME.msPerDay);

    for (const subreddit of REDDIT.subreddits) {
      try {
        const posts = await withRetry(() => fetchRedditPosts(subreddit), 2);
        for (const post of posts.slice(0, 10)) {
          // Skip posts older than our since date
          const postDate = new Date(post.pubDate);
          if (postDate < sinceDate) continue;
          const fullText = `${post.title} ${post.contentSnippet || ''}`;
          const entities = extractEntities(fullText);
          const tags = extractTags(fullText, post.categories || []);

          signals.push({
            source: 'reddit',
            sourceUrl: post.link,
            title: `[r/${subreddit}] ${post.title}`,
            description: post.contentSnippet || post.title,
            rawData: {
              subreddit,
              pubDate: post.pubDate,
              creator: post.creator,
              flair: post.categories,
            },
            tags: ['reddit', subreddit, ...tags],
            entities,
            magnitude: 35,
            velocity: 50,
            novelty: 55,
            confidence: 50,
            detectedAt: new Date(post.pubDate),
          });
        }
      } catch (error) {
        console.error(`Error fetching Reddit r/${subreddit}:`, error);
      }
    }

    return signals;
  }
}
