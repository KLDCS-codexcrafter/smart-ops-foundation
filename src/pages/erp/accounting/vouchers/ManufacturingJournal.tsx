/**
 * ManufacturingJournal.tsx — Manufacturing Journal voucher.
 *
 * PURPOSE      Records a production run: consumption lines (Dr WIP/Cr RM Stock),
 *              production lines (Dr FG Stock/Cr WIP), byproduct lines
 *              (Dr FG/Cr Recovery Ledger), overhead (Dr Overhead Ledger).
 *              Driven by a BOM picked via BOMPicker. Sub-BOMs can be exploded
 *              per-line via the Explode button on consumption rows.
 *
 * INPUT        onSaveDraft callback from FinCorePage's draft tray
 * OUTPUT       Posted Voucher via finecore-engine.postVoucher().
 *
 * DEPENDENCIES TallyVoucherHeader, BOMPicker, useBOM, useEntityCode,
 *              useVoucherEntityGuard, useTenantConfig, finecore-engine,
 *              LedgerPicker, DepartmentPicker, ManufacturingJournalLineGrid.
 *
 * TALLY-ON-TOP Honors accounting_mode. Emits via eventBus when in tally_bridge
 *              mode (routing layer handles).
 *
 * VALUATION    Qty-as-placeholder (rate=0, value=qty). Real cost valuation
 *              deferred to a future "Stock Valuation Engine" sprint.
 *              See StockAdjustment.tsx:171 for precedent.
 *
 * SPEC DOC     Sprint T10-pre.2a-S1b.
 */
import { useState, useCallback, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Factory, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { TallyVoucherHeader } from '@/components/finecore/TallyVoucherHeader';
import { LedgerPicker } from '@/components/finecore/pickers/LedgerPicker';
import { DepartmentPicker } from '@/components/finecore/pickers/DepartmentPicker';
import { BOMPicker } from '@/components/finecore/pickers/BOMPicker';
import { VoucherFormFooter } from '@/components/finecore/VoucherFormFooter';
import {
  ManufacturingJournalLineGrid,
  type ManufacturingJournalLine,
} from '@/components/finecore/ManufacturingJournalLineGrid';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useVoucherEntityGuard } from '@/hooks/useVoucherEntityGuard';
import { useTenantConfig } from '@/hooks/useTenantConfig';
import { useBOM } from '@/hooks/useBOM';
import { generateVoucherNo, postVoucher } from '@/lib/finecore-engine';
import type { Voucher, VoucherInventoryLine, VoucherLedgerLine } from '@/types/voucher';
import type { Bom } from '@/types/bom';
import type { DraftEntry } from '@/components/finecore/DraftTray';

interface ManufacturingJournalPanelProps {
  onSaveDraft?: (draft: DraftEntry) => void;
}

export function ManufacturingJournalPanel({ onSaveDraft }: ManufacturingJournalPanelProps) {
  const { entityCode } = useEntityCode();
  useTenantConfig(entityCode);
  const { boms } = useBOM(entityCode);

  const [voucherNo] = useState(() => generateVoucherNo('MJ', entityCode));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [refNo, setRefNo] = useState('');
  const [refDate, setRefDate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');

  const [productionGodownName, setProductionGodownName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [departmentName, setDepartmentName] = useState('');

  const [selectedBomId, setSelectedBomId] = useState<string | null>(null);
  const [bomPickerOpen, setBomPickerOpen] = useState(false);
  const [batchMultiple, setBatchMultiple] = useState(1);   // number of BOM batches to produce

  const [consumptionLines, setConsumptionLines] = useState<ManufacturingJournalLine[]>([]);
  const [productionLines, setProductionLines] = useState<ManufacturingJournalLine[]>([]);
  const [byproductLines, setByproductLines] = useState<ManufacturingJournalLine[]>([]);

  const [overheadLedgerId, setOverheadLedgerId] = useState('');
  const [overheadLedgerName, setOverheadLedgerName] = useState('');
  const [narration, setNarration] = useState('');
  const [saving, setSaving] = useState(false);

  const lastSavedRef = useRef(false);

  const handleBomPick = useCallback((bom: Bom) => {
    setSelectedBomId(bom.id);
    const scale = batchMultiple;

    // Consumption lines from BOM.components
    const cLines: ManufacturingJournalLine[] = bom.components.map((c) => {
      const effectiveQty = c.qty * (1 + (c.wastage_percent / 100)) * scale;
      return {
        id: `mjl-c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        item_id: c.item_id,
        item_name: c.item_name,
        item_code: c.item_code,
        godown_id: '',
        godown_name: productionGodownName,
        qty: effectiveQty,
        uom: c.uom,
        rate: 0,
        value: effectiveQty,   // qty-as-placeholder
        component_type: c.component_type,
        sub_bom_id: c.sub_bom_id ?? null,
        wastage_percent: c.wastage_percent,
      };
    });

    // Production line: one, with product_item metadata
    const outputQty = bom.output_qty * scale;
    const pLines: ManufacturingJournalLine[] = [{
      id: `mjl-p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      item_id: bom.product_item_id,
      item_name: bom.product_item_name,
      item_code: bom.product_item_code,
      godown_id: '',
      godown_name: productionGodownName,
      qty: outputQty,
      uom: bom.output_uom,
      rate: 0,
      value: outputQty,
      component_type: null,
      sub_bom_id: null,
      wastage_percent: null,
    }];

    // Byproduct lines
    const bLines: ManufacturingJournalLine[] = bom.byproducts.map((bp) => ({
      id: `mjl-b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      item_id: bp.item_id,
      item_name: bp.item_name,
      item_code: bp.item_code,
      godown_id: '',
      godown_name: productionGodownName,
      qty: bp.qty_per_batch * scale,
      uom: bp.uom,
      rate: 0,
      value: bp.qty_per_batch * scale,
      component_type: null,
      sub_bom_id: null,
      wastage_percent: null,
    }));

    setConsumptionLines(cLines);
    setProductionLines(pLines);
    setByproductLines(bLines);

    // Pre-populate overhead ledger if BOM has one
    if (bom.overhead_ledger_id) {
      setOverheadLedgerId(bom.overhead_ledger_id);
      setOverheadLedgerName(bom.overhead_ledger_name ?? '');
    }

    toast.success(`BOM loaded: ${bom.product_item_name} v${bom.version_no}`);
  }, [batchMultiple, productionGodownName]);

  const handleExplodeConsumptionLine = useCallback((lineIdx: number) => {
    const line = consumptionLines[lineIdx];
    if (!line || !line.sub_bom_id) return;

    const subBom = boms.find(b => b.id === line.sub_bom_id);
    if (!subBom) {
      toast.error('Sub-BOM not found. It may have been deleted.');
      return;
    }

    // Scale: how many batches of sub-BOM are needed to produce line.qty of semi-finished?
    const subBatches = line.qty / subBom.output_qty;

    const exploded: ManufacturingJournalLine[] = subBom.components.map((c) => {
      const effectiveQty = c.qty * (1 + (c.wastage_percent / 100)) * subBatches;
      return {
        id: `mjl-c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        item_id: c.item_id,
        item_name: c.item_name,
        item_code: c.item_code,
        godown_id: line.godown_id,
        godown_name: line.godown_name,
        qty: effectiveQty,
        uom: c.uom,
        rate: 0,
        value: effectiveQty,
        component_type: c.component_type,
        sub_bom_id: c.sub_bom_id ?? null,
        wastage_percent: c.wastage_percent,
      };
    });

    // Replace the one line with the exploded lines
    const next = [
      ...consumptionLines.slice(0, lineIdx),
      ...exploded,
      ...consumptionLines.slice(lineIdx + 1),
    ];
    setConsumptionLines(next);
    toast.info(`Exploded ${line.item_name} → ${exploded.length} component(s)`);
  }, [consumptionLines, boms]);

  const clearForm = useCallback(() => {
    setDate(new Date().toISOString().split('T')[0]);
    setRefNo(''); setRefDate(''); setEffectiveDate('');
    setProductionGodownName('');
    setDepartmentId(''); setDepartmentName('');
    setSelectedBomId(null);
    setBatchMultiple(1);
    setConsumptionLines([]);
    setProductionLines([]);
    setByproductLines([]);
    setOverheadLedgerId(''); setOverheadLedgerName('');
    setNarration('');
    lastSavedRef.current = false;
  }, []);

  const isDirty = useCallback(
    () => consumptionLines.length > 0 || productionLines.length > 0 || byproductLines.length > 0 || narration.length > 0,
    [consumptionLines.length, productionLines.length, byproductLines.length, narration.length],
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
    voucherTypeName: 'Manufacturing Journal',
    fineCoreModule: 'fc-inv-mfg-journal',
    currentEntityCode: entityCode,
  });

  const handleSaveDraft = useCallback(() => {
    if (onSaveDraft) {
      onSaveDraft({
        id: `draft-${Date.now()}`,
        module: 'fc-inv-mfg-journal',
        label: `MJ ${productionLines[0]?.item_name || 'New'}`,
        voucherTypeName: 'Manufacturing Journal',
        savedAt: new Date().toISOString(),
        formState: serializeFormState(),
        entityId: entityCode,
      });
    }
  }, [onSaveDraft, productionLines, serializeFormState, entityCode]);

  const handlePost = useCallback(async () => {
    if (consumptionLines.length === 0) { toast.error('At least one consumption line is required'); return; }
    if (productionLines.length === 0) { toast.error('At least one production line is required'); return; }

    setSaving(true);
    try {
      const inventoryLines: VoucherInventoryLine[] = [
        ...consumptionLines.map(l => ({
          id: l.id,
          item_id: l.item_id, item_code: l.item_code, item_name: l.item_name,
          hsn_sac_code: '',
          godown_id: l.godown_id, godown_name: l.godown_name,
          qty: -Math.abs(l.qty),
          uom: l.uom, rate: 0,
          discount_percent: 0, discount_amount: 0, taxable_value: 0,
          gst_rate: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0, cess_rate: 0,
          cgst_amount: 0, sgst_amount: 0, igst_amount: 0, cess_amount: 0,
          total: 0,
          gst_type: 'non_gst' as const,
          gst_source: 'none' as const,
        })),
        ...productionLines.map(l => ({
          id: l.id,
          item_id: l.item_id, item_code: l.item_code, item_name: l.item_name,
          hsn_sac_code: '',
          godown_id: l.godown_id, godown_name: l.godown_name,
          qty: Math.abs(l.qty),
          uom: l.uom, rate: 0,
          discount_percent: 0, discount_amount: 0, taxable_value: 0,
          gst_rate: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0, cess_rate: 0,
          cgst_amount: 0, sgst_amount: 0, igst_amount: 0, cess_amount: 0,
          total: 0,
          gst_type: 'non_gst' as const,
          gst_source: 'none' as const,
        })),
        ...byproductLines.map(l => ({
          id: l.id,
          item_id: l.item_id, item_code: l.item_code, item_name: l.item_name,
          hsn_sac_code: '',
          godown_id: l.godown_id, godown_name: l.godown_name,
          qty: Math.abs(l.qty),
          uom: l.uom, rate: 0,
          discount_percent: 0, discount_amount: 0, taxable_value: 0,
          gst_rate: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0, cess_rate: 0,
          cgst_amount: 0, sgst_amount: 0, igst_amount: 0, cess_amount: 0,
          total: 0,
          gst_type: 'non_gst' as const,
          gst_source: 'none' as const,
        })),
      ];

      // For S1b scope we use qty as placeholder value; real valuation hook arrives in
      // a future Stock Valuation Engine sprint. See StockAdjustment.tsx:171 precedent.
      const ledgerLines: VoucherLedgerLine[] = [];
      const consTotal = consumptionLines.reduce((s, l) => s + l.qty, 0);
      const prodTotal = productionLines.reduce((s, l) => s + l.qty, 0);

      if (consTotal > 0) {
        ledgerLines.push({
          id: `ll-mj-cons-${Date.now()}`,
          ledger_id: '',
          ledger_code: '',
          ledger_name: '[Pending] Raw Material Stock',
          ledger_group_code: '',
          dr_amount: 0, cr_amount: consTotal,
          narration: 'Manufacturing Journal — consumption (qty-as-placeholder, pending real valuation)',
        });
      }
      if (prodTotal > 0) {
        ledgerLines.push({
          id: `ll-mj-prod-${Date.now()}`,
          ledger_id: '',
          ledger_code: '',
          ledger_name: '[Pending] Finished Goods Stock',
          ledger_group_code: '',
          dr_amount: prodTotal, cr_amount: 0,
          narration: 'Manufacturing Journal — production (qty-as-placeholder, pending real valuation)',
        });
      }
      byproductLines.forEach((bp) => {
        if (bp.qty > 0) {
          ledgerLines.push({
            id: `ll-mj-bp-${Date.now()}-${bp.id}`,
            ledger_id: '',
            ledger_code: '',
            ledger_name: `Byproduct Recovery — ${bp.item_name}`,
            ledger_group_code: '',
            dr_amount: 0, cr_amount: bp.qty,
            narration: `Byproduct: ${bp.item_name} (qty-as-placeholder)`,
          });
        }
      });
      if (overheadLedgerId) {
        ledgerLines.push({
          id: `ll-mj-overhead-${Date.now()}`,
          ledger_id: overheadLedgerId,
          ledger_code: '',
          ledger_name: overheadLedgerName,
          ledger_group_code: '',
          dr_amount: 0, cr_amount: 0,   // overhead amount user-entered; zero placeholder for S1b
          narration: 'Manufacturing overhead absorbed',
        });
      }

      const now = new Date().toISOString();
      const voucher: Voucher = {
        id: crypto.randomUUID(),
        voucher_no: voucherNo,
        voucher_type_id: 'vt-manufacturing-journal',
        voucher_type_name: 'Manufacturing Journal',
        base_voucher_type: 'Manufacturing Journal',
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
      lastSavedRef.current = true;
      toast.success(`Manufacturing Journal ${voucherNo} posted`);
    } catch (err) {
      console.error('Manufacturing Journal post failed:', err);
      toast.error('Failed to post Manufacturing Journal');
      lastSavedRef.current = false;
    } finally {
      setSaving(false);
    }
  }, [
    consumptionLines, productionLines, byproductLines,
    overheadLedgerId, overheadLedgerName,
    voucherNo, date, effectiveDate, refNo, refDate,
    departmentId, departmentName, entityCode, narration,
  ]);

  const handleSaveAndNew = useCallback(async () => {
    await handlePost();
    if (lastSavedRef.current) clearForm();
  }, [handlePost, clearForm]);

  const selectedBom = selectedBomId ? boms.find(b => b.id === selectedBomId) : null;

  return (
    <>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <main className="flex-1">
            <ERPHeader />
            <div className="max-w-6xl mx-auto p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Factory className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-bold">Manufacturing Journal</h1>
                <Badge variant="outline" className="text-[10px]">S1b · Qty-as-placeholder valuation</Badge>
              </div>

              <Card>
                <CardContent className="p-5 space-y-4">
                  <TallyVoucherHeader
                    voucherTypeName="Manufacturing Journal"
                    baseVoucherType="Manufacturing Journal"
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
                      <Label className="text-xs text-muted-foreground">BOM</Label>
                      <div className="flex gap-2 mt-1">
                        <Button variant="outline" size="sm" onClick={() => setBomPickerOpen(true)}>
                          <Layers className="h-3 w-3 mr-1" />
                          {selectedBom ? `${selectedBom.product_item_name} v${selectedBom.version_no}` : 'Pick BOM'}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Batch Multiple</Label>
                      <input
                        type="number"
                        min="1"
                        value={batchMultiple}
                        onChange={e => setBatchMultiple(Math.max(1, Number(e.target.value) || 1))}
                        className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Department (optional)</Label>
                      <DepartmentPicker
                        value={departmentId}
                        onChange={(id, name) => { setDepartmentId(id); setDepartmentName(name); }}
                        compact
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Production Godown</Label>
                      <input
                        type="text"
                        value={productionGodownName}
                        onChange={e => setProductionGodownName(e.target.value)}
                        className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs mt-1"
                        placeholder="Godown name"
                      />
                    </div>
                  </div>

                  <ManufacturingJournalLineGrid
                    lines={consumptionLines}
                    onChange={setConsumptionLines}
                    side="consumption"
                    onExplode={handleExplodeConsumptionLine}
                  />

                  <ManufacturingJournalLineGrid
                    lines={productionLines}
                    onChange={setProductionLines}
                    side="production"
                  />

                  <ManufacturingJournalLineGrid
                    lines={byproductLines}
                    onChange={setByproductLines}
                    side="byproduct"
                  />

                  <div>
                    <Label className="text-xs text-muted-foreground">Overhead Ledger (optional)</Label>
                    <LedgerPicker
                      value={overheadLedgerId}
                      onChange={(id, name) => { setOverheadLedgerId(id); setOverheadLedgerName(name); }}
                      entityCode={entityCode}
                      compact
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Narration</Label>
                    <Textarea
                      value={narration}
                      onChange={e => setNarration(e.target.value)}
                      rows={2}
                      className="text-xs"
                    />
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
                  />
                </div>
              </Card>
            </div>
          </main>
        </div>
      </SidebarProvider>

      <BOMPicker
        open={bomPickerOpen}
        onClose={() => setBomPickerOpen(false)}
        onPick={(bom) => { handleBomPick(bom); setBomPickerOpen(false); }}
        entityCode={entityCode}
        activeOnly={true}
      />

      {GuardDialog}
    </>
  );
}

export default ManufacturingJournalPanel;
