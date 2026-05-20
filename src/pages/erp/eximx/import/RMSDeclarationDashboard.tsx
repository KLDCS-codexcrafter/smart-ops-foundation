/**
 * @file        src/pages/erp/eximx/import/RMSDeclarationDashboard.tsx
 * @purpose     Cross-BoE RMS lane analytics · prediction vs actual variance · Moat #2 surface
 * @sprint      T-Phase-1.EX-6-BillOfEntry-CustomsDuty-Demurrage-AutoPostedVouchers
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield } from 'lucide-react';
import { loadRMSDeclarations, computeLaneVariance } from '@/lib/rms-lane-engine';
import type { RMSDeclaration } from '@/types/rms-declaration';

export function RMSDeclarationDashboard(): JSX.Element {
  const entityCode = 'sinha-steel';
  const [decs, setDecs] = useState<RMSDeclaration[]>([]);
  useEffect(() => { setDecs(loadRMSDeclarations(entityCode)); }, []);

  const total = decs.length;
  const pending = decs.filter((d) => d.actual_lane === null).length;
  const resolved = total - pending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">RMS Declaration Dashboard</h1>
        <p className="text-sm text-muted-foreground">Moat #2 · prediction vs ICEGATE actual lane · variance tracking</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold font-mono">{total}</div><div className="text-xs text-muted-foreground">Total RMS</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-warning font-mono">{pending}</div><div className="text-xs text-muted-foreground">Pending ICEGATE</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-success font-mono">{resolved}</div><div className="text-xs text-muted-foreground">Resolved</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle><Shield className="w-4 h-4 inline mr-2" />RMS Register</CardTitle></CardHeader>
        <CardContent>
          {decs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No RMS declarations yet · file a BoE to auto-create</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>RMS ID</TableHead><TableHead>BoE</TableHead><TableHead>Declared</TableHead>
                <TableHead>Actual</TableHead><TableHead>Variance</TableHead><TableHead>Risk Factors</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {decs.map((d) => {
                  const v = computeLaneVariance(d.declared_lane, d.actual_lane);
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs">{d.id}</TableCell>
                      <TableCell className="font-mono text-xs">{d.related_boe_id ?? '—'}</TableCell>
                      <TableCell><Badge variant="outline">{d.declared_lane}</Badge></TableCell>
                      <TableCell>{d.actual_lane ? <Badge variant="outline">{d.actual_lane}</Badge> : <Badge variant="secondary">pending</Badge>}</TableCell>
                      <TableCell><Badge variant={v.variance === 'none' ? 'default' : 'outline'} title={v.description}>{v.variance}</Badge></TableCell>
                      <TableCell className="text-xs">{d.risk_factors.join(', ')}</TableCell>
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
