'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useIdea } from '@/hooks/use-ideas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfidenceMeter } from '@/components/narrative/confidence-meter';
import { ArrowLeft, Lightbulb, Target, Wrench, Sparkles, Layers, Zap, Radio, ExternalLink } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils/date';

export default function IdeaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { idea, loading, error } = useIdea(id);

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !idea) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{error || 'Idea not found'}</p>
        <Link href="/ideas" className="text-sm text-primary hover:underline mt-2 inline-block">
          Back to Ideas
        </Link>
      </div>
    );
  }

  const narrative = idea.narratives;
  const signals = narrative?.narrative_signals || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link href="/ideas" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Ideas
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-start gap-3 mb-3">
          <div className="rounded-xl bg-primary/10 p-2.5 shrink-0 mt-0.5">
            <Lightbulb className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{idea.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                <Zap className="h-3 w-3 mr-1" />
                Feasibility {idea.feasibility_score}/10
              </Badge>
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">
                <Target className="h-3 w-3 mr-1" />
                Impact {idea.impact_score}/10
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{idea.description}</p>
        </CardContent>
      </Card>

      {/* Detail Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Target className="h-4 w-4 text-chart-2" />
              Target User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">{idea.target_user}</p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Wrench className="h-4 w-4 text-chart-3" />
              Technical Approach
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">{idea.technical_approach}</p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-chart-4" />
              Differentiation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">{idea.differentiation}</p>
          </CardContent>
        </Card>
      </div>

      {/* Parent Narrative */}
      {narrative && (
        <Link href={`/narratives/${narrative.id}`}>
          <Card className="glass hover:shadow-xl transition-all cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Based on Narrative
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <h3 className="font-semibold">{narrative.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{narrative.summary}</p>
              <div className="flex items-center gap-4">
                <ConfidenceMeter score={narrative.confidence_score} size="sm" />
                <Badge variant={
                  narrative.status === 'emerging' ? 'default' :
                  narrative.status === 'active' ? 'secondary' : 'outline'
                }>{narrative.status}</Badge>
                <span className="text-xs text-muted-foreground">
                  {narrative.signal_count} signals / {narrative.source_diversity} sources
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Supporting Signals */}
      {signals.length > 0 && (
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Radio className="h-5 w-5 text-chart-1" />
              Supporting Signals ({signals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {signals.map(ns => (
                <div key={ns.signal_id} className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Badge variant="outline" className="text-[10px] shrink-0">{ns.signals.source}</Badge>
                    <span className="truncate">{ns.signals.title}</span>
                    {ns.signals.source_url && (
                      <a href={ns.signals.source_url} target="_blank" rel="noopener noreferrer" className="shrink-0" onClick={e => e.stopPropagation()}>
                        <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="font-mono text-xs">{ns.signals.composite_score.toFixed(0)}</span>
                    <Badge variant={
                      ns.signals.strength === 'extreme' ? 'destructive' :
                      ns.signals.strength === 'strong' ? 'default' : 'secondary'
                    } className="text-[10px]">
                      {ns.signals.strength}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatRelativeTime(ns.signals.detected_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
