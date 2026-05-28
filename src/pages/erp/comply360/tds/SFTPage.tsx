/**
 * @file        src/pages/erp/comply360/tds/SFTPage.tsx
 * @purpose     NATIVE Comply360 SFT (Form 61A) detection + statement builder surface
 * @sprint      Sprint 72 · T-Phase-5.A.1.4 · Block 7 · DP-S72-4
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RefreshCcw, FileJson, AlertOctagon, Database } from 'lucide-react';
import { toast } from 'sonner';
import {
  detectSFTTransactions,
  buildSFTStatement,
  DEFAULT_SFT_SPECS,
} from '@/lib/comply360-sft-engine';
import { useEntityCode } from '@/hooks/useEntityCode';

function inr(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export default function SFTPage(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const [refreshTick, setRefreshTick] = useState(0);
  const [jsonOpen, setJsonOpen] = useState(false);

  const transactions = useMemo(() => {
    if (!entityCode) return [];
    return detectSFTTransactions({ entity_code: entityCode, fy: 'FY25-26' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, refreshTick]);

  const statement = useMemo(
    () => buildSFTStatement(transactions, entityCode, 'FY25-26'),
    [transactions, entityCode],
  );

  if (!entityId || entityId === 'all') {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Select a company to continue</h2>
          <p className="text-muted-foreground">Choose an entity to scan high-value SFT transactions.</p>
        </Card>
      </div>
    );
  }

  const handleDownload = (): void => {
    const blob = new Blob([JSON.stringify(statement, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SFT_Form61A_${entityCode}_FY25-26.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Form 61A statement downloaded');
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">SFT · Statement of Financial Transactions</h1>
          <p className="text-muted-foreground text-sm">Form 61A · high-value transaction detection · FY25-26</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setRefreshTick((t) => t + 1)}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button onClick={() => setJsonOpen(true)} disabled={statement.rows.length === 0}>
            <FileJson className="h-4 w-4 mr-1" /> Prepare 61A
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Reportable Txns</div>
          <div className="text-xl font-mono font-semibold mt-1">{statement.totals.transaction_count}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Total Amount</div>
          <div className="text-xl font-mono font-semibold mt-1 text-amber-500">{inr(statement.totals.total_amount)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Active Thresholds</div>
          <div className="text-xl font-mono font-semibold mt-1">{DEFAULT_SFT_SPECS.length}</div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">SFT Rows · By Code + Party</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SFT Code</TableHead>
              <TableHead>Party</TableHead>
              <TableHead>PAN</TableHead>
              <TableHead className="text-right">Txn Count</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {statement.rows.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No SFT-reportable transactions detected for FY25-26</TableCell></TableRow>
            )}
            {statement.rows.map((r) => (
              <TableRow key={`${r.sft_code}::${r.party_id}`}>
                <TableCell><Badge variant="secondary"><AlertOctagon className="h-3 w-3 mr-1" />{r.sft_code}</Badge></TableCell>
                <TableCell>{r.party_name}</TableCell>
                <TableCell className="font-mono">{r.pan ?? '—'}</TableCell>
                <TableCell className="text-right font-mono">{r.transaction_count}</TableCell>
                <TableCell className="text-right font-mono text-amber-500">{inr(r.total_amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={jsonOpen} onOpenChange={setJsonOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>Form 61A · {entityCode} · FY25-26</DialogTitle></DialogHeader>
          <pre className="text-xs font-mono bg-muted p-3 rounded overflow-auto max-h-[50vh]">
            {JSON.stringify(statement, null, 2)}
          </pre>
          <DialogFooter>
            <Button onClick={handleDownload}>Download</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
