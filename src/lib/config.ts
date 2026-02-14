// ─── Solana Radar — Centralized Configuration ───
// All hardcoded constants, URLs, thresholds, and lists live here.
// Update this file instead of scattering magic values across the codebase.

// ─── API Endpoints ───

export const API_URLS = {
  github: 'https://api.github.com',
  helius: 'https://api.helius.xyz/v0',
  heliusRpc: 'https://mainnet.helius-rpc.com',
  defillama: 'https://api.llama.fi',
  coingecko: 'https://api.coingecko.com/api/v3',
  socialData: 'https://api.socialdata.tools/twitter/search',
  rss2json: 'https://api.rss2json.com/v1/api.json',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  glm: 'https://api.us-west-2.modal.direct/v1/chat/completions',
} as const;

// ─── LLM Models ───

export const LLM_MODELS = {
  gemini: 'gemini-2.5-flash',
  groq: 'llama-3.3-70b-versatile',
  glm: 'zai-org/GLM-5-FP8',
} as const;

// ─── Rate Limiter Settings ───
// { maxRequests, windowMs }

export const RATE_LIMITS = {
  github: { maxRequests: 28, windowMs: 60_000 },
  helius: { maxRequests: 8, windowMs: 1_000 },
  coingecko: { maxRequests: 25, windowMs: 60_000 },
  defillama: { maxRequests: 25, windowMs: 60_000 },
} as const;

// ─── Time Constants ───

export const TIME = {
  /** Analysis window — signals older than this are ignored during synthesis */
  analysisWindowDays: 14,
  /** Default lookback for first collection run (event-based sources) */
  defaultLookbackDays: 14,
  /** Historical baseline window for z-score computation */
  baselineWindowDays: 90,
  /** Milliseconds in one day */
  msPerDay: 86_400_000,
} as const;

// ─── Signal Scoring ───

export const SCORING = {
  weights: {
    magnitude: 0.25,
    velocity: 0.30,
    novelty: 0.25,
    confidence: 0.20,
  },
  strengthThresholds: {
    extreme: 75,
    strong: 55,
    medium: 35,
  },
} as const;

// ─── Z-Score Thresholds ───

export const Z_SCORE = {
  extreme: 3,
  strong: 2,
  medium: 1,
  trendRising: 0.5,
  trendFalling: -0.5,
} as const;

// ─── Clustering ───

export const CLUSTERING = {
  /** Minimum composite score for a signal to enter clustering */
  minSignalScore: 30,
  /** Jaccard similarity threshold for initial cluster assignment */
  initialThreshold: 0.12,
  /** Bonus added when signal comes from a different source than the cluster */
  crossSourceBonus: 0.08,
  /** Jaccard similarity threshold for merging overlapping clusters */
  mergeThreshold: 0.25,
  /** Maximum proto-narratives to output */
  maxProtoNarratives: 15,
  /** Minimum cluster size (signals) to be considered */
  minClusterSize: 2,
  /** Entities too generic to be useful for clustering */
  genericEntities: ['solana', 'defi', 'sol', 'crypto', 'blockchain', 'token', 'nft'],
} as const;

// ─── Correlation ───

export const CORRELATION = {
  /** Minimum source categories for a narrative candidate */
  minSourceDiversity: 2,
  /** Minimum average score for a narrative candidate */
  minAverageScore: 40,
  /** Minimum entity mentions to be included in correlations */
  minMentions: 2,
} as const;

// ─── Analysis ───

export const ANALYSIS = {
  /** Minimum signals required before analysis can run */
  minSignals: 50,
  /** Max signals to load from DB for analysis */
  maxSignalsToLoad: 1000,
  /** Top N narratives to generate ideas for */
  topNarrativesForIdeas: 5,
  /** Max proto-narratives to send to LLM for synthesis (matches maxProtoNarratives) */
  maxProtosForLLM: 15,
  /** Minimum narrative confidence to keep */
  minNarrativeConfidence: 30,
} as const;

// ─── GitHub Collector ───

export const GITHUB = {
  orgs: [
    'solana-labs', 'solana-foundation', 'jito-foundation', 'jupiter-exchange',
    'marinade-finance', 'drift-labs', 'tensor-hq', 'helius-labs',
    'metaplex-foundation', 'orca-so', 'project-serum', 'raydium-io',
    'squads-protocol', 'marginfi', 'kamino-finance', 'sanctum-so',
    'pyth-network', 'switchboard-xyz', 'wormhole-foundation', 'phantom',
  ],
  topics: [
    'solana', 'anchor-lang', 'spl-token', 'solana-program', 'solana-sdk',
    'solana-web3', 'solana-defi', 'solana-nft',
  ],
} as const;

// ─── Twitter/X Collector ───

export const TWITTER = {
  kols: [
    { handle: 'toly', name: 'Anatoly Yakovenko (Toly)', weight: 1.0 },
    { handle: 'mert', name: 'Mert (Helius)', weight: 0.9 },
    { handle: 'rajgokal', name: 'Raj Gokal', weight: 0.9 },
    { handle: 'armaniferrante', name: 'Armani Ferrante', weight: 0.85 },
    { handle: 'solana', name: 'Solana', weight: 0.8 },
    { handle: 'solanafndn', name: 'Solana Foundation', weight: 0.8 },
    { handle: 'solanamobile', name: 'Solana Mobile', weight: 0.8 },
    { handle: 'superteam', name: 'Superteam', weight: 0.8 },
  ],
  searchTerms: [
    'solana', 'SOL ecosystem', '$SOL', 'solana defi',
    'solana nft', 'firedancer', 'solana depin',
  ],
  /** Max search terms to query per run (to respect rate limits) */
  maxSearchTerms: 4,
  /** Max tweets per search term */
  maxTweetsPerTerm: 8,
  /** Min cleaned text length to not be considered low-quality */
  minTextLength: 30,
  /** Max cashtags before a tweet is considered spam */
  maxCashtags: 5,
} as const;

// ─── RSS Collector ───

export const RSS_FEEDS = [
  { name: 'Helius Blog', url: 'https://www.helius.dev/blog/rss.xml', category: 'developer' },
  { name: 'Solana Foundation', url: 'https://solana.com/news/rss.xml', category: 'official' },
  { name: 'CoinDesk Solana', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml&_website=coindesk', category: 'news' },
  { name: 'The Block', url: 'https://www.theblock.co/rss.xml', category: 'news' },
] as const;

// ─── Reddit Collector ───

export const REDDIT = {
  subreddits: ['solana', 'solanadev'],
  postsPerSubreddit: 15,
} as const;

// ─── Entity Recognition ───

export const ENTITY_LISTS = {
  /** Known Solana protocols for entity extraction */
  protocols: [
    'jupiter', 'jito', 'marinade', 'raydium', 'orca', 'drift', 'seeker',
    'helius', 'metaplex', 'phantom', 'solflare', 'marginfi', 'kamino',
    'sanctum', 'pyth', 'switchboard', 'wormhole', 'squads', 'dialect',
    'helium', 'render', 'hivemapper', 'drip', 'backpack',
    'bonk', 'dogwifhat', 'jup', 'mango', 'openbook', 'pumpfun', 'pump.fun',
  ],
  /** Solana ecosystem concepts */
  concepts: [
    'depin', 'rwa', 'restaking', 'liquid staking', 'mev', 'intent',
    'account abstraction', 'compressed nft', 'cnft', 'token extensions',
    'token-2022', 'blinks', 'actions', 'firedancer', 'frankendancer',
    'validator', 'staking', 'airdrop', 'memecoin', 'ai agent',
    'payfi', 'defi', 'nft', 'gaming', 'mobile', 'saga',
  ],
} as const;

// ─── Entity Normalization ───

export const ENTITY_ALIASES: Record<string, string> = {
  'solana-labs': 'solana', 'solana-foundation': 'solana', 'sol': 'solana',
  'solana-tvl': 'solana-defi', 'defi-ecosystem': 'solana-defi', 'defi-categories': 'solana-defi',
  'solana-dex': 'solana-defi', 'solana-ecosystem': 'solana',
  'jito-foundation': 'jito', 'jito-labs': 'jito', 'jto': 'jito',
  'jupiter-exchange': 'jupiter', 'jup': 'jupiter',
  'marinade-finance': 'marinade', 'mnde': 'marinade', 'msol': 'marinade',
  'raydium-io': 'raydium', 'ray': 'raydium',
  'drift-labs': 'drift', 'drift protocol': 'drift',
  'tensor-hq': 'tensor', 'tnsr': 'tensor',
  'helius-labs': 'helius',
  'metaplex-foundation': 'metaplex',
  'orca-so': 'orca',
  'squads-protocol': 'squads',
  'kamino-finance': 'kamino',
  'sanctum-so': 'sanctum',
  'pyth-network': 'pyth',
  'switchboard-xyz': 'switchboard',
  'wormhole-foundation': 'wormhole', 'w': 'wormhole',
  'anchor-lang': 'anchor',
  'liquid staking': 'liquid-staking', 'lending': 'lending', 'dexes': 'dexes',
};

export const ENTITY_STRIP_SUFFIXES = [
  '-foundation', '-labs', '-exchange', '-protocol',
  '-finance', '-hq', '-so', '-io', '-xyz', '-network',
];

// ─── User Agent ───

export const USER_AGENT = 'solana-radar/1.0';

// ─── UI Defaults ───

export const UI = {
  /** Default time filter in hours (14 days) */
  defaultTimeFilterHours: 336,
  /** Page size for signals table */
  signalsPageSize: 30,
} as const;
