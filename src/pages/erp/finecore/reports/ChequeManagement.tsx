/**
 * ChequeManagement.tsx — Cheque Management (fc-bnk-cheque)
 * Track issued/received cheques. Status: Issued→Presented→Cleared/Bounced
 * Storage: erp_cheque_status_{entityCode}
 * [JWT] All data via hooks + new storage key
 */
import { useState, useMemo, useCallback } from 'react';
import { Receipt, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { useVouchers } from '@/hooks/useVouchers';
import { toast } from 'sonner';
import { onEnterNext } from '@/lib/keyboard';
import { inr, fmtDate, exportCSV } from './reportUtils';

interface ChequeManagementPanelProps { entityCode: string; }

type ChequeStatus = 'issued' | 'presented' | 'cleared' | 'bounced';

function loadChequeStatuses(entityCode: string): Record<string, ChequeStatus> {
  try {
    // [JWT] GET /api/accounting/cheque-status
    const raw = localStorage.getItem(`erp_cheque_status_${entityCode}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function ChequeManagementPanel({ entityCode }: ChequeManagementPanelProps) {
  const { vouchers } = useVouchers(entityCode);
  const [statuses, setStatuses] = useState<Record<string, ChequeStatus>>(() => loadChequeStatuses(entityCode));
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const issuedCheques = useMemo(() =>
    vouchers.filter(v => v.base_voucher_type === 'Payment' && v.payment_instrument?.toLowerCase().includes('cheque') && v.status === 'posted'),
  [vouchers]);

  const receivedCheques = useMemo(() =>
    vouchers.filter(v => v.base_voucher_type === 'Receipt' && v.payment_instrument?.toLowerCase().includes('cheque') && v.status === 'posted'),
  [vouchers]);

  const getStatus = (vId: string, defaultStatus: ChequeStatus): ChequeStatus => statuses[vId] ?? defaultStatus;

  const updateStatus = useCallback((vId: string, newStatus: ChequeStatus) => {
    const updated = { ...statuses, [vId]: newStatus };
    setStatuses(updated);
    // [JWT] PATCH /api/accounting/cheque-status
    localStorage.setItem(`erp_cheque_status_${entityCode}`, JSON.stringify(updated));
    toast.success(`Cheque status updated to ${newStatus}`);
  }, [statuses, entityCode]);

  const statusBadge = (s: ChequeStatus) => {
    const map: Record<ChequeStatus, string> = {
      issued: 'bg-blue-500/15 text-blue-700',
      presented: 'bg-amber-500/15 text-amber-700',
      cleared: 'bg-emerald-500/15 text-emerald-700',
      bounced: 'bg-red-500/15 text-red-700',
    };
    return <Badge className={`${map[s]} text-[10px] capitalize`}>{s}</Badge>;
  };

  const filterCheques = (cheques: typeof issuedCheques, defaultStatus: ChequeStatus) => {
    let result = cheques;
    if (statusFilter !== 'all') result = result.filter(v => getStatus(v.id, defaultStatus) === statusFilter);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(v => v.party_name?.toLowerCase().includes(s) || v.voucher_no.toLowerCase().includes(s));
    }
    return result;
  };

  const summary = (cheques: typeof issuedCheques, defaultStatus: ChequeStatus) => {
    const total = cheques.reduce((s, v) => s + v.net_amount, 0);
    const cleared = cheques.filter(v => getStatus(v.id, defaultStatus) === 'cleared').reduce((s, v) => s + v.net_amount, 0);
    const pending = cheques.filter(v => !['cleared', 'bounced'].includes(getStatus(v.id, defaultStatus))).reduce((s, v) => s + v.net_amount, 0);
    const bounced = cheques.filter(v => getStatus(v.id, defaultStatus) === 'bounced').reduce((s, v) => s + v.net_amount, 0);
    return { total, cleared, pending, bounced };
  };

  const renderTable = (cheques: typeof issuedCheques, defaultStatus: ChequeStatus) => {
    const filtered = filterCheques(cheques, defaultStatus);
    const stats = summary(cheques, defaultStatus);
    return (
      <>
        <div className="grid grid-cols-4 gap-3 mb-4">
          <Card><CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Total</p>
            <p className="text-sm font-bold">{inr(stats.total)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Cleared</p>
            <p className="text-sm font-bold text-emerald-600">{inr(stats.cleared)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Pending</p>
            <p className="text-sm font-bold text-amber-600">{inr(stats.pending)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Bounced</p>
            <p className="text-sm font-bold text-red-600">{inr(stats.bounced)}</p>
          </CardContent></Card>
        </div>
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Voucher No</TableHead>
                <TableHead className="text-xs">Party</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
                <TableHead className="text-xs text-center">Status</TableHead>
                <TableHead className="text-xs">Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(v => {
                const cs = getStatus(v.id, defaultStatus);
                return (
                  <TableRow key={v.id}>
                    <TableCell className="text-xs">{fmtDate(v.date)}</TableCell>
                    <TableCell className="text-xs font-mono">{v.voucher_no}</TableCell>
                    <TableCell className="text-xs">{v.party_name || '—'}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{inr(v.net_amount)}</TableCell>
                    <TableCell className="text-xs text-center">{statusBadge(cs)}</TableCell>
                    <TableCell>
                      <Select value={cs} onValueChange={v2 => updateStatus(v.id, v2 as ChequeStatus)}>
                        <SelectTrigger className="h-7 text-[10px] w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(['issued', 'presented', 'cleared', 'bounced'] as ChequeStatus[]).map(s =>
                            <SelectItem key={s} value={s}><span className="text-xs capitalize">{s}</span></SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent></Card>
      </>
    );
  };

  return (
    <div data-keyboard-form className="p-5 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-teal-500" />
          <h2 className="text-lg font-bold">Cheque Management</h2>
        </div>
        <Button data-primary variant="outline" size="sm" onClick={() => exportCSV('cheques.csv', ['Type', 'Date', 'Voucher', 'Party', 'Amount', 'Status'], [])}>
          <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
        </Button>
      </div>

      <Card><CardContent className="p-3 flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">Status Filter</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all"><span className="text-xs">All</span></SelectItem>
              {(['issued', 'presented', 'cleared', 'bounced'] as ChequeStatus[]).map(s =>
                <SelectItem key={s} value={s}><span className="text-xs capitalize">{s}</span></SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 flex-1 min-w-[160px]">
          <label className="text-[10px] text-muted-foreground">Search</label>
          <Input placeholder="Party or voucher no..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" onKeyDown={onEnterNext} />
        </div>
      </CardContent></Card>

      <Tabs defaultValue="issued">
        <TabsList className="h-8">
          <TabsTrigger value="issued" className="text-xs h-7">Issued Cheques ({issuedCheques.length})</TabsTrigger>
          <TabsTrigger value="received" className="text-xs h-7">Received Cheques ({receivedCheques.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="issued" className="mt-4">{renderTable(issuedCheques, 'issued')}</TabsContent>
        <TabsContent value="received" className="mt-4">{renderTable(receivedCheques, 'issued')}</TabsContent>
      </Tabs>
    </div>
  );
}

export default function ChequeManagement() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader breadcrumbs={[{ label: 'Fin Core', href: '/erp/finecore' }, { label: 'Cheque Management' }]} showDatePicker={false} showCompany={false} />
        <main><ChequeManagementPanel entityCode="SMRT" /></main>
      </div>
    </SidebarProvider>
  );
}
