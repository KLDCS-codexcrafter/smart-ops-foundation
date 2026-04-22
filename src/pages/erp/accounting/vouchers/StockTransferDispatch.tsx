/**
 * StockTransferDispatch.tsx — Inter-department stock movement (source side only).
 *
 * PURPOSE      Material Out pattern. Source Dept → Destination Dept.
 *              Status='in_transit' after save. Receive side is Polish 1.5.
 *              No GL impact — inventory-only voucher.
 *
 * INPUT        onSaveDraft callback from FinCorePage's draft tray
 * OUTPUT       Posted Voucher with status='in_transit' and
 *              dispatch_dept_id + receive_dept_id populated.
 *
 * DEPENDENCIES TallyVoucherHeader, DepartmentPicker, StockTransferLineGrid,
 *              VoucherFormFooter, useEntityCode, useTenantConfig, finecore-engine.
 *
 * TALLY-ON-TOP Inventory-only. Emits voucher.posted for Bridge routing.
 *
 * SPEC DOC     Sprint T10-pre.1b Session B.
 *              base_voucher_type='Stock Transfer' (seeded T10-pre.1a Session A).
 *              RequestX link is disabled per Q3 (Coming with T20).
 */
import { useState, useCallback, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Link2, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { TallyVoucherHeader } from '@/components/finecore/TallyVoucherHeader';
import { DepartmentPicker } from '@/components/finecore/pickers/DepartmentPicker';
import { VoucherFormFooter } from '@/components/finecore/VoucherFormFooter';
import { StockTransferLineGrid, type StockTransferLine } from '@/components/finecore/StockTransferLineGrid';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useVoucherEntityGuard } from '@/hooks/useVoucherEntityGuard';
import { useTenantConfig } from '@/hooks/useTenantConfig';
import { generateVoucherNo, postVoucher } from '@/lib/finecore-engine';
import type { Voucher, VoucherInventoryLine } from '@/types/voucher';
import type { DraftEntry } from '@/components/finecore/DraftTray';

interface StockTransferDispatchPanelProps {
  onSaveDraft?: (draft: DraftEntry) => void;
}

export function StockTransferDispatchPanel({ onSaveDraft }: StockTransferDispatchPanelProps) {
  const { entityCode } = useEntityCode();
  // accountingMode reserved for future Tally-bridge routing decision
  useTenantConfig(entityCode);

  const [voucherNo] = useState(() => generateVoucherNo('ST', entityCode));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [refNo, setRefNo] = useState('');
  const [refDate, setRefDate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');

  const [fromDeptId, setFromDeptId] = useState('');
  const [fromDeptName, setFromDeptName] = useState('');
  const [toDeptId, setToDeptId] = useState('');
  const [toDeptName, setToDeptName] = useState('');

  const [lines, setLines] = useState<StockTransferLine[]>([]);
  const [narration, setNarration] = useState('');
  const [saving, setSaving] = useState(false);
  const lastSavedRef = useRef(false);

  const clearForm = useCallback(() => {
    setDate(new Date().toISOString().split('T')[0]);
    setRefNo(''); setRefDate(''); setEffectiveDate('');
    setFromDeptId(''); setFromDeptName('');
    setToDeptId(''); setToDeptName('');
    setLines([]); setNarration('');
    lastSavedRef.current = false;
  }, []);

  const isDirty = useCallback(
    () => lines.length > 0 || narration.length > 0 || !!fromDeptId || !!toDeptId,
    [lines.length, narration.length, fromDeptId, toDeptId],
  );

  const handleCancel = useCallback(() => {
    if (isDirty() && !window.confirm('Discard this voucher? Unsaved changes will be lost.')) return;
    clearForm();
    toast.info('Voucher discarded.');
  }, [isDirty, clearForm]);

  const serializeFormState = useCallback(
    (): Partial<Voucher> => ({ date, narration }),
    [date, narration],
  );

  const { GuardDialog } = useVoucherEntityGuard({
    isDirty, serializeFormState, onSaveDraft, clearForm,
    voucherTypeName: 'Stock Transfer Dispatch',
    fineCoreModule: 'fc-inv-stock-transfer-dispatch',
    currentEntityCode: entityCode,
  });

  const handleSaveDraft = useCallback(() => {
    if (onSaveDraft) {
      onSaveDraft({
        id: `draft-${Date.now()}`,
        module: 'fc-inv-stock-transfer-dispatch',
        label: `ST ${fromDeptName || 'New'}`,
        voucherTypeName: 'Stock Transfer Dispatch',
        savedAt: new Date().toISOString(),
        formState: serializeFormState(),
      });
    }
  }, [onSaveDraft, fromDeptName, serializeFormState]);

  const handlePost = useCallback(async () => {
    if (!fromDeptId) { toast.error('Select From Department'); return; }
    if (!toDeptId) { toast.error('Select To Department'); return; }
    if (fromDeptId === toDeptId) { toast.error('From and To departments must be different'); return; }
    if (lines.length === 0) { toast.error('At least one line is required'); return; }
    for (const l of lines) {
      if (!l.item_name) { toast.error('Every line needs an item'); return; }
      if (!l.from_godown_id) { toast.error('Every line needs a From godown'); return; }
      if (l.qty <= 0) { toast.error('Qty must be positive on every line'); return; }
    }

    setSaving(true);
    try {
      const inventoryLines: VoucherInventoryLine[] = lines.map(l => ({
        id: l.id,
        item_id: l.item_id, item_code: '', item_name: l.item_name,
        hsn_sac_code: '',
        godown_id: l.from_godown_id, godown_name: l.from_godown_name,
        qty: -Math.abs(l.qty),   // dispatch side — stock leaves source
        uom: l.uom,
        rate: 0,
        discount_percent: 0, discount_amount: 0, taxable_value: 0,
        gst_rate: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0, cess_rate: 0,
        cgst_amount: 0, sgst_amount: 0, igst_amount: 0, cess_amount: 0,
        total: 0,
        gst_type: 'non_gst',
        gst_source: 'none',
      }));

      const now = new Date().toISOString();
      const voucher: Voucher = {
        id: crypto.randomUUID(),
        voucher_no: voucherNo,
        voucher_type_id: 'vt-stock-transfer',
        voucher_type_name: 'Stock Transfer',
        base_voucher_type: 'Stock Transfer',
        entity_id: entityCode,
        date,
        effective_date: effectiveDate || date,
        ref_no: refNo || undefined,
        ref_date: refDate || undefined,
        dispatch_dept_id: fromDeptId,
        dispatch_dept_name: fromDeptName,
        receive_dept_id: toDeptId,
        receive_dept_name: toDeptName,
        inventory_lines: inventoryLines,
        ledger_lines: [],
        gross_amount: 0, total_discount: 0, total_taxable: 0,
        total_cgst: 0, total_sgst: 0, total_igst: 0, total_cess: 0,
        total_tax: 0, round_off: 0, net_amount: 0,
        tds_applicable: false,
        narration: narration || '',
        purpose: narration || undefined,
        terms_conditions: '', payment_enforcement: '', payment_instrument: '',
        status: 'in_transit',
        created_at: now,
        updated_at: now,
        created_by: 'demo-user',
      };

      postVoucher(voucher, entityCode);
      toast.success(`Stock Transfer ${voucher.voucher_no} dispatched — awaiting receive confirmation`);
      lastSavedRef.current = true;
    } catch (err) {
      console.error('Stock Transfer dispatch failed:', err);
      toast.error('Failed to dispatch Stock Transfer');
      lastSavedRef.current = false;
    } finally {
      setSaving(false);
    }
  }, [
    fromDeptId, fromDeptName, toDeptId, toDeptName,
    lines, voucherNo, date, effectiveDate, refNo, refDate,
    entityCode, narration,
  ]);

  const handleSaveAndNew = useCallback(async () => {
    await handlePost();
    if (lastSavedRef.current) clearForm();
  }, [handlePost, clearForm]);

  return (
    <>
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <main className="flex-1">
          <ERPHeader />
          <div className="max-w-6xl mx-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-bold">Stock Transfer — Dispatch</h1>
              </div>

              {/* Q3: disabled RequestX link — header area near ref-no */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button variant="outline" size="sm" disabled>
                        <Link2 className="h-3.5 w-3.5 mr-1.5" /> Link to Request #
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Coming with RequestX (Task T20, Horizon H2)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <Card>
              <CardContent className="p-5 space-y-4">
                <TallyVoucherHeader
                  voucherTypeName="Stock Transfer — Dispatch"
                  baseVoucherType="Stock Transfer"
                  voucherFamily="Inventory"
                  voucherNo={voucherNo}
                  refNo={refNo} onRefNoChange={setRefNo}
                  refDate={refDate} onRefDateChange={setRefDate}
                  voucherDate={date} onVoucherDateChange={setDate}
                  effectiveDate={effectiveDate || date}
                  onEffectiveDateChange={setEffectiveDate}
                  status="draft"
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">From Department *</Label>
                    <DepartmentPicker
                      value={fromDeptId}
                      onChange={(id, name) => { setFromDeptId(id); setFromDeptName(name); }}
                      excludeId={toDeptId}
                      compact
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">To Department *</Label>
                    <DepartmentPicker
                      value={toDeptId}
                      onChange={(id, name) => { setToDeptId(id); setToDeptName(name); }}
                      excludeId={fromDeptId}
                      compact
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Transfer Lines</Label>
                  <StockTransferLineGrid lines={lines} onChange={setLines} entityCode={entityCode} />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Purpose / Narration</Label>
                  <Textarea value={narration} onChange={e => setNarration(e.target.value)} rows={2} />
                </div>
              </CardContent>

              <div className="px-5 pb-5 space-y-3">
                {onSaveDraft && (
                  <div className="flex justify-end">
                    <Button variant="outline" onClick={handleSaveDraft}>Save to Draft Tray</Button>
                  </div>
                )}
                <VoucherFormFooter
                  onPost={handlePost}
                  onSaveAndNew={handleSaveAndNew}
                  onCancel={handleCancel}
                  isSaving={saving}
                  canPost={true}
                  status="draft"
                  postLabel="Dispatch"
                />
              </div>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
    {GuardDialog}
    </>
  );
}

export default StockTransferDispatchPanel;
