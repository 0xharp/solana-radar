'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EvidenceChain as EvidenceChainType } from '@/types/domain';
import { ArrowDown, Database, BarChart3, GitBranch, Layers } from 'lucide-react';

interface EvidenceChainProps {
  chain: EvidenceChainType;
}

export function EvidenceChain({ chain }: EvidenceChainProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-chart-1" />
        Evidence Chain
      </h3>

      {/* Step 1: Raw Data */}
      <Card className="border-chart-1/20">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs font-medium flex items-center gap-1.5">
            <Database className="h-3 w-3 text-chart-1" />
            Step 1: Raw Data Points ({chain.rawDataPoints.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {chain.rawDataPoints.map((dp, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <Badge variant="outline" className="shrink-0 text-[10px] py-0">{dp.source}</Badge>
                {dp.url ? (
                  <a href={dp.url} target="_blank" rel="noopener noreferrer" className="text-chart-1 hover:underline truncate">
                    {dp.title}
                  </a>
                ) : (
                  <span className="truncate">{dp.title}</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <ArrowDown className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Step 2: Scored Signals */}
      <Card className="border-chart-2/20">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs font-medium flex items-center gap-1.5">
            <BarChart3 className="h-3 w-3 text-chart-2" />
            Step 2: Scored Signals ({chain.scoredSignals.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {chain.scoredSignals.map((ss, i) => (
              <div key={i} className="flex items-center justify-between text-xs gap-2">
                <span className="truncate">{ss.title}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono">{ss.compositeScore.toFixed(0)}</span>
                  <Badge variant={
                    ss.strength === 'extreme' ? 'destructive' :
                    ss.strength === 'strong' ? 'default' : 'secondary'
                  } className="text-[10px] py-0">
                    {ss.strength}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <ArrowDown className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Step 3: Cross-Source Correlations */}
      <Card className="border-chart-3/20">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs font-medium flex items-center gap-1.5">
            <Layers className="h-3 w-3 text-chart-3" />
            Step 3: Cross-Source Correlations ({chain.correlations.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="space-y-1.5">
            {chain.correlations.map((corr, i) => (
              <div key={i} className="flex items-center justify-between text-xs gap-2">
                <span className="font-medium">{corr.entity}</span>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>{corr.sourceCount} sources</span>
                  <span className="font-mono">avg {corr.averageScore.toFixed(0)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <ArrowDown className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Step 4: Cluster Info */}
      <Card className="border-chart-4/20">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs font-medium flex items-center gap-1.5">
            <Layers className="h-3 w-3 text-chart-4" />
            Step 4: Narrative Cluster
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-lg font-bold">{chain.clusterInfo.signalCount}</div>
              <div className="text-[10px] text-muted-foreground">Signals</div>
            </div>
            <div>
              <div className="text-lg font-bold">{chain.clusterInfo.entityCount}</div>
              <div className="text-[10px] text-muted-foreground">Entities</div>
            </div>
            <div>
              <div className="text-lg font-bold">{chain.clusterInfo.averageScore.toFixed(0)}</div>
              <div className="text-[10px] text-muted-foreground">Avg Score</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
