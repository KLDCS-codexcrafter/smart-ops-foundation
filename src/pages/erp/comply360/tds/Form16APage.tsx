/**
 * @file        src/pages/erp/comply360/tds/Form16APage.tsx
 * @purpose     Comply360 · Form 16A (non-salary · §194x) bulk certificate surface
 * @sprint      Sprint 74b · T-Phase-5.A.1.6-PASS-B · Block 6 · DP-S74-1
 * @disciplines FR-7 · FR-13 · FR-19 · FR-91 · FR-104 RECG
 * @reads-from  comply360-form16-engine (consumes S72 tds-aggregator · 0-DIFF)
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RefreshCcw, FileJson, BadgeCheck } from 'lucide-react';
import { toast } from 'sonner';
import { bulkGenerateForm16A, type Form16ACertificate } from '@/lib/comply360-form16-engine';
import { useEntityCode } from '@/hooks/useEntityCode';

function inr(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

const QUARTERS: Array<'Q1' | 'Q2' | 'Q3' | 'Q4'> = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function Form16APage(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const [quarter, setQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q4');
  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState<Form16ACertificate | null>(null);

  const certs = useMemo<Form16ACertificate[]>(() => {
    if (!entityCode) return [];
    return bulkGenerateForm16A({ entity_code: entityCode, fy: 'FY25-26' }, quarter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, quarter, tick]);

  if (!entityId || entityId === 'all') {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <BadgeCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Select a company to continue</h2>
          <p className="text-muted-foreground">Choose an entity from the header dropdown to generate Form 16A.</p>
        </Card>
      </div>
    );
  }

  const totalTds = certs.reduce((s, c) => s + c.total_tds, 0);

  const download = (cert: Form16ACertificate): void => {
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
          <h1 className="text-2xl font-semibold">Form 16A · Non-salary TDS Certificates</h1>
          <p className="text-muted-foreground text-sm">§194x deductees · quarterly · bulk generated from TDS aggregator</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={quarter} onValueChange={(v) => setQuarter(v as 'Q1' | 'Q2' | 'Q3' | 'Q4')}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {QUARTERS.map((q) => <SelectItem key={q} value={q}>{q} FY25-26</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setTick((t) => t + 1)}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Certificates</div>
          <div className="text-xl font-mono font-semibold mt-1">{certs.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Total TDS · {quarter}</div>
          <div className="text-xl font-mono font-semibold mt-1 text-amber-500">{inr(totalTds)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Source</div>
          <div className="mt-2"><Badge variant="secondary">S72 TDS Aggregator · 0-DIFF</Badge></div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Deductees · {quarter} FY25-26</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Certificate #</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>PAN</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">TDS</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {certs.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No §194x deductions in {quarter}</TableCell></TableRow>
            )}
            {certs.map((c) => (
              <TableRow key={c.certificate_no}>
                <TableCell className="font-mono text-xs">{c.certificate_no}</TableCell>
                <TableCell>{c.party_name}</TableCell>
                <TableCell className="font-mono">{c.pan ?? '—'}</TableCell>
                <TableCell className="text-right font-mono">{inr(c.total_gross)}</TableCell>
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
