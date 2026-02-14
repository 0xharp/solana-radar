# Solana Radar

**Detect emerging narratives and generate actionable product ideas for the Solana ecosystem.**

A production-quality tool that goes beyond "ask an LLM what's trending." Every detected narrative links back to **timestamped, quantified data points** through a verifiable evidence chain.

> Built for the [Superteam Earn Bounty: Narrative Detection & Idea Generation Tool](https://superteam.fun/earn/listing/develop-a-narrative-detection-and-idea-generation-tool/)

## Live Tool & Repository

- **Hosted Tool**: [solana-radar.vercel.app](https://solana-radar.vercel.app) _(update with actual URL after deployment)_
- **Repository**: [github.com/0xharp/solana-radar](https://github.com/0xharp/solana-radar)

## How It Works

The pipeline is split into two independent jobs:

```
Job 1 — Data Collection (automated, daily):
  Raw Data → Scored Signal → Z-Score Anomaly Detection → Stored in DB

Job 2 — Analysis (on-demand / fortnightly):
  14 Days of Signals → Cross-Source Correlation → Agglomerative Clustering
  → LLM Synthesis → Narratives + Product Ideas
```

### Why Two Jobs?

Running everything end-to-end on every cron cycle would generate near-duplicate ideas daily (since most data overlaps between consecutive runs). Instead:

- **Job 1 (Collect)** runs daily via cron, accumulating signals incrementally. Event-based sources (GitHub, Twitter, RSS, Reddit) only fetch data *since the last run*, while snapshot sources capture fresh state each time.
- **Job 2 (Analyze)** runs on-demand or fortnightly, reading the *full fortnight* of accumulated signals to produce narratives and ideas with maximum context. This means LLM calls happen once per analysis window — not once per day — producing higher-quality, non-redundant ideas.

### Pipeline Details

1. **Multi-Source Data Collection** — 7 independent collectors gather signals from GitHub, on-chain data (Helius), DeFi metrics (DeFiLlama), market data (CoinGecko), Twitter/X (SocialData API), Reddit, and RSS news feeds
2. **Composite Signal Scoring** — Each signal scored on 4 dimensions: magnitude (25%), velocity (30%), novelty (25%), confidence (20%). Velocity weighted highest to detect *emerging* trends
3. **Z-Score Anomaly Detection** — Signals compared against up to 90-day rolling baseline per source category. Z>3 = extreme, Z>2 = strong, Z>1 = medium. Early runs fall back to within-batch statistics
4. **Entity Normalization** — Canonical alias mapping so "jito-foundation" (GitHub), "Jito" (DeFiLlama), and "JTO" (CoinGecko) all resolve to the same entity
5. **Cross-Source Correlation** — Entity extraction + source diversity analysis. Entities from 2+ independent sources with score >40 = narrative candidate
6. **Agglomerative Clustering** — Jaccard similarity on entity/tag sets groups related signals into proto-narratives, with a cross-source bonus (+0.08) to reward multi-source clusters
7. **LLM Synthesis** — Gemini 2.5 Flash *synthesizes* algorithmically-detected clusters into named narratives with explanations (LLM doesn't detect — it describes)
8. **Idea Generation** — For the top narratives by confidence, concrete product ideas are generated with specific Solana programs/SDKs, target users, and named competitor differentiation

### Key Differentiator: Evidence Chain

Every narrative includes a full evidence chain showing exactly how it was detected:
- Raw data points (with source URLs and timestamps)
- Scored signals (composite score + strength rating)
- Cross-source correlations (entity mentions across data categories)
- Cluster statistics (signal count, entity count, average score)

**The LLM cannot invent narratives** — it can only describe what the algorithm already found. If LLM synthesis fails, we fall back to algorithmic descriptions while preserving the full evidence chain.

## Data Sources

Our 7 data sources fall into two categories based on how they handle time:

### Event-Based Sources (incremental collection)

These sources produce discrete, timestamped events. Each collection run only fetches data **since the last completed run** (first run defaults to 14-day lookback).

| Source | API | What We Collect |
|--------|-----|-----------------|
| **GitHub** | GitHub REST API | Star velocity, commit frequency, new repos across 20 Solana orgs (solana-labs, jito-foundation, jupiter-exchange, drift-labs, helius-labs, metaplex-foundation, raydium-io, orca-so, marinade-finance, pyth-network, and more) |
| **Twitter/X** | SocialData API | KOL monitoring — **Toly** (Anatoly Yakovenko), **Mert** (Helius), **Raj Gokal**, **Armani Ferrante** (Anchor), plus @solana, @solanafndn, @solanamobile, @superteam. Also keyword tracking for Solana ecosystem trends. Includes engagement weighting and spam filtering (20+ patterns) |
| **Reddit** | Reddit JSON API | r/solana and r/solanadev — top posts, upvote velocity, community discussion trends |
| **RSS / News** | RSS feeds | Helius Blog (developer content), Solana Foundation (official), CoinDesk (news), The Block (news) |

### Snapshot Sources (point-in-time capture)

These APIs return **current state** rather than historical events. Each daily run captures that day's snapshot, building a time series across multiple runs.

| Source | API | What We Collect |
|--------|-----|-----------------|
| **On-chain** | Helius RPC | Network TPS, epoch progress, transaction patterns. Daily snapshots track how on-chain activity evolves over the fortnight |
| **DeFi** | DeFiLlama API | Chain TVL, protocol TVL changes (1d/7d/30d), category rotation, DEX volumes across top Solana protocols |
| **Market** | CoinGecko API | SOL price trends, top 30 Solana ecosystem tokens by market cap, trending coins, ecosystem sentiment (gainers vs losers ratio) |

### How This Covers a Fortnight

- **First run**: Event-based sources look back 14 days. Snapshot sources capture current state.
- **Subsequent runs (daily)**: Event-based sources only fetch new data since last run (no duplicates). Snapshot sources capture fresh measurements.
- **After 14 days**: The database contains a complete fortnight of signals — event history from all sources plus daily snapshots of on-chain, DeFi, and market state.
- **Analysis job**: Reads all 14 days of accumulated signals, correlates across sources and time, and generates narratives grounded in the full dataset.

All data sources use free-tier APIs with rate limiting.

## Signal Detection & Ranking

### Composite Score (0-100)
```
score = magnitude * 0.25 + velocity * 0.30 + novelty * 0.25 + confidence * 0.20
```
- **Magnitude (25%)** — Size of the signal (TVL, star count, volume)
- **Velocity (30%)** — How fast is it changing? Weighted highest because we care about *emerging* trends
- **Novelty (25%)** — How new or unexpected is this signal?
- **Confidence (20%)** — Data source reliability

Signals are classified as **extreme** (>=75), **strong** (>=55), **medium** (>=35), or **weak**.

### Z-Score Anomaly Detection
```
z = (current_value - rolling_mean) / rolling_stddev
```
Computed against up to 90-day rolling baseline per source category. Historical metrics are stored after each collection run, building a baseline over time. On early runs (before enough history exists), the system falls back to within-batch statistics — comparing each signal against others collected in the same run.

### Cross-Source Correlation
```
narrative_candidate = entity_mentions >= 2 sources AND average_score > 40
```
Entities are normalized to canonical forms (e.g., "jito-foundation" → "jito", "mSOL" → "marinade") so the same protocol is recognized across all sources.

### Agglomerative Clustering
Signals with composite score >30 are grouped using Jaccard similarity (threshold: 0.12 with +0.08 cross-source bonus, merge at 0.25) on entity/tag sets. Generic entities like "solana" and "defi" are excluded to prevent over-merging. This produces 8-15 proto-narratives, ranked by source diversity then average score.

## Detected Narratives

Narratives are **dynamically detected** from the latest fortnightly data window and displayed live in the tool at [/narratives](https://solana-radar.vercel.app/narratives). Each narrative includes:

- **Title and summary** — LLM-synthesized description of the detected trend
- **Confidence score** — How strongly the data supports this narrative (0-100)
- **Status** — Emerging, active, or declining
- **Evidence chain** — Full audit trail from raw data → scored signals → correlations → cluster
- **Signal count and source diversity** — How many signals from how many independent sources

Narratives are **not invented by the LLM** — they are algorithmically detected through cross-source signal correlation and clustering. The LLM only names and describes what the algorithm found.

## Build Ideas

Product ideas are generated for the top narratives by confidence and displayed at [/ideas](https://solana-radar.vercel.app/ideas). Each idea includes:

- **Creative product name** — Not generic "dashboards" or "trackers"
- **Detailed description** — What the product does, what problem it solves, who benefits, why now
- **Target user** — Specific persona with pain points and context
- **Technical approach** — Names specific Solana programs, SDKs, APIs, and CPIs (e.g., "Use Jito's TipRouter program, integrate Jupiter v6 API, store preferences in PDA seeded by wallet pubkey")
- **Differentiation** — References actual competitors by name and explains how this idea differs
- **Feasibility & impact scores** — 1-10 ratings for buildability and market impact

Every idea is **tied to a specific narrative** — click through from any idea to see its parent narrative, evidence chain, and supporting signals.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), shadcn/ui, Tailwind CSS v4, Plus Jakarta Sans
- **Backend**: Next.js API Routes, Supabase (PostgreSQL)
- **LLM**: Gemini 2.5 Flash (synthesis only, 2 calls per analysis run). Swappable to Groq/Llama 3.3 70B
- **Hosting**: Vercel with automated daily data collection cron

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account (free tier)
- Gemini API key (free tier via Google AI Studio)
- GitHub token (optional, increases rate limit)
- Helius API key (optional, for on-chain data)
- SocialData API key (optional, for Twitter/X data)

### Setup

1. **Clone and install**
   ```bash
   git clone https://github.com/0xharp/solana-radar.git
   cd solana-radar
   npm install
   ```

2. **Set up Supabase**
   - Create a new Supabase project
   - Run the SQL migration in `supabase/migration.sql` via the SQL Editor
   - Copy the project URL and keys

3. **Configure environment**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your API keys
   ```

4. **Run locally**
   ```bash
   npm run dev
   ```

5. **Collect data** (runs automatically daily on Vercel, or trigger manually)
   ```bash
   curl -X POST http://localhost:3000/api/cron/run \
     -H "Authorization: Bearer your-cron-secret"
   ```

6. **Generate analysis** (or use the "Detect Narratives & Ideas" button on the Ideas/Narratives pages)
   ```bash
   curl -X POST http://localhost:3000/api/cron/analyze \
     -H "Authorization: Bearer your-cron-secret"
   ```

### Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Set environment variables in Vercel dashboard
4. Deploy — data collection cron runs automatically once per day
5. Trigger analysis via the "Detect Narratives & Ideas" button on the Ideas or Narratives pages

## Project Structure

```
src/
├── app/                          # Next.js App Router pages & API
│   ├── page.tsx                  # System overview dashboard
│   ├── ideas/
│   │   ├── page.tsx              # Ideas listing (primary view)
│   │   └── [id]/page.tsx         # Idea detail with narrative + signals
│   ├── narratives/
│   │   ├── page.tsx              # Narratives listing
│   │   └── [id]/page.tsx         # Narrative detail with ideas + evidence chain
│   ├── signals/page.tsx          # Signals explorer with filters
│   ├── methodology/page.tsx      # Methodology explanation
│   └── api/
│       ├── cron/run/             # Job 1: Data collection (daily cron)
│       ├── cron/analyze/         # Job 2: Narrative synthesis + idea generation
│       ├── trigger/              # UI proxy for triggering jobs
│       ├── ideas/                # Ideas API (list + detail)
│       ├── narratives/           # Narratives API (list + detail)
│       ├── signals/              # Signals API (paginated, filterable)
│       ├── runs/                 # Collection run history
│       └── health/               # Health check
├── lib/
│   ├── collectors/               # 7 data collectors
│   ├── engine/                   # Signal scorer, trend detector, correlator, clusterer, idea generator
│   ├── llm/                      # LLM abstraction (Gemini, Groq, GLM)
│   ├── config.ts                 # All tunable parameters (orgs, KOLs, thresholds, weights)
│   ├── supabase/                 # Database client
│   └── utils/                    # Rate limiter, retry, math, date utilities
├── components/                   # React components (dashboard, narrative, shared, ui)
├── hooks/                        # Data fetching hooks (useIdeas, useNarratives, useSignals)
└── types/                        # TypeScript types (database, domain, api)
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cron/run` | POST/GET | Job 1: Data collection (once daily via cron) |
| `/api/cron/analyze` | POST/GET | Job 2: Narrative synthesis + idea generation |
| `/api/trigger` | POST | UI proxy to trigger collect or analyze jobs |
| `/api/ideas` | GET | List all ideas (with time filter) |
| `/api/ideas/[id]` | GET | Idea detail with parent narrative + signals |
| `/api/narratives` | GET | List all narratives (with time filter) |
| `/api/narratives/[id]` | GET | Narrative detail with ideas + evidence chain |
| `/api/signals` | GET | Paginated signal explorer (source, strength, time filters) |
| `/api/runs` | GET | Collection run history |
| `/api/health` | GET | System health check |

## License

MIT
