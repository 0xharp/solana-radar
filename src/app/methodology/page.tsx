import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function MethodologyPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Methodology</h1>
        <p className="text-muted-foreground text-sm mt-1">
          How we detect emerging narratives — our approach prioritizes verifiable evidence over LLM hallucinations
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Core Principle: Evidence-First Detection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            Most narrative detection tools simply ask an LLM &ldquo;what&rsquo;s trending?&rdquo; — producing plausible-sounding but unverifiable analysis.
            Our approach is fundamentally different: <strong>every narrative links back to timestamped, quantified data points</strong>.
          </p>
          <p>
            The pipeline is split into two independent jobs:
          </p>
          <p>
            <strong>Job 1 (Daily Collection):</strong> Raw Data &rarr; Scored Signal &rarr; Z-Score Anomaly Detection &rarr; Stored in DB.
          </p>
          <p>
            <strong>Job 2 (Analysis — on-demand):</strong> 14 Days of Signals &rarr; Entity Normalization &rarr; Cross-Source Correlation &rarr; Agglomerative Clustering &rarr; LLM Synthesis &rarr; Narrative + Batch Idea Generation.
          </p>
          <p>
            LLMs are used for synthesis and idea generation only — the actual detection, scoring, correlation and clustering is purely algorithmic. We use just <strong>2 LLM calls per analysis run</strong> (not per day), keeping costs minimal while maximizing context.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge className="bg-chart-1">Step 1</Badge>
              <CardTitle className="text-base">Multi-Source Data Collection</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>We collect from 7 distinct data source categories, split by collection strategy:</p>
            <p className="font-medium text-foreground mt-2">Event-based (incremental — only new data since last run):</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong>GitHub</strong> — Star velocity, commit frequency, new repos across 20+ Solana orgs. Uses <code>pushed:&gt;DATE</code> filters to only fetch repos active since last run.</li>
              <li><strong>Twitter/X</strong> — KOL monitoring (Toly, Mert, Raj Gokal, etc.), keyword tracking via SocialData API. Uses <code>since:DATE</code> search filter.</li>
              <li><strong>Reddit</strong> — r/solana and r/solanadev posts, filtered by creation date.</li>
              <li><strong>RSS / News</strong> — Helius Blog, Solana Foundation, CoinDesk, The Block. Articles filtered by publication date.</li>
            </ul>
            <p className="font-medium text-foreground mt-2">Snapshot (point-in-time — each run captures current state):</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong>On-chain (Helius)</strong> — Network TPS, epoch info, transaction patterns. RPC methods return live measurements; daily snapshots track evolution.</li>
              <li><strong>DeFi (DeFiLlama)</strong> — Chain TVL, protocol TVL changes, DEX volumes. API returns current state with built-in 1d/7d/30d change percentages.</li>
              <li><strong>Market (CoinGecko)</strong> — SOL price, 30 ecosystem tokens, trending coins. Returns current prices with pre-computed change metrics.</li>
            </ul>
            <p className="text-muted-foreground">
              Each data point becomes a <strong>raw signal</strong> with source attribution, timestamps, and extracted entities. First run looks back 14 days; subsequent runs only fetch new data. Rate limiters ensure we respect every API.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge className="bg-chart-2">Step 2</Badge>
              <CardTitle className="text-base">Composite Signal Scoring</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>Each signal receives a composite score (0-100) from four weighted dimensions:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong>Magnitude (25%)</strong> — How large is this signal? (TVL size, star count, volume)</li>
              <li><strong>Velocity (30%)</strong> — How fast is it changing? (Weighted highest — we care about EMERGING trends)</li>
              <li><strong>Novelty (25%)</strong> — How new or unexpected is this? (New repos, big price moves score higher)</li>
              <li><strong>Confidence (20%)</strong> — How reliable is the data source?</li>
            </ul>
            <p className="text-muted-foreground">
              Velocity is weighted highest because our goal is to detect trends <em>before</em> they&apos;re obvious.
              Signals are classified as <strong>extreme</strong> (&ge;75), <strong>strong</strong> (&ge;55), <strong>medium</strong> (&ge;35), or <strong>weak</strong>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge className="bg-chart-3">Step 3</Badge>
              <CardTitle className="text-base">Z-Score Anomaly Detection</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              Signals are compared against an up to 90-day rolling baseline per source category using z-score analysis to detect statistical anomalies:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong>Z &gt; 3</strong> — Extreme anomaly (very rare signal)</li>
              <li><strong>Z &gt; 2</strong> — Strong anomaly (notable deviation)</li>
              <li><strong>Z &gt; 1</strong> — Medium anomaly (mild deviation)</li>
            </ul>
            <p className="text-muted-foreground">
              Historical metrics are stored per-source after each collection run, building a baseline over time. Early runs (before enough history exists) fall back to within-batch statistics — comparing each signal against others collected in the same run.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge className="bg-chart-4">Step 4</Badge>
              <CardTitle className="text-base">Entity Normalization &amp; Cross-Source Correlation</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              Entities are extracted from each signal and <strong>normalized to canonical forms</strong> so the same protocol is recognized across sources:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>&ldquo;jito-foundation&rdquo; (GitHub), &ldquo;Jito&rdquo; (DeFiLlama), &ldquo;JTO&rdquo; (CoinGecko) all map to <strong>jito</strong></li>
              <li>&ldquo;marinade-finance&rdquo;, &ldquo;mSOL&rdquo;, &ldquo;MNDE&rdquo; all map to <strong>marinade</strong></li>
              <li>Common suffixes (-foundation, -labs, -exchange, -protocol) are stripped automatically</li>
            </ul>
            <p className="text-muted-foreground">
              We then measure <strong>source diversity</strong> (how many different source types mention this entity),{' '}
              <strong>temporal density</strong> (are mentions clustering in time), and <strong>average score</strong>.
              Entities from 2+ source categories with score &gt;40 become <strong>narrative candidates</strong>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge className="bg-chart-5">Step 5</Badge>
              <CardTitle className="text-base">Agglomerative Clustering</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              High-scoring signals (composite &gt;30) are grouped into proto-narratives using Jaccard similarity on their normalized entity/tag sets:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Build entity co-occurrence matrix from normalized signal data</li>
              <li>Cluster signals with Jaccard similarity &gt;0.12 (with a cross-source bonus of +0.08 to prioritize multi-source clusters)</li>
              <li>Merge overlapping clusters (similarity &gt;0.25)</li>
              <li>Filter out overly generic entities (e.g. &ldquo;solana&rdquo;, &ldquo;defi&rdquo;) that would collapse everything into one cluster</li>
              <li>Rank by source diversity, then average score</li>
            </ul>
            <p className="text-muted-foreground">
              This produces 8-15 <strong>proto-narratives</strong> — algorithmically-detected signal clusters ready for synthesis.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Step 6</Badge>
              <CardTitle className="text-base">LLM Synthesis &amp; Idea Generation</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              <strong>Only at this stage</strong> do we use an LLM (Gemini 2.5 Flash, with Groq/Llama 3.3 70B as fallback). This step runs as part of the <strong>Analysis job</strong> (on-demand, not daily), reading a full 14-day signal window. The entire analysis uses just <strong>2 LLM calls</strong>:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong>Call 1 — Narrative Synthesis:</strong> All proto-narratives are sent in a single prompt. The LLM names each narrative, writes a detailed explanation referencing the evidence, and assigns confidence scores.</li>
              <li><strong>Call 2 — Batch Idea Generation:</strong> The top 5 narratives (by confidence) are sent in a single prompt. The LLM generates 1 highly specific product idea per narrative — with creative product names, detailed target users, specific Solana programs/SDKs to integrate, and differentiation against named competitors.</li>
            </ul>
            <p className="text-muted-foreground">
              The LLM cannot invent narratives — it can only describe what the algorithm already found.
              If synthesis fails, we fall back to algorithmic descriptions. Ideas are required to name specific on-chain programs, CPIs, and SDKs — no generic &ldquo;dashboards&rdquo; allowed.
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Technical Architecture</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium mb-1">Frontend</h4>
              <p className="text-muted-foreground">Next.js 16, shadcn/ui, Tailwind CSS v4, Plus Jakarta Sans</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Backend</h4>
              <p className="text-muted-foreground">Next.js API Routes, Supabase (PostgreSQL), Gemini 2.5 Flash (primary), Groq/Llama 3.3 70B (fallback)</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Data Sources</h4>
              <p className="text-muted-foreground">GitHub API, Helius RPC, DeFiLlama, CoinGecko, RSS feeds, Reddit, Twitter/X (SocialData API)</p>
            </div>
          </div>
          <Separator className="my-2" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium mb-1">LLM Efficiency</h4>
              <p className="text-muted-foreground">2 API calls per analysis run (1 synthesis + 1 batch ideas) — not per day. Swappable provider abstraction supports Gemini, Groq, and GLM.</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Evidence Chain</h4>
              <p className="text-muted-foreground">Every narrative links to raw data points, scored signals, entity correlations, and cluster metadata — fully auditable.</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Two-Job Architecture</h4>
              <p className="text-muted-foreground">Data collection runs daily via cron, accumulating signals incrementally. Analysis runs on-demand, reading a full 14-day window to produce narratives and ideas with maximum context.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
