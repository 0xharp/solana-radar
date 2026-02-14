'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IdeaRow } from '@/types/database';
import { Lightbulb, Target, Wrench, Sparkles } from 'lucide-react';

interface IdeaCardProps {
  idea: IdeaRow;
  index: number;
}

export function IdeaCard({ idea, index }: IdeaCardProps) {
  return (
    <Link href={`/ideas/${idea.id}`}>
      <Card className="glass hover:shadow-xl hover:scale-[1.01] transition-all cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <Lightbulb className="h-4 w-4 text-chart-4" />
              Idea {index + 1}: {idea.title}
            </CardTitle>
            <div className="flex gap-1 shrink-0">
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 text-[10px] py-0">
                Feasibility: {idea.feasibility_score}/10
              </Badge>
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 text-[10px] py-0">
                Impact: {idea.impact_score}/10
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{idea.description}</p>

          <div className="space-y-3 text-xs">
            <div className="space-y-1 rounded-md bg-white/40 p-3">
              <div className="flex items-center gap-1 font-medium">
                <Target className="h-3 w-3 text-chart-2" />
                Target User
              </div>
              <p className="text-muted-foreground leading-relaxed">{idea.target_user}</p>
            </div>
            <div className="space-y-1 rounded-md bg-white/40 p-3">
              <div className="flex items-center gap-1 font-medium">
                <Wrench className="h-3 w-3 text-chart-3" />
                Technical Approach
              </div>
              <p className="text-muted-foreground leading-relaxed">{idea.technical_approach}</p>
            </div>
            <div className="space-y-1 rounded-md bg-white/40 p-3">
              <div className="flex items-center gap-1 font-medium">
                <Sparkles className="h-3 w-3 text-chart-1" />
                Differentiation
              </div>
              <p className="text-muted-foreground leading-relaxed">{idea.differentiation}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
