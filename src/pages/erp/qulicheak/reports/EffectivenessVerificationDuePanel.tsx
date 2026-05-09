/**
 * @file src/pages/erp/qulicheak/reports/EffectivenessVerificationDuePanel.tsx
 * @purpose List of CAPA effectiveness verifications (30/60/90-day) due within window
 * @who Quality Inspector · QA Manager
 * @when 2026-05-08
 * @sprint T-Phase-1.A.5.b-Qulicheak-CAPA-MTC-FAI · Block F.2 · T-Phase-1.A.5.d-2-AuditFix
 * @iso ISO 25010 Usability + Operability
 * @whom QA Manager
 * @decisions D-NEW-BH (verification 30/60/90 milestones)
 * @disciplines FR-21 · FR-50 · FR-30 · FR-29 (FormCarryForwardKit N/A here · read-only panel)
 * @reuses capa-engine.listVerificationsDueWithin · recordVerification · useEntityCode ·
 *         useEntityChangeEffect · useCurrentUser
 * @[JWT] reads via capa-engine.listVerificationsDueWithin · GET /api/qulicheak/capas/verifications/due
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityChangeEffect } from '@/hooks/useEntityChangeEffect';
import { listVerificationsDueWithin, recordVerification } from '@/lib/capa-engine';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from 'sonner';
import type { VerificationMilestone } from '@/types/capa';

const WINDOWS = [
  { v: 0,   label: 'Today' },
  { v: 7,   label: 'Within 7 days' },
  { v: 30,  label: 'Within 30 days' },
  { v: 90,  label: 'Within 90 days' },
];

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium' });
  } catch {
    return iso;
  }
}

function daysFromNow(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

export function EffectivenessVerificationDuePanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const [windowDays, setWindowDays] = useState<number>(30);
  const [version, setVersion] = useState(0);

  useEntityChangeEffect(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    const onCapa = (): void => setVersion((v) => v + 1);
    window.addEventListener('capa:effective:applied', onCapa);
    window.addEventListener('capa:ineffective:reopened', onCapa);
    window.addEventListener('focus', onCapa);
    return () => {
      window.removeEventListener('capa:effective:applied', onCapa);
      window.removeEventListener('capa:ineffective:reopened', onCapa);
      window.removeEventListener('focus', onCapa);
    };
  }, []);

  const rows = useMemo(() => {
    void version;
    return listVerificationsDueWithin(entityCode, windowDays);
  }, [entityCode, windowDays, version]);

  const verify = (capaId: string, milestone: VerificationMilestone, effective: boolean): void => {
    if (!user) { toast.error('User session not found'); return; }
    const updated = recordVerification(entityCode, user.id, capaId as never, milestone, effective);
    if (!updated) { toast.error('Failed to record verification'); return; }
    toast.success(`${milestone}-day verification · ${effective ? 'effective' : 'ineffective'}`);
    setVersion((v) => v + 1);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Effectiveness Verification Due</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {rows.length} verification{rows.length === 1 ? '' : 's'} pending · Entity {entityCode}
          </p>
        </div>
        <Select value={String(windowDays)} onValueChange={(v) => setWindowDays(Number(v))}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {WINDOWS.map((w) => (
              <SelectItem key={w.v} value={String(w.v)}>{w.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No CAPA effectiveness verifications due in this window.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono">CAPA</TableHead>
                  <TableHead>NCR</TableHead>
                  <TableHead>Milestone</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ capa, verification }) => {
                  const dn = daysFromNow(verification.scheduled_at);
                  const overdue = dn < 0;
                  const dueLabel = overdue
                    ? `${Math.abs(dn)}d overdue`
                    : dn === 0 ? 'Due today' : `${dn}d`;
                  return (
                    <TableRow key={`${capa.id}-${verification.milestone}`}>
                      <TableCell className="font-mono text-xs">{capa.id}</TableCell>
                      <TableCell className="font-mono text-xs">{capa.related_ncr_id ?? '—'}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline">{verification.milestone}-day</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {fmtDate(verification.scheduled_at)}
                        <span className={`ml-2 ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                          · {dueLabel}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant={overdue ? 'destructive' : 'secondary'}>
                          {overdue ? 'Overdue' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => verify(capa.id, verification.milestone, true)}
                        >
                          Effective
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => verify(capa.id, verification.milestone, false)}
                        >
                          Ineffective
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
