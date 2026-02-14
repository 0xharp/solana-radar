'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useNarrative } from '@/hooks/use-narratives';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfidenceMeter } from '@/components/narrative/confidence-meter';
import { EvidenceChain } from '@/components/narrative/evidence-chain';
import { EvidenceChain as EvidenceChainType } from '@/types/domain';
import { ArrowLeft, Lightbulb, Zap, Target, ArrowRight } from 'lucide-react';

export default function NarrativeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { narrative, loading, error } = useNarrative(id);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !narrative) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{error || 'Narrative not found'}</p>
        <Link href="/narratives" className="text-sm text-primary hover:underline mt-2 inline-block">
          Back to Narratives
        </Link>
      </div>
    );
  }

  const evidenceChain = narrative.evidence_chain as unknown as EvidenceChainType;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link href="/narratives" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Narratives
      </Link>

      <div>
        <div className="flex items-start gap-3 mb-2">
          <h1 className="text-2xl font-bold">{narrative.title}</h1>
          <Badge variant={
            narrative.status === 'emerging' ? 'default' :
            narrative.status === 'active' ? 'secondary' : 'outline'
          }>{narrative.status}</Badge>
        </div>
        <p className="text-muted-foreground">{narrative.summary}</p>
        <div className="flex items-center gap-4 mt-3">
          <ConfidenceMeter score={narrative.confidence_score} size="lg" />
          <span className="text-sm text-muted-foreground">
            {narrative.signal_count} signals from {narrative.source_diversity} sources
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {narrative.tags?.map(tag => (
            <Badge key={tag} variant="outline">{tag}</Badge>
          ))}
        </div>
      </div>

      {/* Analysis */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap">
            {narrative.explanation}
          </div>
        </CardContent>
      </Card>

      {/* Linked Ideas */}
      {narrative.ideas?.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Linked Ideas ({narrative.ideas.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {narrative.ideas.map(idea => (
              <Link key={idea.id} href={`/ideas/${idea.id}`}>
                <Card className="glass h-full hover:shadow-xl hover:scale-[1.01] transition-all cursor-pointer">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm">{idea.title}</h3>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{idea.description}</p>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 text-[10px]">
                        <Zap className="h-3 w-3 mr-0.5" />
                        {idea.feasibility_score}/10
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 text-[10px]">
                        <Target className="h-3 w-3 mr-0.5" />
                        {idea.impact_score}/10
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Evidence Chain + Signals */}
      <div>
        {evidenceChain && <EvidenceChain chain={evidenceChain} />}
      </div>
    </div>
  );
}
