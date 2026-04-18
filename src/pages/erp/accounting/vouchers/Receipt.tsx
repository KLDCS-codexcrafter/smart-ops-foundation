/**
 * Receipt.tsx — Full Receipt Voucher form
 * Sprint 3C: TDS Deducted by Customer (26AS)
 * [JWT] All storage via finecore-engine
 */
import { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Send, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { onEnterNext } from '@/lib/keyboard';
import { SettlementPanel } from '@/components/finecore/SettlementPanel';
import { generateVoucherNo, postVoucher } from '@/lib/finecore-engine';
import type { Voucher, BillReference, TDSReceivableLine } from '@/types/voucher';
import type { DraftEntry } from '@/components/finecore/DraftTray';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { TDS_SECTIONS } from '@/data/compliance-seed-data';
import { triggerCommissionOnReceipt } from '@/lib/commission-engine';
import type { CommissionEntry } from '@/types/commission-register';
import { commissionRegisterKey } from '@/types/commission-register';
import type { TDSDeductionEntry } from '@/types/compliance';
import { tdsDeductionsKey } from '@/types/compliance';

interface TDSLineRow {
  id: string;
  invoice_ref: string;
  invoice_date: string;
  gross_amount: number;
  tds_section: string;
  tds_rate: number;
  tds_amount: number;
  net_received: number;
}

const incomeTdsSections = ['194J', '194C', '194A', '194H', '194I', '194Q', '194R', '194S'];

interface ReceiptPanelProps {
  onSaveDraft?: (draft: DraftEntry) => void;
  initialState?: Record<string, unknown>;
}

export function ReceiptPanel({ onSaveDraft }: ReceiptPanelProps) {
  const entityCode = 'SMRT';
  const [voucherNo] = useState(() => generateVoucherNo('RV', entityCode));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [partyName, setPartyName] = useState('');
  const [bankCashLedger, setBankCashLedger] = useState('');
  const [paymentMode, setPaymentMode] = useState<'bank' | 'cash'>('bank');
  const [instrumentRef, setInstrumentRef] = useState('');
  const [amount, setAmount] = useState(0);
  const [narration, setNarration] = useState('');
  const [receiptPurpose, setReceiptPurpose] = useState<'regular' | 'advance'>('regular');

  // TDS Receivable state
  const [tdsEnabled, setTdsEnabled] = useState(false);
  const [tdsLines, setTdsLines] = useState<TDSLineRow[]>([]);
  const [commissionBanner, setCommissionBanner] = useState<string | null>(null);

  // Load customers for party lookup
  const customers = useMemo((): any[] => {
    try {
      // [JWT] GET /api/masters/customers
      return JSON.parse(localStorage.getItem('erp_group_customer_master') || '[]');
    } catch { return []; }
  }, []);

  const selectedCustomer = useMemo(() =>
    customers.find((c: any) => c.partyName === partyName) ?? null,
  [customers, partyName]);

  const isDeductor = selectedCustomer?.is_tds_deductor === true;
  const customerTAN = selectedCustomer?.tan_number || '';

  const addTdsLine = useCallback(() => {
    setTdsLines(prev => [...prev, {
      id: `tl-${Date.now()}`, invoice_ref: '', invoice_date: date,
      gross_amount: 0, tds_section: '194J', tds_rate: 10, tds_amount: 0, net_received: 0,
    }]);
  }, [date]);

  const removeTdsLine = useCallback((id: string) => {
    setTdsLines(prev => prev.filter(l => l.id !== id));
  }, []);

  const updateTdsLine = useCallback((id: string, field: keyof TDSLineRow, value: string | number) => {
    setTdsLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      if (field === 'gross_amount' || field === 'tds_rate') {
        updated.tds_amount = Math.round(updated.gross_amount * updated.tds_rate / 100);
        updated.net_received = updated.gross_amount - updated.tds_amount;
      }
      if (field === 'tds_amount') {
        updated.net_received = updated.gross_amount - (value as number);
      }
      if (field === 'tds_section') {
        const sec = TDS_SECTIONS.find(s => s.sectionCode === value);
        if (sec) { updated.tds_rate = sec.rateIndividual; updated.tds_amount = Math.round(updated.gross_amount * sec.rateIndividual / 100); updated.net_received = updated.gross_amount - updated.tds_amount; }
      }
      return updated;
    }));
  }, []);

  const totalTds = tdsLines.reduce((s, l) => s + l.tds_amount, 0);

  const handlePost = useCallback(() => {
    if (!partyName) { toast.error('Party name is required'); return; }
    if (!bankCashLedger) { toast.error('Bank/Cash ledger is required'); return; }
    if (amount <= 0) { toast.error('Amount must be greater than zero'); return; }
    if (tdsEnabled && tdsLines.length > 0 && !customerTAN) {
      toast.error('Customer TAN is required for TDS receivable. Configure in CustomerMaster.');
      return;
    }
    const now = new Date().toISOString();
    const billRefs: BillReference[] = receiptPurpose === 'advance'
      ? [{ voucher_id: '', voucher_no: '', voucher_date: date, amount, type: 'advance' }]
      : [];

    const tdsReceivableLines: TDSReceivableLine[] = tdsEnabled ? tdsLines.map(l => ({
      customer_tan: customerTAN,
      tds_section: l.tds_section,
      invoice_ref: l.invoice_ref,
      invoice_date: l.invoice_date,
      gross_amount: l.gross_amount,
      tds_amount: l.tds_amount,
      net_amount: l.net_received,
    })) : [];

    const voucher: Voucher = {
      id: `v-${Date.now()}`, voucher_no: voucherNo, voucher_type_id: '',
      voucher_type_name: 'Receipt', base_voucher_type: 'Receipt',
      entity_id: entityCode, date, party_id: selectedCustomer?.id ?? '',
      party_name: partyName, ref_voucher_no: '',
      vendor_bill_no: '', net_amount: amount, narration,
      terms_conditions: '', payment_enforcement: '',
      payment_instrument: `${paymentMode === 'bank' ? 'Bank' : 'Cash'}: ${instrumentRef}`,
      from_ledger_name: partyName, to_ledger_name: bankCashLedger,
      from_godown_name: '', to_godown_name: '',
      ledger_lines: [], gross_amount: amount, total_discount: 0,
      total_taxable: 0, total_cgst: 0, total_sgst: 0, total_igst: 0,
      total_cess: 0, total_tax: 0, round_off: 0, tds_applicable: false,
      bill_references: billRefs,
      tds_receivable_lines: tdsReceivableLines.length > 0 ? tdsReceivableLines : undefined,
      deductee_pan: selectedCustomer?.pan ?? '',
      status: 'draft', created_by: 'current-user', created_at: now, updated_at: now,
    };
    try {
      postVoucher(voucher, entityCode);

      // Auto-trigger commission payments when customer receipt posted (Sprint 4)
      if (selectedCustomer?.id && receiptPurpose === 'regular') {
        const allEntries: CommissionEntry[] = (() => {
          try {
            // [JWT] GET /api/salesx/commission-register
            return JSON.parse(localStorage.getItem(commissionRegisterKey(entityCode)) || '[]');
          } catch { return []; }
        })();
        const allTDS: TDSDeductionEntry[] = (() => {
          try {
            // [JWT] GET /api/compliance/tds-deductions
            return JSON.parse(localStorage.getItem(tdsDeductionsKey(entityCode)) || '[]');
          } catch { return []; }
        })();
        const hasPending = allEntries.some(e =>
          e.customer_id === selectedCustomer.id &&
          (e.status === 'pending' || e.status === 'partial'),
        );
        if (hasPending) {
          const result = triggerCommissionOnReceipt(
            selectedCustomer.id, amount, date,
            voucher.id, voucher.voucher_no,
            allEntries, allTDS, entityCode,
          );
          if (result.paymentCount > 0) {
            // [JWT] PATCH /api/salesx/commission-register
            localStorage.setItem(
              commissionRegisterKey(entityCode),
              JSON.stringify(result.updatedEntries),
            );
            if (result.newTDSEntries.length > 0) {
              // [JWT] POST /api/compliance/tds-deductions
              localStorage.setItem(
                tdsDeductionsKey(entityCode),
                JSON.stringify([...allTDS, ...result.newTDSEntries]),
              );
            }
            setCommissionBanner(result.banner);
          }
        }
      }

      toast.success('Receipt voucher posted');
    } catch { toast.error('Failed to save'); }
  }, [partyName, bankCashLedger, amount, date, voucherNo, paymentMode, instrumentRef, narration, entityCode, selectedCustomer, receiptPurpose, tdsEnabled, tdsLines, customerTAN]);

  const handleSaveDraft = useCallback(() => {
    if (onSaveDraft) {
      onSaveDraft({
        id: `draft-${Date.now()}`, module: 'fc-txn-receipt',
        label: `RV ${partyName || 'New'}`, voucherTypeName: 'Receipt',
        savedAt: new Date().toISOString(),
        formState: { party_name: partyName, date, net_amount: amount } as Partial<Voucher>,
      });
    }
  }, [onSaveDraft, partyName, date, amount]);

  const activeTdsSections = TDS_SECTIONS.filter(t => t.status === 'active' && incomeTdsSections.includes(t.sectionCode));

  return (
    <div data-keyboard-form className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Receipt Voucher</h2>
          <p className="text-xs text-muted-foreground">Record money received from customer</p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">{voucherNo}</Badge>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Party (Customer)</Label>
              <Input value={partyName} onChange={e => setPartyName(e.target.value)} onKeyDown={onEnterNext} placeholder="Customer name" />
            </div>
            <div>
              <Label className="text-xs">Amount (₹)</Label>
              <Input type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} onKeyDown={onEnterNext} />
            </div>
          </div>

          {/* Receipt Purpose */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Receipt Purpose</Label>
            <div className="flex gap-4">
              {(['regular', 'advance'] as const).map(mode => (
                <label key={mode} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="receiptPurpose" checked={receiptPurpose === mode}
                    onChange={() => setReceiptPurpose(mode)}
                    className="accent-teal-500" />
                  <span className="text-xs capitalize">{mode === 'regular' ? 'Regular Receipt' : 'Advance Receipt'}</span>
                </label>
              ))}
            </div>
            {receiptPurpose === 'advance' && (
              <div className="border-t pt-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Label className="text-xs text-muted-foreground">Against Sales Order?</Label>
                      <Input disabled placeholder="Available Sprint 27" className="opacity-50 mt-1" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Sales Order integration available in Sprint 27</TooltipContent>
                </Tooltip>
                <p className="text-[10px] text-muted-foreground mt-1">This advance will generate ref ADVR/FY/XXXX on save.</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Payment Mode</Label>
              <Select value={paymentMode} onValueChange={v => setPaymentMode(v as 'bank' | 'cash')}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Bank / Cash Ledger</Label>
              <Input value={bankCashLedger} onChange={e => setBankCashLedger(e.target.value)} onKeyDown={onEnterNext} placeholder="Ledger name" />
            </div>
            {paymentMode === 'bank' && (
              <div>
                <Label className="text-xs">Cheque / NEFT / RTGS Ref</Label>
                <Input value={instrumentRef} onChange={e => setInstrumentRef(e.target.value)} onKeyDown={onEnterNext} placeholder="Reference number" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <SettlementPanel partyId={partyName} entityCode={entityCode} mode="debtor" />

      {commissionBanner && (
        <Alert className="border-orange-500/30 bg-orange-500/5">
          <AlertDescription className="text-xs text-orange-700">
            ✓ {commissionBanner}
          </AlertDescription>
        </Alert>
      )}

      {/* TDS Deducted by Customer — Sprint 3C */}
      {isDeductor && (
        <Card>
          <CardContent className="pt-5 space-y-3">
            <div data-keyboard-form className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold">TDS Deducted by Customer on this Payment?</Label>
                  <p className="text-[10px] text-muted-foreground">Creates TDS Receivable entries for Form 26AS reconciliation</p>
                </div>
                <Switch checked={tdsEnabled} onCheckedChange={setTdsEnabled} />
              </div>

              {tdsEnabled && (
                <>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px]">Customer TAN: {customerTAN || 'Not set'}</Badge>
                    {!customerTAN && (
                      <Alert className="border-amber-500/30 bg-amber-500/5 py-1 px-2">
                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                        <AlertDescription className="text-[10px] text-amber-700">No TAN configured. Add in CustomerMaster before booking 26AS TDS.</AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="border rounded-lg overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Invoice Ref</TableHead>
                          <TableHead className="text-xs">Invoice Date</TableHead>
                          <TableHead className="text-xs text-right">Gross Amount</TableHead>
                          <TableHead className="text-xs">TDS Section</TableHead>
                          <TableHead className="text-xs text-right">TDS %</TableHead>
                          <TableHead className="text-xs text-right">TDS Amount</TableHead>
                          <TableHead className="text-xs text-right">Net Received</TableHead>
                          <TableHead className="text-xs w-8"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tdsLines.length === 0 && (
                          <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-4">No TDS lines. Click + to add.</TableCell></TableRow>
                        )}
                        {tdsLines.map(l => (
                          <TableRow key={l.id}>
                            <TableCell><Input value={l.invoice_ref} onChange={e => updateTdsLine(l.id, 'invoice_ref', e.target.value)} onKeyDown={onEnterNext} className="h-7 text-xs" placeholder="INV-001" /></TableCell>
                            <TableCell><Input type="date" value={l.invoice_date} onChange={e => updateTdsLine(l.id, 'invoice_date', e.target.value)} onKeyDown={onEnterNext} className="h-7 text-xs" /></TableCell>
                            <TableCell><Input type="number" value={l.gross_amount || ''} onChange={e => updateTdsLine(l.id, 'gross_amount', Number(e.target.value))} onKeyDown={onEnterNext} className="h-7 text-xs text-right font-mono" /></TableCell>
                            <TableCell>
                              <Select value={l.tds_section} onValueChange={v => updateTdsLine(l.id, 'tds_section', v)}>
                                <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                                <SelectContent>{activeTdsSections.map(t => <SelectItem key={t.sectionCode} value={t.sectionCode}>{t.sectionCode}</SelectItem>)}</SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell><Input type="number" value={l.tds_rate || ''} onChange={e => updateTdsLine(l.id, 'tds_rate', Number(e.target.value))} onKeyDown={onEnterNext} className="h-7 text-xs text-right font-mono w-16" /></TableCell>
                            <TableCell><Input type="number" value={l.tds_amount || ''} onChange={e => updateTdsLine(l.id, 'tds_amount', Number(e.target.value))} onKeyDown={onEnterNext} className="h-7 text-xs text-right font-mono" /></TableCell>
                            <TableCell className="text-xs text-right font-mono text-muted-foreground">{l.net_received.toLocaleString('en-IN')}</TableCell>
                            <TableCell><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeTdsLine(l.id)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={addTdsLine}><Plus className="h-3 w-3 mr-1" />Add Invoice Row</Button>
                    {tdsLines.length > 0 && (
                      <p className="text-xs text-muted-foreground">Total TDS: <span className="font-mono font-bold text-foreground">₹{totalTds.toLocaleString('en-IN')}</span></p>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-5">
          <Label className="text-xs">Narration</Label>
          <Input value={narration} onChange={e => setNarration(e.target.value)} onKeyDown={onEnterNext} placeholder="Receipt narration" />
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        {onSaveDraft && <Button variant="outline" onClick={handleSaveDraft}>Save to Draft Tray</Button>}
        <Button variant="outline" onClick={() => toast.info('Discarded')}>Cancel</Button>
        <Button data-primary onClick={handlePost}><Send className="h-4 w-4 mr-2" />Post</Button>
      </div>
    </div>
  );
}

export default function Receipt() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader breadcrumbs={[{ label: 'Fin Core', href: '/erp/finecore' }, { label: 'Receipt Voucher' }]} showDatePicker={false} showCompany={false} />
        <main><ReceiptPanel /></main>
      </div>
    </SidebarProvider>
  );
}
