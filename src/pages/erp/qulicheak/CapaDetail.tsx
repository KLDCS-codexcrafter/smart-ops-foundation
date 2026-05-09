/**
 * @file src/pages/erp/qulicheak/CapaDetail.tsx
 * @purpose CAPA read-only detail · 30-LOC stub per Step 2 §4 path (b) · full 8D editor in α-c
 * @sprint T-Phase-1.A.5.b-Qulicheak-CAPA-MTC-FAI
 * @decisions D-NEW-BD
 * @[JWT] reads via capa-engine.getCapaById
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEntityCode } from '@/hooks/useEntityCode';
import { getCapaById } from '@/lib/capa-engine';
import {
  CAPA_STATUS_LABELS, CAPA_SEVERITY_LABELS,
  type CapaId,
} from '@/types/capa';

interface Props {
  capaId: CapaId;
  onBack?: () => void;
}

export function CapaDetail({ capaId, onBack }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const capa = getCapaById(entityCode, capaId);

  if (!capa) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">CAPA {capaId} not found.</p>
        {onBack && <Button variant="outline" className="mt-4" onClick={onBack}>Back</Button>}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight font-mono">{capa.id}</h1>
          <p className="text-sm text-muted-foreground mt-1">{capa.title}</p>
        </div>
        {onBack && <Button variant="outline" onClick={onBack}>Back</Button>}
      </div>
      <div className="flex gap-2 flex-wrap">
        <Badge>{CAPA_STATUS_LABELS[capa.status]}</Badge>
        <Badge variant="secondary">{CAPA_SEVERITY_LABELS[capa.severity]}</Badge>
        {capa.related_ncr_id && <Badge variant="outline">NCR: {capa.related_ncr_id}</Badge>}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">8D Progression (read-only)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {capa.eight_d_steps.map((s) => (
              <div key={s.step} className="border rounded-lg p-3 text-xs">
                <div className="font-mono text-muted-foreground">D{s.step}</div>
                <div className="font-medium">{s.label.replace(/_/g, ' ')}</div>
                <Badge variant="outline" className="mt-1">{s.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Verifications (30 / 60 / 90 day)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {capa.verifications.map((v) => (
              <div key={v.milestone} className="border rounded-lg p-3 text-xs">
                <div className="font-mono">{v.milestone}-day</div>
                <div className="text-muted-foreground">
                  {new Date(v.scheduled_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                </div>
                <Badge variant="outline" className="mt-1">
                  {v.effective === null ? 'pending' : v.effective ? 'effective' : 'ineffective'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground italic">
        Full 8D editor (update step · 5 Whys · actions · verifications) ships in α-c.
      </p>
    </div>
  );
}
