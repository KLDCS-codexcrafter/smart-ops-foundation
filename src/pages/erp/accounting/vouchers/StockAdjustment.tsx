/**
 * StockAdjustment.tsx — Physical count reconciliation: write-off / write-on.
 *
 * PURPOSE      GL-impact half of the old Stock Journal split. Lines with
 *              direction=write_off post Dr [Write-Off Ledger] / Cr Stock (clearing).
 *              Lines with direction=write_on post Dr Stock / Cr [Write-On Ledger].
 *              Two ledger slots on header default to auto-seeded WO/WN ledgers;
 *              user can override to any ledger (Q2 decision).
 *
 * INPUT        onSaveDraft callback from FinCorePage's draft tray
 * OUTPUT       Posted Voucher via finecore-engine.postVoucher().
 *
 * DEPENDENCIES TallyVoucherHeader, LedgerPicker, DepartmentPicker,
 *              StockAdjustmentLineGrid, VoucherFormFooter, useEntityCode,
 *              useTenantConfig, finecore-engine.
 *
 * TALLY-ON-TOP Honors accounting_mode. In tally_bridge mode, Stock Adjustment
 *              is emitted via eventBus.emit('voucher.posted') — routing layer
 *              decides local post vs Tally post per D-003 mapping.
 *
 * SPEC DOC     Sprint T10-pre.1b Session B.
 *              Seeded ledgers: 'Stock Adjustment — Write Off' + 'Stock Adjustment — Write On'
 *              (T10-pre.1a Session A entity-setup-service).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Scale } from 'lucide-react';
import { toast } from 'sonner';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { TallyVoucherHeader } from '@/components/finecore/TallyVoucherHeader';
import { LedgerPicker } from '@/components/finecore/pickers/LedgerPicker';
import { DepartmentPicker } from '@/components/finecore/pickers/DepartmentPicker';
import { VoucherFormFooter } from '@/components/finecore/VoucherFormFooter';
import { StockAdjustmentLineGrid, type StockAdjustmentLine } from '@/components/finecore/StockAdjustmentLineGrid';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useTenantConfig } from '@/hooks/useTenantConfig';
import { generateVoucherNo, postVoucher } from '@/lib/finecore-engine';
import type { Voucher, VoucherInventoryLine, VoucherLedgerLine } from '@/types/voucher';
import type { DraftEntry } from '@/components/finecore/DraftTray';

interface LedgerDef { id: string; name: string; }

interface StockAdjustmentPanelProps {
  onSaveDraft?: (draft: DraftEntry) => void;
}

export function StockAdjustmentPanel({ onSaveDraft: _onSaveDraft }: StockAdjustmentPanelProps) {
  const { entityCode } = useEntityCode();
  // accountingMode reserved for future Tally-bridge routing decision
  useTenantConfig(entityCode);

  const [voucherNo] = useState(() => generateVoucherNo('SA', entityCode));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [refNo, setRefNo] = useState('');
  const [refDate, setRefDate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');

  const [departmentId, setDepartmentId] = useState('');
  const [departmentName, setDepartmentName] = useState('');

  const [writeOffLedgerId, setWriteOffLedgerId] = useState('');
  const [writeOffLedgerName, setWriteOffLedgerName] = useState('');
  const [writeOnLedgerId, setWriteOnLedgerId] = useState('');
  const [writeOnLedgerName, setWriteOnLedgerName] = useState('');

  const [lines, setLines] = useState<StockAdjustmentLine[]>([]);
  const [narration, setNarration] = useState('');
  const [saving, setSaving] = useState(false);
  const lastSavedRef = useRef(false);

  // Auto-resolve Write-Off + Write-On ledgers by exact name on mount (Q2 decision).
  useEffect(() => {
    try {
      // [JWT] GET /api/masters/ledgers?entityCode=...
      const raw = localStorage.getItem(`erp_group_ledger_definitions_${entityCode}`);
      if (!raw) return;
      const ledgers = JSON.parse(raw) as LedgerDef[];
      const wo = ledgers.find(l => l.name === 'Stock Adjustment — Write Off');
      const wn = ledgers.find(l => l.name === 'Stock Adjustment — Write On');
      if (wo) { setWriteOffLedgerId(wo.id); setWriteOffLedgerName(wo.name); }
      if (wn) { setWriteOnLedgerId(wn.id); setWriteOnLedgerName(wn.name); }
    } catch { /* non-fatal */ }
  }, [entityCode]);

  const clearForm = useCallback(() => {
    setDate(new Date().toISOString().split('T')[0]);
    setRefNo(''); setRefDate(''); setEffectiveDate('');
    setDepartmentId(''); setDepartmentName('');
    setLines([]); setNarration('');
    lastSavedRef.current = false;
  }, []);

  const handleCancel = useCallback(() => {
    if (lines.length > 0 || narration.length > 0) {
      if (!window.confirm('Discard this voucher? Unsaved changes will be lost.')) return;
    }
    clearForm();
    toast.info('Voucher discarded.');
  }, [lines.length, narration.length, clearForm]);

  const handlePost = useCallback(async () => {
    if (lines.length === 0) { toast.error('At least one line is required'); return; }
    for (const l of lines) {
      if (!l.item_name) { toast.error('Every line needs an item'); return; }
      if (!l.godown_id) { toast.error('Every line needs a godown'); return; }
      if (l.qty <= 0) { toast.error('Qty must be positive on every line'); return; }
      if (!l.reason) { toast.error('Every line needs a reason'); return; }
    }
    if (!writeOffLedgerId && lines.some(l => l.direction === 'write_off')) {
      toast.error('Select a Write-Off ledger'); return;
    }
    if (!writeOnLedgerId && lines.some(l => l.direction === 'write_on')) {
      toast.error('Select a Write-On ledger'); return;
    }

    setSaving(true);
    try {
      const inventoryLines: VoucherInventoryLine[] = lines.map(l => ({
        id: l.id,
        item_id: l.item_id, item_code: '', item_name: l.item_name,
        hsn_sac_code: '',
        godown_id: l.godown_id, godown_name: l.godown_name,
        qty: l.direction === 'write_off' ? -Math.abs(l.qty) : Math.abs(l.qty),
        uom: l.uom,
        rate: 0,
        discount_percent: 0, discount_amount: 0, taxable_value: 0,
        gst_rate: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0, cess_rate: 0,
        cgst_amount: 0, sgst_amount: 0, igst_amount: 0, cess_amount: 0,
        total: 0,
        gst_type: 'non_gst',
        gst_source: 'none',
      }));

      const ledgerLines: VoucherLedgerLine[] = [];
      const woTotal = lines.filter(l => l.direction === 'write_off').reduce((s, l) => s + Math.abs(l.qty), 0);
      const wnTotal = lines.filter(l => l.direction === 'write_on').reduce((s, l) => s + Math.abs(l.qty), 0);

      // For T10-pre.1b scope we use qty as placeholder value; real valuation hook arrives in T10-pre.2.
      if (woTotal > 0 && writeOffLedgerId) {
        ledgerLines.push({
          id: `ll-wo-${Date.now()}`,
          ledger_id: writeOffLedgerId, ledger_code: '', ledger_name: writeOffLedgerName,
          ledger_group_code: '',
          dr_amount: woTotal, cr_amount: 0,
          narration: 'Stock write-off',
        });
      }
      if (wnTotal > 0 && writeOnLedgerId) {
        ledgerLines.push({
          id: `ll-wn-${Date.now()}`,
          ledger_id: writeOnLedgerId, ledger_code: '', ledger_name: writeOnLedgerName,
          ledger_group_code: '',
          dr_amount: 0, cr_amount: wnTotal,
          narration: 'Stock write-on',
        });
      }

      const now = new Date().toISOString();
      const voucher: Voucher = {
        id: crypto.randomUUID(),
        voucher_no: voucherNo,
        voucher_type_id: 'vt-stock-adjustment',
        voucher_type_name: 'Stock Adjustment',
        base_voucher_type: 'Stock Journal',
        entity_id: entityCode,
        date,
        effective_date: effectiveDate || date,
        ref_no: refNo || undefined,
        ref_date: refDate || undefined,
        dispatch_dept_id: departmentId || undefined,
        dispatch_dept_name: departmentName || undefined,
        department_id: departmentId || undefined,
        department_name: departmentName || undefined,
        inventory_lines: inventoryLines,
        ledger_lines: ledgerLines,
        gross_amount: 0, total_discount: 0, total_taxable: 0,
        total_cgst: 0, total_sgst: 0, total_igst: 0, total_cess: 0,
        total_tax: 0, round_off: 0, net_amount: 0,
        tds_applicable: false,
        narration: narration || '',
        terms_conditions: '', payment_enforcement: '', payment_instrument: '',
        status: 'posted',
        created_at: now,
        updated_at: now,
        created_by: 'demo-user',
      };

      postVoucher(voucher, entityCode);
      toast.success(`Stock Adjustment ${voucher.voucher_no} posted`);
      lastSavedRef.current = true;
    } catch (err) {
      console.error('Stock Adjustment post failed:', err);
      toast.error('Failed to post Stock Adjustment');
      lastSavedRef.current = false;
    } finally {
      setSaving(false);
    }
  }, [
    lines, writeOffLedgerId, writeOffLedgerName, writeOnLedgerId, writeOnLedgerName,
    voucherNo, date, effectiveDate, refNo, refDate, departmentId, departmentName,
    entityCode, narration,
  ]);

  const handleSaveAndNew = useCallback(async () => {
    await handlePost();
    if (lastSavedRef.current) clearForm();
  }, [handlePost, clearForm]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <main className="flex-1">
          <ERPHeader />
          <div className="max-w-6xl mx-auto p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold">Stock Adjustment</h1>
            </div>

            <Card>
              <CardContent className="p-5 space-y-4">
                <TallyVoucherHeader
                  voucherTypeName="Stock Adjustment"
                  baseVoucherType="Stock Journal"
                  voucherFamily="Inventory"
                  voucherNo={voucherNo}
                  refNo={refNo} onRefNoChange={setRefNo}
                  refDate={refDate} onRefDateChange={setRefDate}
                  voucherDate={date} onVoucherDateChange={setDate}
                  effectiveDate={effectiveDate || date}
                  onEffectiveDateChange={setEffectiveDate}
                  status="draft"
                />

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Department (optional)</Label>
                    <DepartmentPicker
                      value={departmentId}
                      onChange={(id, name) => { setDepartmentId(id); setDepartmentName(name); }}
                      compact
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Write-Off Ledger</Label>
                    <LedgerPicker
                      value={writeOffLedgerId}
                      onChange={(id, name) => { setWriteOffLedgerId(id); setWriteOffLedgerName(name); }}
                      entityCode={entityCode}
                      placeholder="Auto-resolved"
                      compact
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Write-On Ledger</Label>
                    <LedgerPicker
                      value={writeOnLedgerId}
                      onChange={(id, name) => { setWriteOnLedgerId(id); setWriteOnLedgerName(name); }}
                      entityCode={entityCode}
                      placeholder="Auto-resolved"
                      compact
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Adjustment Lines</Label>
                  <StockAdjustmentLineGrid lines={lines} onChange={setLines} entityCode={entityCode} />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Narration</Label>
                  <Textarea value={narration} onChange={e => setNarration(e.target.value)} rows={2} />
                </div>
              </CardContent>

              <div className="px-5 pb-5">
                <VoucherFormFooter
                  onPost={handlePost}
                  onSaveAndNew={handleSaveAndNew}
                  onCancel={handleCancel}
                  isSaving={saving}
                  canPost={true}
                  status="draft"
                />
              </div>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

export default StockAdjustmentPanel;
