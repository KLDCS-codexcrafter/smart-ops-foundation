/**
 * @file        src/pages/erp/comply360/vendor/MSMEForm1Page.tsx
 * @purpose     MSME Form 1 (delayed payments >45d) surface · consumes comply360-msme-form1-engine
 * @sprint      Sprint 73b · T-Phase-5.A.1.5-PASS-B · Block 4 · PATTERN-S70b
 * @disciplines FR-7 · FR-13 · FR-19
 */
import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RefreshCcw, FileJson, AlertTriangle, CheckCircle2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  buildMSMEForm1,
  type MSMEHalf,
} from '@/lib/comply360-msme-form1-engine';
import { useEntityCode } from '@/hooks/useEntityCode';

function inr(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

const HALVES: Array<{ value: MSMEHalf; label: string }> = [
  { value: 'H1', label: 'H1 FY25-26 (Apr–Sep)' },
  { value: 'H2', label: 'H2 FY25-26 (Oct–Mar)' },
];

function InnerSurface(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const [half, setHalf] = useState<MSMEHalf>('H2');
  const [refreshTick, setRefreshTick] = useState(0);
  const [jsonOpen, setJsonOpen] = useState(false);

  const result = useMemo(() => {
    if (!entityCode) return null;
    return buildMSMEForm1({ entity_code: entityCode, fy: 'FY25-26', half });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, half, refreshTick]);

  if (!entityId || entityId === 'all') {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Select a company to continue</h2>
          <p className="text-muted-foreground">Choose an entity from the header dropdown to view MSME Form 1.</p>
        </Card>
      </div>
    );
  }

  const payments = result?.payments ?? [];
  const overdue = payments.length;

  const handleDownload = (): void => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MSMEForm1_${entityCode}_FY25-26_${half}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('MSME Form 1 JSON downloaded');
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">MSME Form 1 · Half-Yearly Return</h1>
          <p className="text-muted-foreground text-sm">§15 MSMED Act · payments &gt; 45 days · §16 interest at 3× RBI bank rate</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={half} onValueChange={(v) => setHalf(v as MSMEHalf)}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {HALVES.map((h) => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setRefreshTick((t) => t + 1)}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Vendors</div>
          <div className="text-xl font-mono font-semibold mt-1">{result?.total_vendors ?? 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Invoices Delayed</div>
          <div className="text-xl font-mono font-semibold mt-1">{result?.total_invoices ?? 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Outstanding</div>
          <div className="text-xl font-mono font-semibold mt-1 text-amber-500">{inr(result?.total_outstanding ?? 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">§16 Interest</div>
          <div className="text-xl font-mono font-semibold mt-1 text-destructive">{inr(result?.total_interest_liability ?? 0)}</div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3 flex items-center gap-2">
          Delayed Payments
          {overdue > 0
            ? <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />{overdue} overdue</Badge>
            : <Badge className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="h-3 w-3 mr-1" />Clean</Badge>}
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Invoice No</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead className="text-right">Days Over</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No delayed MSME payments in {half}</TableCell></TableRow>
            )}
            {payments.map((p) => (
              <TableRow key={`${p.vendor_id}-${p.invoice_no}`}>
                <TableCell>{p.vendor_name || '—'}</TableCell>
                <TableCell className="font-mono">{p.invoice_no}</TableCell>
                <TableCell className="font-mono text-xs">{p.due_date}</TableCell>
                <TableCell className="text-right font-mono">{inr(p.amount_outstanding)}</TableCell>
                <TableCell className="text-right font-mono text-destructive">{p.days_outstanding}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={() => setJsonOpen(true)} disabled={!result}>
          <FileJson className="h-4 w-4 mr-1" /> Prepare Form 1
        </Button>
      </div>

      <Dialog open={jsonOpen} onOpenChange={setJsonOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>MSME Form 1 · {entityCode} · {half} FY25-26</DialogTitle></DialogHeader>
          <pre className="text-xs font-mono bg-muted p-3 rounded overflow-auto max-h-[50vh]">
            {result ? JSON.stringify(result, null, 2) : '—'}
          </pre>
          <DialogFooter>
            <Button onClick={handleDownload}>Download</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type SubTab = 'msme-form1';

export default function MSMEForm1Page(): JSX.Element {
  const [tab, setTab] = useState<SubTab>('msme-form1');
  return (
    <div className="p-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
        <TabsList>
          <TabsTrigger value="msme-form1">MSME Form 1</TabsTrigger>
        </TabsList>
        <TabsContent value="msme-form1"><InnerSurface /></TabsContent>
      </Tabs>
    </div>
  );
}
