'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useIdeas } from '@/hooks/use-ideas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TimeFilter } from '@/components/shared/time-filter';
import { AnalysisBanner } from '@/components/shared/analysis-banner';
import { Lightbulb, Zap, Target, ArrowRight, Layers } from 'lucide-react';

export default function IdeasPage() {
  const router = useRouter();
  const [timeFilter, setTimeFilter] = useState(336);
  const { ideas, loading, error, refetch } = useIdeas(timeFilter);

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Narrative-Based Ideas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Actionable product ideas generated from emerging Solana narratives
          </p>
        </div>
        <TimeFilter value={timeFilter} onChange={setTimeFilter} />
      </div>

      <AnalysisBanner
        latestItemDate={ideas.length > 0 ? ideas[0].created_at : null}
        itemType="ideas"
        onAnalysisComplete={refetch}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : ideas.length === 0 ? (
        <Card className="glass">
          <CardContent className="p-8 text-center text-muted-foreground">
            No ideas generated yet. Ideas are created from detected narratives.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ideas.map(idea => (
            <div key={idea.id} onClick={() => router.push(`/ideas/${idea.id}`)} className="cursor-pointer">
              <Card className="glass h-full hover:shadow-xl hover:scale-[1.01] transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight flex items-center gap-2">
                      <div className="rounded-lg bg-primary/10 p-1.5 shrink-0">
                        <Lightbulb className="h-4 w-4 text-primary" />
                      </div>
                      {idea.title}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                    {idea.description}
                  </p>

                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      Feasibility {idea.feasibility_score}/10
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 text-xs">
                      <Target className="h-3 w-3 mr-1" />
                      Impact {idea.impact_score}/10
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <Link
                      href={`/narratives/${idea.narratives.id}`}
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <Layers className="h-3 w-3" />
                      {idea.narratives.title}
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{idea.narratives.signal_count} signals</span>
                      <span>{idea.narratives.source_diversity} sources</span>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
