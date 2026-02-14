import { ProductIdea, SynthesizedNarrative } from '@/types/domain';
import { getLLMProvider } from '@/lib/llm/provider';
import { ideaGenerationPrompt, batchIdeaGenerationPrompt } from '@/lib/llm/prompts';

export async function generateIdeas(
  narrative: SynthesizedNarrative,
  signalEvidence: string[]
): Promise<ProductIdea[]> {
  const llm = getLLMProvider();

  const prompt = ideaGenerationPrompt({
    title: narrative.title,
    summary: narrative.summary,
    explanation: narrative.explanation,
    tags: narrative.tags,
    signalEvidence,
  });

  try {
    const result = await llm.generateJSON<{
      ideas: Array<{
        title: string;
        description: string;
        targetUser: string;
        technicalApproach: string;
        differentiation: string;
        feasibilityScore: number;
        impactScore: number;
      }>;
    }>(prompt, { temperature: 0.7, maxTokens: 4000 });

    return result.ideas.map(idea => ({
      title: idea.title,
      description: idea.description,
      targetUser: idea.targetUser,
      technicalApproach: idea.technicalApproach,
      differentiation: idea.differentiation,
      feasibilityScore: Math.min(10, Math.max(1, idea.feasibilityScore)),
      impactScore: Math.min(10, Math.max(1, idea.impactScore)),
    }));
  } catch (error) {
    console.error('Idea generation failed:', error);
    return [{
      title: `${narrative.title} - Builder Tool`,
      description: `A tool leveraging the ${narrative.title} trend to provide value to the Solana ecosystem.`,
      targetUser: 'Solana developers and power users',
      technicalApproach: 'Build on existing Solana programs and SDKs',
      differentiation: 'First-mover advantage in this emerging narrative',
      feasibilityScore: 6,
      impactScore: 6,
    }];
  }
}

// Batch generation: generates ideas for multiple narratives in a single LLM call
export async function generateIdeasBatch(
  narrativesWithEvidence: Array<{ narrative: SynthesizedNarrative; signalEvidence: string[] }>
): Promise<Map<number, ProductIdea>> {
  const llm = getLLMProvider();
  const results = new Map<number, ProductIdea>();

  const prompt = batchIdeaGenerationPrompt(
    narrativesWithEvidence.map((n, i) => ({
      index: i,
      title: n.narrative.title,
      summary: n.narrative.summary,
      explanation: n.narrative.explanation,
      tags: n.narrative.tags,
      signalEvidence: n.signalEvidence,
    }))
  );

  try {
    const result = await llm.generateJSON<{
      ideas: Array<{
        narrativeIndex: number;
        title: string;
        description: string;
        targetUser: string;
        technicalApproach: string;
        differentiation: string;
        feasibilityScore: number;
        impactScore: number;
      }>;
    }>(prompt, { temperature: 0.7, maxTokens: 8000 });

    for (const idea of result.ideas) {
      results.set(idea.narrativeIndex, {
        title: idea.title,
        description: idea.description,
        targetUser: idea.targetUser,
        technicalApproach: idea.technicalApproach,
        differentiation: idea.differentiation,
        feasibilityScore: Math.min(10, Math.max(1, idea.feasibilityScore)),
        impactScore: Math.min(10, Math.max(1, idea.impactScore)),
      });
    }
  } catch (error) {
    console.error('Batch idea generation failed, falling back to individual calls:', error);
    // Fallback: generate individually (uses more API calls)
    for (let i = 0; i < narrativesWithEvidence.length; i++) {
      const { narrative, signalEvidence } = narrativesWithEvidence[i];
      const ideas = await generateIdeas(narrative, signalEvidence);
      if (ideas[0]) results.set(i, ideas[0]);
    }
  }

  return results;
}
