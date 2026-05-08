/**
 * @file     ProductionOrderEntry.tsx
 * @sprint   T-Phase-1.3-3a-pre-2-fix-1 (Card #2.7 12-item retrofit · Q16=a active)
 * @purpose  Production Order entry form · BOM-driven · 22 universal hookpoints (collapsible Advanced) · cost preview · Card #2.7 12-item carry-forward (UseLastVoucher · DraftRecovery · Sprint27 mounts · Pinned Templates · Smart Defaults · Keyboard nav · Decimal precision · Currency display · Notify-on-Save · Print preview).
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { dMul, dPct, dSum, round2 } from '@/lib/decimal-helpers';
import { useSprint27d1Mount } from '@/hooks/useSprint27d1Mount';
import { useFormKeyboardShortcuts } from '@/hooks/useFormKeyboardShortcuts';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Sprint27d2Mount } from '@/components/uth/Sprint27d2Mount';
import { Sprint27eMount } from '@/components/uth/Sprint27eMount';
import { UseLastVoucherButton } from '@/components/uth/UseLastVoucherButton';
import { DraftRecoveryDialog } from '@/components/uth/DraftRecoveryDialog';
import { KeyboardShortcutOverlay } from '@/components/uth/KeyboardShortcutOverlay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronRight, Factory, Save, Plus, Trash2, AlertTriangle, ExternalLink, Replace, Undo2 } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useBOM } from '@/hooks/useBOM';
import { useInventoryItems } from '@/hooks/useInventoryItems';
import { useProductionConfig } from '@/hooks/useProductionConfig';
import { useProductionPlans } from '@/hooks/useProductionPlans';
import { useItemSubstitutes } from '@/hooks/useItemSubstitutes';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useProjects } from '@/hooks/useProjects';
import { useOrders } from '@/hooks/useOrders';
import { useShifts } from '@/hooks/usePayHubMasters3';
import { DEMO_CUSTOMERS } from '@/data/demo-customers-vendors';
import {
  comply360QCKey,
  DEFAULT_QC_CONFIG,
  type QualiCheckConfig,
} from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import {
  createProductionOrder,
  releaseProductionOrder,
  computeMasterCost,
} from '@/lib/production-engine';
import {
  findApprovedSubstitutes,
  applySubstitution,
} from '@/lib/bom-substitution-engine';
import type { Bom } from '@/types/bom';
import type { ItemSubstitute } from '@/types/item-substitute';
import type { QCScenario, SalesOrderLineMapping, ProductionOrderOutput, ProductionOrderOutputKind, CostAllocationBasis, SubstituteReason } from '@/types/production-order';

const NATURE_OPTIONS = ['Binding', 'Cutting', 'Welding', 'Fabrication', 'Assembly', 'Mixing', 'Filling', 'Packaging'];
const COUNTRY_OPTIONS = ['US', 'UK', 'EU', 'JP', 'CN', 'AU', 'AE', 'SG', 'OTHER'];
const REG_BODY_OPTIONS = ['FDA', 'CE', 'WHO-GMP', 'BIS', 'CDSCO', 'PMDA', 'NMPA', 'OTHER'];

export function ProductionOrderEntryPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const config = useProductionConfig();
  const { boms } = useBOM(entityCode);
  const { items } = useInventoryItems();
  const { projects } = useProjects(entityCode);
  const { orders } = useOrders(entityCode);
  const { shifts } = useShifts();
  const customers = DEMO_CUSTOMERS;
  const salesOrders = useMemo(
    () => orders.filter(o => o.base_voucher_type === 'Sales Order'),
    [orders],
  );

  // Order details
  const [bomId, setBomId] = useState<string>('');
  const [plannedQty, setPlannedQty] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [targetEnd, setTargetEnd] = useState<string>(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [departmentId, setDepartmentId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [advanced, setAdvanced] = useState<boolean>(false);

  // Project linkage (4 hookpoints)
  const [projectId, setProjectId] = useState<string>('');
  const [projectMilestoneId, setProjectMilestoneId] = useState<string>('');
  const [projectCentreId, setProjectCentreId] = useState<string>('');
  const [referenceProjectId, setReferenceProjectId] = useState<string>('');

  // Sales linkage + Multi-SO mapper
  const [customerId, setCustomerId] = useState<string>('');
  const [salesPlanId, setSalesPlanId] = useState<string>('');
  const [soMappings, setSoMappings] = useState<SalesOrderLineMapping[]>([]);

  // Compliance + Multi-Entity (3)
  const [businessUnitId, setBusinessUnitId] = useState<string>('');
  const [batchNo, setBatchNo] = useState<string>('');
  const [isExport, setIsExport] = useState<boolean>(false);

  // Production Context (3)
  const [productionSiteId, setProductionSiteId] = useState<string>('');
  const [natureOfProcessing, setNatureOfProcessing] = useState<string>('');
  const [isJobWorkIn, setIsJobWorkIn] = useState<boolean>(false);

  // QC Scope (4)
  const [qcRequired, setQcRequired] = useState<boolean>(false);
  const [qcScenario, setQcScenario] = useState<QCScenario | ''>('');
  const [productionPlanId, setProductionPlanId] = useState<string>('');

  // Resources + Export
  const [shiftId, setShiftId] = useState<string>('');
  const [productionTeamId, setProductionTeamId] = useState<string>('');
  const [exportCountry, setExportCountry] = useState<string>('');
  const [exportRegBody, setExportRegBody] = useState<string>('');
  const [linkedLcId, setLinkedLcId] = useState<string>('');

  // Block H · Multi-output (Q13=a)
  const [multiOutputMode, setMultiOutputMode] = useState<boolean>(false);
  const [outputs, setOutputs] = useState<ProductionOrderOutput[]>([]);

  // Block I · Plan Linkage Picker (M:N · Q14=a · D-551)
  const { plans } = useProductionPlans();
  const approvedPlans = useMemo(
    () => plans.filter(p => p.status === 'approved' || p.status === 'in_execution'),
    [plans],
  );
  const [linkedPlanIds, setLinkedPlanIds] = useState<string[]>([]);
  const togglePlanLink = (id: string): void => {
    setLinkedPlanIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Block 1 (fix-1) · BOM Substitution UI · D-543
  const { subs: itemSubstitutes } = useItemSubstitutes(entityCode);
  const substitutionEnabled = config.enableBOMSubstitution !== false;
  interface SubstitutionDraft {
    bom_component_id: string;
    reason: SubstituteReason;
    notes: string;
    approved?: ItemSubstitute;
    freeForm?: { item_id: string; item_code: string; item_name: string; ratio: number };
  }
  const [substitutions, setSubstitutions] = useState<Record<string, SubstitutionDraft>>({});
  const [openPopoverFor, setOpenPopoverFor] = useState<string | null>(null);
  const [draftReason, setDraftReason] = useState<SubstituteReason>('stock_unavailable');
  const [draftNotes, setDraftNotes] = useState<string>('');
  const [draftFreeFormItemId, setDraftFreeFormItemId] = useState<string>('');
  const [draftFreeFormRatio, setDraftFreeFormRatio] = useState<number>(1);

  const applyApprovedDraft = (componentId: string, sub: ItemSubstitute): void => {
    if (!draftNotes.trim()) { toast.error('Notes are required'); return; }
    setSubstitutions(prev => ({
      ...prev,
      [componentId]: { bom_component_id: componentId, reason: draftReason, notes: draftNotes.trim(), approved: sub },
    }));
    setOpenPopoverFor(null);
    setDraftNotes('');
    toast.success(`Substitution staged: ${sub.substitute_item_name}`);
  };

  const applyFreeFormDraft = (componentId: string): void => {
    if (!draftFreeFormItemId) { toast.error('Select a substitute item'); return; }
    if (!draftNotes.trim()) { toast.error('Notes are required'); return; }
    if (draftFreeFormRatio <= 0) { toast.error('Ratio must be positive'); return; }
    const it = items.find(i => i.id === draftFreeFormItemId);
    if (!it) return;
    setSubstitutions(prev => ({
      ...prev,
      [componentId]: {
        bom_component_id: componentId,
        reason: draftReason,
        notes: draftNotes.trim(),
        freeForm: { item_id: it.id, item_code: it.code, item_name: it.name, ratio: draftFreeFormRatio },
      },
    }));
    setOpenPopoverFor(null);
    setDraftNotes('');
    setDraftFreeFormItemId('');
    setDraftFreeFormRatio(1);
    toast.success(`Free-form substitution staged: ${it.name}`);
  };

  const revertDraft = (componentId: string): void => {
    setSubstitutions(prev => {
      const { [componentId]: _, ...rest } = prev;
      void _;
      return rest;
    });
    toast.success('Substitution removed');
  };

  const newOutputId = (): string => `pout-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const addOutput = (): void => {
    setOutputs(prev => [
      ...prev,
      {
        id: newOutputId(),
        output_no: prev.length + 1,
        output_kind: prev.length === 0 ? 'main' : 'co_product',
        item_id: '',
        item_code: '',
        item_name: '',
        planned_qty: 0,
        uom: 'nos',
        bom_id: '',
        bom_version: 1,
        batch_no: null,
        qc_required: false,
        qc_scenario: null,
        linked_test_report_ids: [],
        output_cost_master: 0,
        output_cost_budget: 0,
        output_cost_actual: 0,
        cost_allocation_basis: 'qty' as CostAllocationBasis,
        cost_allocation_pct: 0,
        actual_qty: null,
        yield_pct: null,
        output_godown_id: '',
      },
    ]);
  };

  const updateOutput = (idx: number, patch: Partial<ProductionOrderOutput>): void => {
    setOutputs(prev => prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  };

  const removeOutput = (idx: number): void => {
    setOutputs(prev => prev.filter((_, i) => i !== idx).map((o, i) => ({ ...o, output_no: i + 1 })));
  };

  const onPickOutputItem = (idx: number, itemId: string): void => {
    const it = items.find(i => i.id === itemId);
    if (!it) return;
    updateOutput(idx, {
      item_id: it.id,
      item_code: it.code,
      item_name: it.name,
      uom: it.primary_uom_symbol ?? 'nos',
    });
  };

  const totalAllocPct = useMemo(
    () => round2(dSum(outputs, o => Number(o.cost_allocation_pct) || 0)),
    [outputs],
  );
  const allocOk = Math.abs(totalAllocPct - 100) < 0.01;
  const mainOutputCount = useMemo(() => outputs.filter(o => o.output_kind === 'main').length, [outputs]);


  const selectedBom = useMemo<Bom | undefined>(
    () => boms.find(b => b.id === bomId),
    [boms, bomId],
  );

  const masterCost = useMemo(() => {
    if (!selectedBom) return null;
    return computeMasterCost(selectedBom, plannedQty, items);
  }, [selectedBom, plannedQty, items]);

  const qcConfig: QualiCheckConfig = useMemo(() => {
    try {
      const raw = localStorage.getItem(comply360QCKey(entityCode));
      return raw ? { ...DEFAULT_QC_CONFIG, ...(JSON.parse(raw) as Partial<QualiCheckConfig>) } : DEFAULT_QC_CONFIG;
    } catch {
      return DEFAULT_QC_CONFIG;
    }
  }, [entityCode]);

  // Card #2.7-d-1 · 12-item carry-forward retrofit
  const user = useCurrentUser();
  const [helpOpen, setHelpOpen] = useState(false);

  useFormKeyboardShortcuts({
    onHelp: () => setHelpOpen(true),
    onCancelOrClose: () => setHelpOpen(false),
  });

  const formStateForMount = useMemo(() => ({
    bomId, plannedQty, startDate, targetEnd, departmentId, customerId,
    isExport, qcRequired, qcScenario, shiftId,
  }), [bomId, plannedQty, startDate, targetEnd, departmentId, customerId, isExport, qcRequired, qcScenario, shiftId]);

  const itemsForMount = useMemo(
    () => (selectedBom?.components ?? []).map(c => ({
      item_name: c.item_name,
      qty: c.qty * plannedQty,
    })),
    [selectedBom, plannedQty],
  );

  const mount = useSprint27d1Mount({
    formKey: 'production-order-entry',
    entityCode,
    formState: formStateForMount,
    items: itemsForMount,
    view: 'new',
    voucherType: 'vt-production-order',
    userId: user?.id ?? undefined,
    partyId: customerId || undefined,
  });

  // Block K · Deep-link prefill from Block I (SalesX SO) and Block J (ProjX Project)
  useEffect(() => {
    const soId = searchParams.get('so_id');
    const projId = searchParams.get('project_id');
    if (soId) {
      const so = salesOrders.find(o => o.id === soId);
      if (so) {
        setCustomerId(so.party_id ?? '');
        setSoMappings(curr => {
          if (curr.some(m => m.sales_order_id === so.id)) return curr;
          return [...curr, {
            sales_order_id: so.id,
            sales_order_no: so.order_no,
            sales_order_line_id: so.lines[0]?.id ?? '',
            fulfilled_qty: 0,
            required_by_date: '',
          }];
        });
      }
    }
    if (projId) {
      setProjectId(projId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, salesOrders.length]);

  const effectiveQcScenario: QCScenario | '' = isExport ? 'export_oriented' : qcScenario;

  const totalSoFulfilled = useMemo(
    () => round2(dSum(soMappings, m => Number(m.fulfilled_qty) || 0)),
    [soMappings],
  );

  const addSoMapping = () => {
    setSoMappings(s => [
      ...s,
      { sales_order_id: '', sales_order_no: '', sales_order_line_id: '', fulfilled_qty: 0, required_by_date: '' },
    ]);
  };

  const updateSoMapping = (idx: number, patch: Partial<SalesOrderLineMapping>) => {
    setSoMappings(s => s.map((m, i) => i === idx ? { ...m, ...patch } : m));
  };

  const removeSoMapping = (idx: number) => {
    setSoMappings(s => s.filter((_, i) => i !== idx));
  };

  const showQuarantineAlert = qcRequired && qcConfig.enableOutgoingInspection;

  const handleSave = (release: boolean) => {
    if (!selectedBom) { toast.error('Select a BOM'); return; }
    if (!departmentId) { toast.error('Department required'); return; }
    if (multiOutputMode) {
      if (outputs.length === 0) { toast.error('Add at least one output'); return; }
      if (mainOutputCount !== 1) { toast.error('Multi-output PO must have exactly one Main output'); return; }
      if (!allocOk) { toast.error(`Cost allocation must total 100% (currently ${totalAllocPct.toFixed(2)}%)`); return; }
      if (outputs.some(o => !o.item_id || o.planned_qty <= 0)) {
        toast.error('Each output needs an item and positive planned qty'); return;
      }
    }
    try {
      const customer = customers.find(c => c.partyCode === customerId);
      const cleanMappings = soMappings.filter(m => m.sales_order_id && m.fulfilled_qty > 0);
      const po = createProductionOrder(
        {
          entity_id: entityCode,
          bom_id: selectedBom.id,
          output_item_id: selectedBom.product_item_id,
          planned_qty: plannedQty,
          start_date: startDate,
          target_end_date: targetEnd,
          department_id: departmentId,
          project_id: projectId || undefined,
          project_milestone_id: projectMilestoneId || undefined,
          customer_id: customerId || undefined,
          sales_order_line_mappings: cleanMappings.length ? cleanMappings : undefined,
          business_unit_id: businessUnitId || undefined,
          batch_no: batchNo || undefined,
          is_export_project: isExport,
          export_destination_country: isExport ? exportCountry : undefined,
          export_regulatory_body: isExport ? exportRegBody : undefined,
          qc_required: qcRequired,
          qc_scenario: effectiveQcScenario || undefined,
          shift_id: shiftId || undefined,
          project_centre_id: projectCentreId || undefined,
          reference_project_id: referenceProjectId || undefined,
          sales_plan_id: salesPlanId || undefined,
          production_site_id: productionSiteId || undefined,
          nature_of_processing: natureOfProcessing || undefined,
          is_job_work_in: isJobWorkIn,
          production_team_id: productionTeamId || undefined,
          production_plan_id: productionPlanId || undefined,
          linked_letter_of_credit_id: linkedLcId || undefined,
          outputs: multiOutputMode ? outputs : undefined,
          linked_production_plan_ids: linkedPlanIds.length ? linkedPlanIds : undefined,
          notes,
          created_by: 'current-user',
        },
        selectedBom,
        items,
        config,
        qcConfig,
        { id: 'current-user', name: 'Current User' },
      );
      if (customer) void customer;

      // Block 1 (fix-1) · Apply staged BOM substitutions onto the freshly-saved PO
      let workingPo = po;
      const staged = Object.values(substitutions);
      if (staged.length > 0) {
        for (const draft of staged) {
          const line = workingPo.lines.find(l => l.bom_component_id === draft.bom_component_id);
          if (!line) continue;
          try {
            const result = applySubstitution(
              workingPo,
              {
                line_id: line.id,
                reason: draft.reason,
                notes: draft.notes,
                approved: draft.approved,
                freeForm: draft.freeForm
                  ? {
                      substitute_item_id: draft.freeForm.item_id,
                      substitute_item_code: draft.freeForm.item_code,
                      substitute_item_name: draft.freeForm.item_name,
                      ratio: draft.freeForm.ratio,
                    }
                  : undefined,
              },
              items,
              { id: 'current-user', name: 'Current User' },
            );
            workingPo = result.order;
          } catch (e) {
            toast.warning(`Substitution skipped: ${(e as Error).message}`);
          }
        }
        toast.success(`${staged.length} BOM substitution(s) applied`);
      }

      if (release) {
        releaseProductionOrder(workingPo, selectedBom, items, config, { id: 'current-user', name: 'Current User' });
        toast.success(`Production Order ${workingPo.doc_no} released`);
      } else {
        toast.success(`Production Order ${workingPo.doc_no} saved as draft`);
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <DraftRecoveryDialog
        formKey="production-order-entry"
        entityCode={entityCode}
        open={mount.recoveryOpen}
        draftAge={mount.draftAge}
        onRecover={() => mount.setRecoveryOpen(false)}
        onDiscard={() => { mount.clearDraft(); mount.setRecoveryOpen(false); }}
        onClose={() => mount.setRecoveryOpen(false)}
      />
      <KeyboardShortcutOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Factory className="h-5 w-5 text-primary" />
            Production Order Entry
          </h1>
          <p className="text-sm text-muted-foreground">BOM-driven · 22 universal hookpoints · 3-layer cost preview</p>
        </div>
        <div className="flex items-center gap-2">
          <UseLastVoucherButton
            entityCode={entityCode}
            recordType="production-order"
            partyValue={null}
            onUse={() => toast.info('Last voucher loaded')}
          />
        </div>
      </div>

      <Sprint27d2Mount
        formName="ProductionOrderEntry"
        entityCode={entityCode}
        items={itemsForMount as unknown as Array<Record<string, unknown>>}
        isLineItemForm={true}
      />

      <button
        type="button"
        onClick={() => navigate('/erp/command-center?module=finecore-production-config')}
        className="w-full text-left rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground hover:bg-muted/60 transition-colors flex items-center justify-between gap-2 cursor-pointer"
      >
        <span>
          ⓘ Masters live in <span className="font-medium">Command Center → Compliance Settings → Production Configuration</span>.
          Edit there to keep all modules in sync.
        </span>
        <ExternalLink className="h-3 w-3 flex-shrink-0" />
      </button>

      <Card>
        <CardHeader><CardTitle className="text-base">Order Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>BOM</Label>
            <Select value={bomId} onValueChange={setBomId}>
              <SelectTrigger><SelectValue placeholder="Select BOM..." /></SelectTrigger>
              <SelectContent>
                {boms.filter(b => b.is_active).map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.product_item_code} · {b.product_item_name} (v{b.version_no})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Input value={departmentId} onChange={e => setDepartmentId(e.target.value)} placeholder="Department ID" />
          </div>
          <div className="space-y-2">
            <Label>Planned Qty</Label>
            <Input type="number" min={1} value={plannedQty} onChange={e => setPlannedQty(Number(e.target.value))} className="font-mono" />
          </div>
          <div className="space-y-2">
            <Label>UOM</Label>
            <Input readOnly value={selectedBom?.output_uom || ''} />
          </div>
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="font-mono" />
          </div>
          <div className="space-y-2">
            <Label>Target End Date</Label>
            <Input type="date" value={targetEnd} onChange={e => setTargetEnd(e.target.value)} className="font-mono" />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="md:col-span-2 flex items-center gap-2 pt-1 border-t">
            <Switch checked={multiOutputMode} onCheckedChange={setMultiOutputMode} />
            <Label>Multi-output (co-products / by-products)</Label>
            <span className="text-xs text-muted-foreground ml-2">
              {multiOutputMode ? `${outputs.length} output(s)` : 'Single-output'}
            </span>
          </div>
        </CardContent>
      </Card>

      {multiOutputMode && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Outputs · Multi-Item PO</CardTitle>
            <Button size="sm" variant="outline" onClick={addOutput}>
              <Plus className="h-4 w-4 mr-1" /> Add Output
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {outputs.length === 0 && (
              <div className="text-xs text-muted-foreground">No outputs yet · click Add Output.</div>
            )}
            {outputs.map((out, idx) => (
              <div key={out.id} className="rounded-lg border p-3 space-y-2 bg-card">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-xs">Kind</Label>
                    <Select
                      value={out.output_kind}
                      onValueChange={v => updateOutput(idx, { output_kind: v as ProductionOrderOutputKind })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="main">Main</SelectItem>
                        <SelectItem value="co_product">Co-Product</SelectItem>
                        <SelectItem value="by_product">By-Product</SelectItem>
                        <SelectItem value="scrap">Scrap</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-3 space-y-1">
                    <Label className="text-xs">Item</Label>
                    <Select value={out.item_id} onValueChange={v => onPickOutputItem(idx, v)}>
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        {items.slice(0, 200).map(it => (
                          <SelectItem key={it.id} value={it.id}>
                            {it.code} · {it.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-xs">Planned Qty</Label>
                    <Input
                      type="number"
                      className="font-mono"
                      value={out.planned_qty}
                      onChange={e => updateOutput(idx, { planned_qty: Number(e.target.value) })}
                    />
                  </div>
                  <div className="md:col-span-1 space-y-1">
                    <Label className="text-xs">UOM</Label>
                    <Input value={out.uom} onChange={e => updateOutput(idx, { uom: e.target.value })} />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-xs">BOM ID</Label>
                    <Input
                      value={out.bom_id}
                      onChange={e => updateOutput(idx, { bom_id: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="md:col-span-1 space-y-1">
                    <Label className="text-xs">Alloc %</Label>
                    <Input
                      type="number"
                      className="font-mono"
                      value={out.cost_allocation_pct}
                      onChange={e => updateOutput(idx, { cost_allocation_pct: Number(e.target.value) })}
                    />
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    <Button size="sm" variant="ghost" onClick={() => removeOutput(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {outputs.length > 0 && (
              <div className="text-xs flex items-center gap-3 pt-1">
                <span>Total Allocation:</span>
                <span className={`font-mono font-medium ${allocOk ? 'text-success' : 'text-warning'}`}>
                  {totalAllocPct.toFixed(2)}%
                </span>
                {!allocOk && (
                  <span className="text-warning flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Must equal 100%
                  </span>
                )}
                {mainOutputCount !== 1 && (
                  <span className="text-warning flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Need exactly 1 Main output (have {mainOutputCount})
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedBom && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>BOM Components {substitutionEnabled && '· Editable with Substitution'}</span>
              {Object.keys(substitutions).length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {Object.keys(substitutions).length} substitution(s) staged
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-2">{selectedBom.components.length} component(s)</div>
            <div className="grid grid-cols-12 gap-2 mb-1 text-xs font-semibold text-muted-foreground">
              <div className="col-span-5">Item</div>
              <div className="col-span-3 text-right">Required Qty</div>
              <div className="col-span-3">Action</div>
              <div className="col-span-1"></div>
            </div>
            {selectedBom.components.map(c => {
              const sub = substitutions[c.id];
              const baseQty = dMul(dMul(c.qty, plannedQty), 1) + dPct(dMul(c.qty, plannedQty), c.wastage_percent || 0);
              const effItemName = sub
                ? (sub.approved?.substitute_item_name ?? sub.freeForm?.item_name ?? c.item_name)
                : c.item_name;
              const effRatio = sub?.approved?.ratio ?? sub?.freeForm?.ratio ?? 1;
              const effQty = sub ? baseQty * effRatio : baseQty;
              const alts = substitutionEnabled ? findApprovedSubstitutes(itemSubstitutes, c.item_id) : [];
              const popKey = `${c.id}`;
              return (
                <div key={c.id} className="grid grid-cols-12 gap-2 items-center py-1.5 border-b text-sm">
                  <div className="col-span-5">
                    {sub ? (
                      <div>
                        <div className="line-through text-muted-foreground text-xs">
                          {c.item_code} · {c.item_name}
                        </div>
                        <div className="flex items-center gap-1">
                          <span>→ {effItemName}</span>
                          <Badge variant="outline" className="text-xs">
                            {sub.approved ? 'Tier 1' : 'Tier 2'}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <span>{c.item_code} · {c.item_name}</span>
                    )}
                  </div>
                  <div className="col-span-3 text-right font-mono">
                    {effQty.toFixed(2)} {c.uom}
                  </div>
                  <div className="col-span-3">
                    {substitutionEnabled && (
                      <Popover
                        open={openPopoverFor === popKey}
                        onOpenChange={(o) => {
                          setOpenPopoverFor(o ? popKey : null);
                          if (o) {
                            setDraftNotes('');
                            setDraftReason('stock_unavailable');
                            setDraftFreeFormItemId('');
                            setDraftFreeFormRatio(1);
                          }
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" disabled={Boolean(sub)}>
                            <Replace className="h-3 w-3 mr-1" />
                            {alts.length > 0 ? `Substitute (${alts.length})` : 'Substitute'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-96" align="start">
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Reason (mandatory)</Label>
                              <Select value={draftReason} onValueChange={(v) => setDraftReason(v as SubstituteReason)}>
                                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="stock_unavailable">Stock unavailable</SelectItem>
                                  <SelectItem value="cost_optimization">Cost optimization</SelectItem>
                                  <SelectItem value="quality_upgrade">Quality upgrade</SelectItem>
                                  <SelectItem value="sourcing_constraint">Sourcing constraint</SelectItem>
                                  <SelectItem value="customer_specification">Customer specification</SelectItem>
                                  <SelectItem value="export_compliance">Export compliance</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Notes (mandatory · audit trail)</Label>
                              <Input
                                className="text-xs"
                                value={draftNotes}
                                onChange={(e) => setDraftNotes(e.target.value)}
                                placeholder="Why is this substitution being made?"
                              />
                            </div>

                            {alts.length > 0 && (
                              <div>
                                <div className="text-xs font-semibold mb-1">Tier 1 · Pre-approved (Substitute Master)</div>
                                <div className="max-h-32 overflow-y-auto">
                                  {alts.map(s => (
                                    <button
                                      key={s.id}
                                      type="button"
                                      onClick={() => applyApprovedDraft(c.id, s)}
                                      className="w-full text-left p-2 hover:bg-muted rounded text-xs border-b last:border-0"
                                    >
                                      <div className="font-medium">{s.substitute_item_name}</div>
                                      <div className="text-muted-foreground">
                                        Ratio 1:{s.ratio} · {s.scenarios.join(', ') || 'general'}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {alts.length === 0 && (
                              <div className="text-xs text-muted-foreground">
                                No pre-approved alternates · use free-form below.
                              </div>
                            )}

                            <div className="border-t pt-2 space-y-1">
                              <div className="text-xs font-semibold">Tier 2 · Free-form</div>
                              <Select value={draftFreeFormItemId} onValueChange={setDraftFreeFormItemId}>
                                <SelectTrigger className="text-xs">
                                  <SelectValue placeholder="Pick any inventory item..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {items
                                    .filter(i => i.id !== c.item_id)
                                    .slice(0, 50)
                                    .map(i => (
                                      <SelectItem key={i.id} value={i.id} className="text-xs">
                                        {i.code} · {i.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                step="0.01"
                                min={0.01}
                                className="text-xs font-mono"
                                value={draftFreeFormRatio}
                                onChange={(e) => setDraftFreeFormRatio(Number(e.target.value))}
                                placeholder="Ratio (1 primary = ? substitute)"
                              />
                              <Button
                                size="sm"
                                className="w-full text-xs"
                                onClick={() => applyFreeFormDraft(c.id)}
                              >
                                Apply free-form substitution
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                  <div className="col-span-1">
                    {sub && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => revertDraft(c.id)}
                        title="Revert to original BOM"
                      >
                        <Undo2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {showQuarantineAlert && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            FG output will land in <span className="font-medium">Quarantine</span> until QC clearance (D-515 stock-hold).
          </AlertDescription>
        </Alert>
      )}

      {masterCost && (
        <Card>
          <CardHeader><CardTitle className="text-base">Cost Preview · 3-Layer (Master live · Budget at release)</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Master Cost (Total)</div>
              <div className="text-lg font-mono font-bold">₹{masterCost.total.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Per Unit</div>
              <div className="text-lg font-mono">₹{masterCost.per_unit.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Costing Basis</div>
              <div className="text-sm">{config.defaultCostingBasis}</div>
            </div>
          </CardContent>
        </Card>
      )}

      <Collapsible open={advanced} onOpenChange={setAdvanced}>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-primary">
          <ChevronRight className={`h-4 w-4 transition-transform ${advanced ? 'rotate-90' : ''}`} />
          Advanced (22 universal hookpoints)
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-4">

          {/* 5.1 Project Linkage */}
          <Card>
            <CardHeader><CardTitle className="text-base">Project Linkage</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.project_code} · {p.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Project Milestone ID</Label>
                <Input value={projectMilestoneId} onChange={e => setProjectMilestoneId(e.target.value)} placeholder="e.g. M3-Fabrication" />
              </div>
              <div className="space-y-2">
                <Label>Project Centre ID</Label>
                <Input value={projectCentreId} onChange={e => setProjectCentreId(e.target.value)} placeholder="3a-pre-2 picker" />
              </div>
              <div className="space-y-2">
                <Label>Reference Project ID</Label>
                <Input value={referenceProjectId} onChange={e => setReferenceProjectId(e.target.value)} placeholder="EngineeringX hookpoint stub" />
              </div>
            </CardContent>
          </Card>

          {/* 5.2 Sales Linkage + Multi-SO Mapper */}
          <Card>
            <CardHeader><CardTitle className="text-base">Sales Linkage · Multi-SO Mapper (v5 MOAT)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger><SelectValue placeholder="Select customer..." /></SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.partyCode} value={c.partyCode}>
                          {c.partyCode} · {c.partyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sales Plan ID</Label>
                  <Input value={salesPlanId} onChange={e => setSalesPlanId(e.target.value)} placeholder="Card #6 stub" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>SO Line Mappings ({soMappings.length})</Label>
                  <Button size="sm" variant="outline" onClick={addSoMapping}>
                    <Plus className="h-3 w-3 mr-1" /> Add SO Line
                  </Button>
                </div>
                {soMappings.map((m, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end border rounded-md p-2">
                    <div className="col-span-4 space-y-1">
                      <Label className="text-xs">Sales Order</Label>
                      <Select
                        value={m.sales_order_id}
                        onValueChange={v => {
                          const so = salesOrders.find(o => o.id === v);
                          updateSoMapping(idx, { sales_order_id: v, sales_order_no: so?.order_no ?? '' });
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Select SO..." /></SelectTrigger>
                        <SelectContent>
                          {salesOrders.map(o => (
                            <SelectItem key={o.id} value={o.id}>{o.order_no} · {o.party_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">SO Line ID</Label>
                      <Input value={m.sales_order_line_id} onChange={e => updateSoMapping(idx, { sales_order_line_id: e.target.value })} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Fulfilled Qty</Label>
                      <Input type="number" className="font-mono" value={m.fulfilled_qty} onChange={e => updateSoMapping(idx, { fulfilled_qty: Number(e.target.value) })} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Required By</Label>
                      <Input type="date" className="font-mono" value={m.required_by_date} onChange={e => updateSoMapping(idx, { required_by_date: e.target.value })} />
                    </div>
                    <div className="col-span-1">
                      <Button size="sm" variant="ghost" onClick={() => removeSoMapping(idx)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {soMappings.length > 0 && (
                  <div className={`text-xs font-mono ${totalSoFulfilled !== plannedQty ? 'text-warning' : 'text-muted-foreground'}`}>
                    Sum(fulfilled) = {totalSoFulfilled} / planned = {plannedQty}
                    {totalSoFulfilled !== plannedQty && ' · mismatch'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 5.3 Compliance + Multi-Entity */}
          <Card>
            <CardHeader><CardTitle className="text-base">Compliance & Multi-Entity</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Business Unit ID</Label>
                {/* TODO useBusinessUnits when hook exists */}
                <Input value={businessUnitId} onChange={e => setBusinessUnitId(e.target.value)} placeholder="BU code" />
              </div>
              <div className="space-y-2">
                <Label>Batch No</Label>
                <Input value={batchNo} onChange={e => setBatchNo(e.target.value)} placeholder="e.g. CHB-2526-001" className="font-mono" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isExport} onCheckedChange={setIsExport} />
                <Label>Export Project</Label>
              </div>
            </CardContent>
          </Card>

          {/* 5.4 Production Context */}
          <Card>
            <CardHeader><CardTitle className="text-base">Production Context</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Production Site ID</Label>
                <Input value={productionSiteId} onChange={e => setProductionSiteId(e.target.value)} placeholder="Phase 2" />
              </div>
              <div className="space-y-2">
                <Label>Nature of Processing</Label>
                <Select value={natureOfProcessing} onValueChange={setNatureOfProcessing}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {NATURE_OPTIONS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isJobWorkIn} onCheckedChange={setIsJobWorkIn} />
                <Label>Job Work In</Label>
              </div>
            </CardContent>
          </Card>

          {/* 5.5 QC Scope (v3 MOAT) */}
          <Card>
            <CardHeader><CardTitle className="text-base">QC Scope (v3 MOAT)</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={qcRequired} onCheckedChange={setQcRequired} />
                <Label>QC Required</Label>
              </div>
              <div className="space-y-2">
                <Label>QC Scenario</Label>
                <Select
                  value={effectiveQcScenario}
                  onValueChange={(v) => setQcScenario(v as QCScenario)}
                  disabled={isExport}
                >
                  <SelectTrigger><SelectValue placeholder="Select QC scenario..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal_dept">Internal Department QC</SelectItem>
                    <SelectItem value="customer_inspection">Customer Sending to QC</SelectItem>
                    <SelectItem value="third_party_agency">3rd Party Agency QC</SelectItem>
                    <SelectItem value="export_oriented">Export-Oriented QC (FDA · CE · WHO-GMP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Production Plan ID</Label>
                <Input value={productionPlanId} onChange={e => setProductionPlanId(e.target.value)} placeholder="3a-pre-3 active" />
              </div>
              <div className="space-y-2">
                <Label>Test Reports</Label>
                <div className="text-sm text-muted-foreground">Test Reports: 0 (Card 3b active)</div>
              </div>
            </CardContent>
          </Card>

          {/* 5.6 Resources + Export */}
          <Card>
            <CardHeader><CardTitle className="text-base">Resources & Export</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Shift</Label>
                <Select value={shiftId} onValueChange={setShiftId}>
                  <SelectTrigger><SelectValue placeholder="Select shift..." /></SelectTrigger>
                  <SelectContent>
                    {shifts.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.code} · {s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Production Team ID</Label>
                <Input value={productionTeamId} onChange={e => setProductionTeamId(e.target.value)} placeholder="3a-pre-2 active" />
              </div>
              {isExport && (
                <>
                  <div className="space-y-2">
                    <Label>Destination Country</Label>
                    <Select value={exportCountry} onValueChange={setExportCountry}>
                      <SelectTrigger><SelectValue placeholder="Select country..." /></SelectTrigger>
                      <SelectContent>
                        {COUNTRY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Regulatory Body</Label>
                    <Select value={exportRegBody} onValueChange={setExportRegBody}>
                      <SelectTrigger><SelectValue placeholder="Select body..." /></SelectTrigger>
                      <SelectContent>
                        {REG_BODY_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Letter of Credit ID</Label>
                    <Input value={linkedLcId} onChange={e => setLinkedLcId(e.target.value)} placeholder="Phase 2 picker" />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Block I · Plan Linkage Picker (M:N · Q14=a · D-551) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Linked Production Plans</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {approvedPlans.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No approved or in-execution plans available. Create a Production Plan first to enable linkage.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto rounded-md border p-2">
                  {approvedPlans.map(p => {
                    const checked = linkedPlanIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className="flex items-start gap-2 text-sm cursor-pointer hover:bg-muted/40 rounded px-2 py-1"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => togglePlanLink(p.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="font-mono text-xs">{p.doc_no}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.plan_type} · {p.lines.length} lines · {p.status}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {linkedPlanIds.length === 0
                  ? 'No plan linkage (standalone PO)'
                  : linkedPlanIds.length === 1
                    ? '1 plan linked'
                    : `${linkedPlanIds.length} plans linked (consolidation)`}
              </p>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => handleSave(false)}>
          <Save className="h-4 w-4 mr-2" />
          Save Draft
        </Button>
        <Button onClick={() => handleSave(true)}>
          Save and Release
        </Button>
      </div>

      <Sprint27eMount
        entityCode={entityCode}
        voucherTypeId="vt-production-order"
        voucherTypeName="Production Order"
        defaultPartyType="customer"
        partyId={customerId || null}
        partyName={null}
        lineItems={[]}
        onPartyCreated={() => { /* no-op */ }}
        onCloneTemplate={() => { /* no-op */ }}
      />
    </div>
  );
}

export default ProductionOrderEntryPanel;
