'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useNarratives } from '@/hooks/use-narratives';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfidenceMeter } from '@/components/narrative/confidence-meter';
import { TimeFilter } from '@/components/shared/time-filter';
import { AnalysisBanner } from '@/components/shared/analysis-banner';
import { ArrowRight, Lightbulb } from 'lucide-react';

export default function NarrativesPage() {
  const [timeFilter, setTimeFilter] = useState(336);
  const { narratives, loading, error, refetch } = useNarratives(timeFilter);

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Detected Narratives</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Emerging trends and narratives identified from cross-source signal analysis
          </p>
        </div>
        <TimeFilter value={timeFilter} onChange={setTimeFilter} />
      </div>

      <AnalysisBanner
        latestItemDate={narratives.length > 0 ? narratives[0].created_at : null}
        itemType="narratives"
        onAnalysisComplete={refetch}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      ) : narratives.length === 0 ? (
        <Card className="glass">
          <CardContent className="p-8 text-center text-muted-foreground">
            No narratives detected yet. Run a collection cycle to detect emerging trends.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {narratives.map(narrative => (
            <Link key={narrative.id} href={`/narratives/${narrative.id}`}>
              <Card className="glass h-full hover:shadow-xl hover:scale-[1.01] transition-all cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">{narrative.title}</CardTitle>
                    <Badge variant={
                      narrative.status === 'emerging' ? 'default' :
                      narrative.status === 'active' ? 'secondary' : 'outline'
                    } className="shrink-0 text-xs">
                      {narrative.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">{narrative.summary}</p>

                  <div className="flex items-center justify-between">
                    <ConfidenceMeter score={narrative.confidence_score} size="sm" />
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Lightbulb className="h-3 w-3" />
                      <span>{narrative.ideas?.length || 0} ideas</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {narrative.tags?.slice(0, 4).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                    <span>{narrative.signal_count} signals from {narrative.source_diversity} sources</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
