/**
 * @file        src/pages/erp/eximx/finance/HedgeContractList.tsx
 * @purpose     Hedge contracts list + maturity calendar
 * @sprint      T-Phase-1.EX-8-TT-Hedge-MonthEnd-DayBook-VoucherRuntime
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp } from 'lucide-react';
import { loadHedges } from '@/lib/hedge-contract-engine';
import type { HedgeContract } from '@/types/hedge-contract';

export function HedgeContractList(): JSX.Element {
  const entityCode = 'sinha-trading';
  const [hedges, setHedges] = useState<HedgeContract[]>([]);
  useEffect(() => { setHedges(loadHedges(entityCode)); }, []);

  const open = hedges.filter((h) => h.status === 'open');
  const totalNotionalInr = open.reduce((s, h) => s + h.notional_amount_inr_at_lock, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{hedges.length}</div><div className="text-xs text-muted-foreground">Total Hedge Contracts</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-primary">{open.length}</div><div className="text-xs text-muted-foreground">Open</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold font-mono">₹{totalNotionalInr.toLocaleString('en-IN')}</div><div className="text-xs text-muted-foreground">Notional Locked</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle><TrendingUp className="w-4 h-4 inline mr-2" />Hedge Contracts</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Contract No</TableHead><TableHead>Direction</TableHead><TableHead>Currency</TableHead><TableHead>Notional</TableHead><TableHead>Forward Rate</TableHead><TableHead>Maturity</TableHead><TableHead>Linked</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {hedges.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-mono">{h.hedge_contract_no}</TableCell>
                  <TableCell><Badge variant={h.direction === 'forward_sell' ? 'default' : 'secondary'}>{h.direction.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="font-mono">{h.currency_code}</TableCell>
                  <TableCell className="font-mono">{h.notional_amount_foreign.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="font-mono">{h.forward_rate_locked}</TableCell>
                  <TableCell>{h.maturity_date}</TableCell>
                  <TableCell className="text-xs">{h.is_speculative ? <Badge variant="outline">speculative</Badge> : <code>{h.linked_export_po_id ?? h.linked_import_po_id}</code>}</TableCell>
                  <TableCell><Badge variant="outline">{h.status.replace(/_/g, ' ')}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
