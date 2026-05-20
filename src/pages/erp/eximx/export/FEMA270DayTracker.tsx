/**
 * @file        src/pages/erp/eximx/export/FEMA270DayTracker.tsx
 * @purpose     Moat #19 FEMA 270-day auto-alert dashboard · PRIMARY surface
 * @sprint      T-Phase-1.EX-7c-ExportRealisation-eBRC-FEMA
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Calendar } from 'lucide-react';
import { loadRealisations, summarizeRealisations } from '@/lib/export-realisation-engine';
import { FEMA_DAY_BANDS } from '@/types/export-realisation';
import type { ExportRealisation, FEMAState } from '@/types/export-realisation';

export function FEMA270DayTracker(): JSX.Element {
  const entityCode = 'sinha-trading';
  const [rs, setRs] = useState<ExportRealisation[]>([]);
  useEffect(() => { setRs(loadRealisations(entityCode)); }, []);
  const s = summarizeRealisations(rs);

  const stateColors: Record<FEMAState, string> = { safe: 'bg-green-600', attention: 'bg-yellow-500', warning: 'bg-orange-500', critical: 'bg-red-500', overdue: 'bg-red-700' };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">FEMA 270-Day Tracker</h1>
        <p className="text-sm text-muted-foreground">Moat #19 PRIMARY ANCHORED · 5-state auto-classifier · RBI mandate compliance</p>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {(['safe', 'attention', 'warning', 'critical', 'overdue'] as const).map((state) => (
          <Card key={state}><CardContent className="pt-6">
            <div className="text-2xl font-bold">{s.by_fema_state[state]}</div>
            <Badge variant="default" className={`${stateColors[state]} text-xs mt-1`}>{state}</Badge>
            <div className="text-xs text-muted-foreground mt-1">{FEMA_DAY_BANDS[state].min}-{FEMA_DAY_BANDS[state].max === 99999 ? '∞' : FEMA_DAY_BANDS[state].max}d</div>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle><Calendar className="w-4 h-4 inline mr-2" />FEMA Day-Band Reference (Moat #19)</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-1">
          {(['safe', 'attention', 'warning', 'critical', 'overdue'] as const).map((state) => (
            <div key={state}><Badge variant="default" className={`${stateColors[state]} mr-2`}>{state}</Badge>{FEMA_DAY_BANDS[state].description}</div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle><AlertTriangle className="w-4 h-4 inline mr-2" />Realisations by FEMA State</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Realisation</TableHead><TableHead>FEMA</TableHead><TableHead>Days</TableHead><TableHead>Deadline</TableHead><TableHead>Days Left</TableHead><TableHead className="text-right">Outstanding (₹)</TableHead></TableRow></TableHeader>
            <TableBody>
              {rs.slice().sort((a, b) => b.days_since_dispatch - a.days_since_dispatch).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.realisation_no}</TableCell>
                  <TableCell><Badge variant="default" className={stateColors[r.fema_state]}>{r.fema_state}</Badge></TableCell>
                  <TableCell>{r.days_since_dispatch}</TableCell>
                  <TableCell>{r.fema_270_day_deadline}</TableCell>
                  <TableCell className={270 - r.days_since_dispatch < 30 ? 'text-red-600 font-bold' : ''}>{270 - r.days_since_dispatch}</TableCell>
                  <TableCell className="text-right font-mono">{r.outstanding_inr.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
