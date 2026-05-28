/**
 * @file        src/pages/erp/comply360/tds/Form16Page.tsx
 * @purpose     Comply360 · Form 16 (salary · §192) bulk certificate surface
 * @sprint      Sprint 74b · T-Phase-5.A.1.6-PASS-B · Block 5 · DP-S74-1
 * @disciplines FR-7 · FR-13 · FR-19 · FR-91 · FR-104 RECG
 * @reads-from  comply360-form16-engine (consumes S72 tds-aggregator · 0-DIFF)
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RefreshCcw, FileJson, BadgeCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { bulkGenerateForm16, type Form16Certificate } from '@/lib/comply360-form16-engine';
import { useEntityCode } from '@/hooks/useEntityCode';

function inr(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export default function Form16Page(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState<Form16Certificate | null>(null);

  const certs = useMemo<Form16Certificate[]>(() => {
    if (!entityCode) return [];
    return bulkGenerateForm16({ entity_code: entityCode, fy: 'FY25-26' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, tick]);

  if (!entityId || entityId === 'all') {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <BadgeCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Select a company to continue</h2>
          <p className="text-muted-foreground">Choose an entity from the header dropdown to generate Form 16.</p>
        </Card>
      </div>
    );
  }

  const totalTds = certs.reduce((s, c) => s + c.total_tds, 0);

  const download = (cert: Form16Certificate): void => {
    const blob = new Blob([JSON.stringify(cert, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cert.certificate_no}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${cert.certificate_no} downloaded`);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Form 16 · Salary TDS Certificates</h1>
          <p className="text-muted-foreground text-sm">§192 salary deductees · FY25-26 · bulk generated from TDS aggregator</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setTick((t) => t + 1)}>
          <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Certificates</div>
          <div className="text-xl font-mono font-semibold mt-1 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />{certs.length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Total TDS</div>
          <div className="text-xl font-mono font-semibold mt-1 text-amber-500">{inr(totalTds)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Source</div>
          <div className="mt-2"><Badge variant="secondary">S72 TDS Aggregator · 0-DIFF</Badge></div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Employees · FY25-26</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Certificate #</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>PAN</TableHead>
              <TableHead className="text-right">Gross Salary</TableHead>
              <TableHead className="text-right">Total TDS</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {certs.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No §192 salary deductions found for FY25-26</TableCell></TableRow>
            )}
            {certs.map((c) => (
              <TableRow key={c.certificate_no}>
                <TableCell className="font-mono text-xs">{c.certificate_no}</TableCell>
                <TableCell>{c.party_name}</TableCell>
                <TableCell className="font-mono">{c.pan ?? '—'}</TableCell>
                <TableCell className="text-right font-mono">{inr(c.part_b.gross_salary)}</TableCell>
                <TableCell className="text-right font-mono text-amber-500">{inr(c.total_tds)}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => setOpen(c)}>
                    <FileJson className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>{open?.certificate_no}</DialogTitle></DialogHeader>
          <pre className="text-xs font-mono bg-muted p-3 rounded overflow-auto max-h-[50vh]">
            {open ? JSON.stringify(open, null, 2) : '—'}
          </pre>
          <DialogFooter>
            <Button onClick={() => open && download(open)} disabled={!open}>Download</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
