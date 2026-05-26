/**
 * CARO20Disclosure.tsx — FAR-1 (Sprint 65) · CARO 2020 paragraph 3(i)
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { assessCAROParagraph3i } from '@/lib/caro-2020-engine';
import { useEntityCode } from '@/hooks/useEntityCode';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

export function CARO20DisclosurePanel({ entityCode }: { entityCode: string }) {
  const fyStart = '2025-04-01';
  const fyEnd = '2026-03-31';
  const result = useMemo(
    () => assessCAROParagraph3i(entityCode, fyStart, fyEnd),
    [entityCode],
  );

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            {result.overallPass
              ? <ShieldCheck className="h-5 w-5 text-success" />
              : <ShieldAlert className="h-5 w-5 text-destructive" />}
            CARO 2020 · Paragraph 3(i) Fixed Assets
          </h2>
          <p className="text-xs text-muted-foreground">
            FY {fyStart} → {fyEnd} · Entity {entityCode}
          </p>
        </div>
        <Badge variant={result.overallPass ? 'default' : 'destructive'} className="font-mono">
          {result.overallPass ? 'PASS' : 'FAIL'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {result.subRules.map(rule => (
          <Card key={rule.id} className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm">
                <span>{rule.label}</span>
                <Badge variant={rule.pass ? 'default' : 'destructive'}>
                  {rule.pass ? 'PASS' : 'FAIL'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1.5">
              <p>{rule.finding}</p>
              {rule.count > 0 && (
                <p className="font-mono text-muted-foreground">
                  Findings: {rule.count} · Evidence: {rule.evidence.join(', ')}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function CARO20Disclosure() {
  const { entityCode } = useEntityCode();
  return <CARO20DisclosurePanel entityCode={entityCode || DEFAULT_ENTITY_SHORTCODE} />;
}
