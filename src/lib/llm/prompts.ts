export function narrativeSynthesisPrompt(protoNarratives: Array<{
  entities: string[];
  tags: string[];
  averageScore: number;
  sourceDiversity: number;
  signalSummaries: string[];
}>): string {
  return `You are an expert analyst of the Solana blockchain ecosystem. Analyze these algorithmically-detected signal clusters and synthesize them into coherent narratives.

Each cluster was detected through z-score anomaly detection and cross-source correlation — these are statistically significant patterns, not just keyword matches.

CLUSTERS:
${protoNarratives.map((pn, i) => `
Cluster ${i + 1}:
- Key Entities: ${pn.entities.join(', ')}
- Tags: ${pn.tags.join(', ')}
- Average Signal Score: ${pn.averageScore.toFixed(1)}/100
- Source Diversity: ${pn.sourceDiversity} distinct sources
- Signal Evidence:
${pn.signalSummaries.map(s => `  * ${s}`).join('\n')}
`).join('\n---\n')}

For each cluster, provide:
{
  "narratives": [
    {
      "clusterIndex": 0,
      "title": "Short, memorable narrative title (5-8 words)",
      "summary": "One-sentence summary of the narrative",
      "explanation": "2-3 paragraph detailed explanation of what's happening, why it matters for the Solana ecosystem, and what it signals about future development. Reference specific data points from the evidence.",
      "confidenceScore": 0-100,
      "status": "emerging|active|declining",
      "tags": ["tag1", "tag2"]
    }
  ]
}

RULES:
- Only synthesize narratives where the evidence genuinely supports a coherent trend
- Confidence score should reflect how strong the evidence is
- If a cluster doesn't form a coherent narrative, set confidenceScore below 30
- Be specific to Solana — reference actual protocols, programs, and ecosystem dynamics
- Distinguish between genuinely emerging trends vs. known ongoing developments`;
}

export function ideaGenerationPrompt(narrative: {
  title: string;
  summary: string;
  explanation: string;
  tags: string[];
  signalEvidence: string[];
}): string {
  return `You are a senior product strategist and technical architect specializing in the Solana ecosystem. You have deep knowledge of Solana programs, SDKs (Anchor, @solana/web3.js, @solana/kit), existing protocols, and current builder tools. Given this detected narrative, generate a concrete, highly specific product idea.

NARRATIVE: ${narrative.title}
SUMMARY: ${narrative.summary}
EXPLANATION: ${narrative.explanation}
TAGS: ${narrative.tags.join(', ')}
SIGNAL EVIDENCE:
${narrative.signalEvidence.map(s => `- ${s}`).join('\n')}

Generate exactly 1 product idea. This MUST be a specific, well-defined product — NOT a vague dashboard, tracker, or analytics tool unless the technical approach is highly novel.

QUALITY REQUIREMENTS:
- The title should be a creative product name (like "Drift Guard" or "Stake Router"), NOT a generic label like "DeFi Dashboard" or "Token Tracker"
- The description must be 4-6 sentences: what it does, the specific problem it solves, who benefits, and why NOW is the right time to build it given the narrative
- targetUser must be a specific persona with context (e.g. "DeFi yield farmers managing >$50K across 3+ Solana protocols who currently have no way to auto-rebalance between liquid staking providers based on real-time APY shifts")
- technicalApproach must name specific Solana programs, CPIs, SDKs, or protocols to integrate with. Mention specific on-chain accounts, instruction formats, or APIs. Example: "Use Jito's TipRouter program for MEV-aware routing, integrate with Jupiter Swap aggregator via their v6 API, store user preferences in a PDA seeded by wallet pubkey"
- differentiation must reference actual existing products by name and explain what gap this fills. Example: "Unlike Marinade's native staking which only supports their validator set, this aggregates across Marinade, Jito, and Sanctum to find optimal yield"

ANTI-PATTERNS (do NOT generate these):
- Generic dashboards ("Solana DeFi Dashboard", "Ecosystem Monitor")
- Vague AI/ML tools without specific model or data pipeline details
- Products that already exist (check against: Jupiter, Raydium, Marinade, Phantom, Backpack, Tensor, Drift, Kamino, Sanctum, marginfi)
- Ideas where the description is just a rephrasing of the title

Response format:
{
  "ideas": [
    {
      "title": "Creative product name (3-6 words)",
      "description": "4-6 sentence detailed description covering: what it does, the specific problem, who benefits, and why now",
      "targetUser": "Detailed persona with specific context and pain points (2-3 sentences)",
      "technicalApproach": "Specific Solana programs, CPIs, SDKs, APIs, and architecture. Name exact protocols to integrate with. Describe the on-chain and off-chain components (3-5 sentences)",
      "differentiation": "Name existing competing products and explain the specific gap this fills (2-3 sentences)",
      "feasibilityScore": 1-10,
      "impactScore": 1-10
    }
  ]
}`;
}

export function batchIdeaGenerationPrompt(narratives: Array<{
  index: number;
  title: string;
  summary: string;
  explanation: string;
  tags: string[];
  signalEvidence: string[];
}>): string {
  return `You are a senior product strategist and technical architect specializing in the Solana ecosystem. You have deep knowledge of Solana programs, SDKs (Anchor, @solana/web3.js, @solana/kit), existing protocols, and current builder tools. Given these detected narratives, generate ONE concrete product idea per narrative.

${narratives.map(n => `
NARRATIVE ${n.index + 1}: ${n.title}
SUMMARY: ${n.summary}
EXPLANATION: ${n.explanation}
TAGS: ${n.tags.join(', ')}
SIGNAL EVIDENCE:
${n.signalEvidence.map(s => `- ${s}`).join('\n')}
`).join('\n---\n')}

For EACH narrative above, generate exactly 1 product idea. Each MUST be a specific, well-defined product — NOT a vague dashboard, tracker, or analytics tool unless the technical approach is highly novel.

QUALITY REQUIREMENTS FOR EVERY IDEA:
- The title should be a creative product name (like "Drift Guard" or "Stake Router"), NOT a generic label like "DeFi Dashboard" or "Token Tracker"
- The description must be 4-6 sentences: what it does, the specific problem it solves, who benefits, and why NOW is the right time to build it given the narrative
- targetUser must be a specific persona with context (e.g. "DeFi yield farmers managing >$50K across 3+ Solana protocols who currently have no way to auto-rebalance between liquid staking providers based on real-time APY shifts")
- technicalApproach must name specific Solana programs, CPIs, SDKs, or protocols to integrate with. Mention specific on-chain accounts, instruction formats, or APIs. Example: "Use Jito's TipRouter program for MEV-aware routing, integrate with Jupiter Swap aggregator via their v6 API, store user preferences in a PDA seeded by wallet pubkey"
- differentiation must reference actual existing products by name and explain what gap this fills. Example: "Unlike Marinade's native staking which only supports their validator set, this aggregates across Marinade, Jito, and Sanctum to find optimal yield"
- Each idea MUST be substantially different from the others — address distinct user needs and distinct technical architectures

ANTI-PATTERNS (do NOT generate these):
- Generic dashboards ("Solana DeFi Dashboard", "Ecosystem Monitor", "Dev Hub", "Repo Insights")
- Vague AI/ML tools without specific model or data pipeline details
- Products that already exist (check against: Jupiter, Raydium, Marinade, Phantom, Backpack, Tensor, Drift, Kamino, Sanctum, marginfi)
- Ideas where the description is just a rephrasing of the title
- Multiple ideas that are basically the same concept applied to different protocols

Response format:
{
  "ideas": [
    {
      "narrativeIndex": 0,
      "title": "Creative product name (3-6 words)",
      "description": "4-6 sentence detailed description covering: what it does, the specific problem, who benefits, and why now",
      "targetUser": "Detailed persona with specific context and pain points (2-3 sentences)",
      "technicalApproach": "Specific Solana programs, CPIs, SDKs, APIs, and architecture. Name exact protocols to integrate with. Describe the on-chain and off-chain components (3-5 sentences)",
      "differentiation": "Name existing competing products and explain the specific gap this fills (2-3 sentences)",
      "feasibilityScore": 1-10,
      "impactScore": 1-10
    }
  ]
}

Generate exactly ${narratives.length} ideas — one per narrative. Prioritize high feasibility AND high impact. Every idea must be buildable with current Solana infrastructure.`;
}
