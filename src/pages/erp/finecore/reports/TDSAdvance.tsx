/**
 * TDSAdvance.tsx — TDS Advance Tracking (fc-tds-advance)
 * TDS deducted on payments to vendors, challan management
 * Storage: erp_tds_challan_{entityCode}
 * [JWT] All data via hooks + new storage key
 */
import { useState, useMemo, useCallback } from 'react';
import { IndianRupee, Download, Plus, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useVouchers } from '@/hooks/useVouchers';
import { toast } from 'sonner';
import { onEnterNext } from '@/lib/keyboard';
import { inr, fyStart, today, exportCSV } from './reportUtils';

interface TDSAdvancePanelProps { entityCode: string; }

interface ChallanEntry { id: string; section: string; challanNo: string; bsrCode: string; date: string; amount: number; period: string; }

function loadChallans(entityCode: string): ChallanEntry[] {
  try {
    // [JWT] GET /api/accounting/tds-challan
    const raw = localStorage.getItem(`erp_tds_challan_${entityCode}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function TDSAdvancePanel({ entityCode }: TDSAdvancePanelProps) {
  const { vouchers } = useVouchers(entityCode);
  const [challans, setChallans] = useState<ChallanEntry[]>(() => loadChallans(entityCode));
  const [dateFrom, setDateFrom] = useState(fyStart());
  const [dateTo, setDateTo] = useState(today());
  const [showChallanDialog, setShowChallanDialog] = useState(false);
  const [challanSection, setChallanSection] = useState('');
  const [challanForm, setChallanForm] = useState({ challanNo: '', bsrCode: '', date: today(), amount: '' });

  const tdsVouchers = useMemo(() =>
    vouchers.filter(v => v.tds_applicable && v.status === 'posted' && v.date >= dateFrom && v.date <= dateTo),
  [vouchers, dateFrom, dateTo]);

  // Group by TDS section
  const sectionData = useMemo(() => {
    const map = new Map<string, { section: string; count: number; gross: number; tds: number; deposited: number }>();
    for (const v of tdsVouchers) {
      const sec = v.tds_section ?? 'Unknown';
      const ex = map.get(sec) || { section: sec, count: 0, gross: 0, tds: 0, deposited: 0 };
      ex.count++;
      ex.gross += v.gross_amount;
      ex.tds += v.tds_amount ?? 0;
      map.set(sec, ex);
    }
    // Add challan deposits
    for (const ch of challans) {
      const ex = map.get(ch.section);
      if (ex) ex.deposited += ch.amount;
    }
    return Array.from(map.values());
  }, [tdsVouchers, challans]);

  const totalTDS = sectionData.reduce((s, d) => s + d.tds, 0);
  const totalDeposited = sectionData.reduce((s, d) => s + d.deposited, 0);
  const totalBalance = totalTDS - totalDeposited;

  // 194Q alert: vendor with aggregate purchases >= 50L
  const vendorAggregates = useMemo(() => {
    const map = new Map<string, { name: string; total: number }>();
    for (const v of vouchers.filter(v => v.base_voucher_type === 'Purchase' && v.status === 'posted' && v.date >= dateFrom && v.date <= dateTo)) {
      const ex = map.get(v.party_id ?? '') || { name: v.party_name ?? '', total: 0 };
      ex.total += v.gross_amount;
      map.set(v.party_id ?? '', ex);
    }
    return Array.from(map.values()).filter(v => v.total >= 5000000);
  }, [vouchers, dateFrom, dateTo]);

  const saveChallan = useCallback(() => {
    const entry: ChallanEntry = {
      id: `ch-${Date.now()}`,
      section: challanSection,
      challanNo: challanForm.challanNo,
      bsrCode: challanForm.bsrCode,
      date: challanForm.date,
      amount: parseFloat(challanForm.amount) || 0,
      period: `${dateFrom} to ${dateTo}`,
    };
    const updated = [...challans, entry];
    setChallans(updated);
    // [JWT] POST /api/accounting/tds-challan
    localStorage.setItem(`erp_tds_challan_${entityCode}`, JSON.stringify(updated));
    setShowChallanDialog(false);
    setChallanForm({ challanNo: '', bsrCode: '', date: today(), amount: '' });
    toast.success('Challan recorded');
  }, [challans, challanSection, challanForm, entityCode, dateFrom, dateTo]);

  const handleExport = () => {
    exportCSV('tds-advance.csv',
      ['Section', 'Deductions', 'Gross Amount', 'TDS Amount', 'Deposited', 'Balance'],
      sectionData.map(d => [d.section, String(d.count), String(d.gross), String(d.tds), String(d.deposited), String(d.tds - d.deposited)])
    );
  };

  return (
    <div data-keyboard-form className="p-5 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IndianRupee className="h-5 w-5 text-teal-500" />
          <h2 className="text-lg font-bold">TDS Advance Tracking</h2>
        </div>
        <Button data-primary variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
        </Button>
      </div>

      <Card><CardContent className="p-3 flex gap-3 items-end">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">From</label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs w-36" onKeyDown={onEnterNext} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">To</label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs w-36" onKeyDown={onEnterNext} />
        </div>
      </CardContent></Card>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Total TDS Deducted (YTD)</p>
          <p className="text-sm font-bold">{inr(totalTDS)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Amount Deposited</p>
          <p className="text-sm font-bold text-emerald-600">{inr(totalDeposited)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Balance Payable</p>
          <p className={`text-sm font-bold ${totalBalance > 0 ? 'text-red-600' : ''}`}>{inr(totalBalance)}</p>
        </CardContent></Card>
      </div>

      {/* 194Q alerts */}
      {vendorAggregates.map(v => (
        <Alert key={v.name} className="border-amber-500/30 bg-amber-500/5">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-xs">Section 194Q applicable for {v.name}. Aggregate purchases: {inr(v.total)}. Deduct 0.1% on purchases above ₹50L.</AlertDescription>
        </Alert>
      ))}

      {/* Section-wise table */}
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Section</TableHead>
              <TableHead className="text-xs text-right">Deductions</TableHead>
              <TableHead className="text-xs text-right">Gross Amount</TableHead>
              <TableHead className="text-xs text-right">TDS Amount</TableHead>
              <TableHead className="text-xs text-right">Deposited</TableHead>
              <TableHead className="text-xs text-right">Balance</TableHead>
              <TableHead className="text-xs">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sectionData.map(d => (
              <TableRow key={d.section}>
                <TableCell className="text-xs font-medium">{d.section}</TableCell>
                <TableCell className="text-xs text-right">{d.count}</TableCell>
                <TableCell className="text-xs text-right font-mono">{inr(d.gross)}</TableCell>
                <TableCell className="text-xs text-right font-mono">{inr(d.tds)}</TableCell>
                <TableCell className="text-xs text-right font-mono text-emerald-600">{inr(d.deposited)}</TableCell>
                <TableCell className="text-xs text-right font-mono">{d.tds - d.deposited > 0 ? <span className="text-red-600">{inr(d.tds - d.deposited)}</span> : <Badge className="bg-emerald-500/15 text-emerald-700 text-[10px]">Paid</Badge>}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => { setChallanSection(d.section); setShowChallanDialog(true); }}>
                    <Plus className="h-3 w-3 mr-1" /> Challan
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      {/* Challan dialog */}
      <Dialog open={showChallanDialog} onOpenChange={setShowChallanDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Mark Challan Deposited — {challanSection}</DialogTitle></DialogHeader>
          <div data-keyboard-form className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">Challan No</label>
              <Input value={challanForm.challanNo} onChange={e => setChallanForm(p => ({ ...p, challanNo: e.target.value }))} className="h-8 text-xs" onKeyDown={onEnterNext} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">BSR Code</label>
              <Input value={challanForm.bsrCode} onChange={e => setChallanForm(p => ({ ...p, bsrCode: e.target.value }))} className="h-8 text-xs" onKeyDown={onEnterNext} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">Date</label>
              <Input type="date" value={challanForm.date} onChange={e => setChallanForm(p => ({ ...p, date: e.target.value }))} className="h-8 text-xs" onKeyDown={onEnterNext} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">Amount</label>
              <Input value={challanForm.amount} onChange={e => setChallanForm(p => ({ ...p, amount: e.target.value }))} className="h-8 text-xs" placeholder="0" onKeyDown={onEnterNext} />
            </div>
          </div>
          <DialogFooter>
            <Button data-primary size="sm" onClick={saveChallan}>Save Challan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TDSAdvance() {
  const { entityCode } = useEntityCode();
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader breadcrumbs={[{ label: 'Fin Core', href: '/erp/finecore' }, { label: 'TDS Advance' }]} showDatePicker={false} />
        <main>
          {entityCode
            ? <TDSAdvancePanel entityCode={entityCode} />
            : <SelectCompanyGate title="Select a company to view TDS Advance" />
          }
        </main>
      </div>
    </SidebarProvider>
  );
}
