/**
 * @file        ScorecardTile.tsx
 * @purpose     Compact KPI tile with RAG accent · recharts-free · built on shadcn Card.
 * @sprint      RPT-2a-i · Dashboard primitive
 * @[JWT]       N/A — pure presentation
 */
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { RAG_PALETTE, type RagStatus } from '@/lib/report-framework/rag';

export interface ScorecardTileProps {
  label: string;
  value: string | number;
  rag?: RagStatus;
  delta?: { value: number; direction: 'up' | 'down' };
  hint?: string;
}

export function ScorecardTile({ label, value, rag, delta, hint }: ScorecardTileProps): JSX.Element {
  const ragClass = rag ? RAG_PALETTE[rag] : '';
  return (
    <Card className="p-3" data-testid="scorecard-tile" data-rag={rag ?? 'none'}>
      <div className="flex items-center justify-between gap-2">
        <div className={`text-2xl font-bold font-mono ${ragClass}`}>{value}</div>
        {delta ? (
          <Badge variant="outline" className="gap-1 text-[10px]">
            {delta.direction === 'up' ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
            <span className="font-mono">{delta.value}</span>
          </Badge>
        ) : null}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {hint ? <div className="text-[10px] text-muted-foreground mt-1">{hint}</div> : null}
    </Card>
  );
}
