/**
 * @file     ScheduleMComplianceDashboard.tsx
 * @sprint   T-Phase-3.PROD-4.5 · Theme C · Q-LOCK-9 A
 * @purpose  Indian-statutory pharma GMP compliance scoring dashboard.
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import { computeScheduleMComplianceScore } from '@/lib/process-genealogy-engine';

function scoreInterpretation(score: number): { label: string; tone: 'default' | 'secondary' | 'destructive' } {
  if (score >= 80) return { label: 'Compliant', tone: 'default' };
  if (score >= 60) return { label: 'Improvement Needed', tone: 'secondary' };
  return { label: 'Critical Gaps', tone: 'destructive' };
}

export default function ScheduleMComplianceDashboard(): JSX.Element {
  const { entityCode } = useEntityCode();
  const score = useMemo(() => computeScheduleMComplianceScore(entityCode), [entityCode]);
  const interp = scoreInterpretation(score.overall_score);

  return (
    <div className="p-6 space-y-6 print:p-2">
      <div>
        <h1 className="text-2xl font-semibold">Schedule M (Indian GMP) Compliance</h1>
        <p className="text-sm text-muted-foreground">
          Entity: <span className="font-mono">{entityCode}</span> ·
          Batches: <span className="font-mono">{score.total_batches_assessed}</span> ·
          Recipes: <span className="font-mono">{score.total_recipes_assessed}</span>
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Overall Score</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-4">
            <div className="text-5xl font-mono font-bold">{score.overall_score}</div>
            <div className="text-muted-foreground">/ 100</div>
            <Badge variant={interp.tone} className="ml-4">{interp.label}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            ≥80 Compliant · 60-79 Improvement · &lt;60 Critical
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>8 Dimensions Breakdown</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dimension</TableHead>
                <TableHead className="font-mono">Weight</TableHead>
                <TableHead className="font-mono">Score</TableHead>
                <TableHead className="font-mono">Evidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {score.dimensions.map((d) => (
                <TableRow key={d.dimension}>
                  <TableCell>{d.dimension}</TableCell>
                  <TableCell className="font-mono">{(d.weight * 100).toFixed(0)}%</TableCell>
                  <TableCell className="font-mono">
                    <Badge variant={d.score >= 80 ? 'default' : d.score >= 60 ? 'secondary' : 'destructive'}>
                      {d.score}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">{d.evidence_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Generated at <span className="font-mono">{score.generated_at}</span> · Print-friendly for inspector handoff.
      </p>
    </div>
  );
}
