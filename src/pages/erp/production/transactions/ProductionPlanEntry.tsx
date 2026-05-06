/**
 * @file     ProductionPlanEntry.tsx
 * @sprint   T-Phase-1.3-3a-pre-2.5 · Block G · D-541 · Q15=a · Q16=a
 * @purpose  Production Plan capture · 8 plan_types · adaptive source_links · always
 *           multi-line · Card #2.7 12-item carry-forward retrofit.
 * @reuses   useSprint27d1Mount · Sprint27d2Mount · Sprint27eMount · UseLastVoucherButton ·
 *           DraftRecoveryDialog · KeyboardShortcutOverlay · useFormKeyboardShortcuts
 * @[JWT]    /api/production-plans
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, Save, ClipboardList, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useInventoryItems } from '@/hooks/useInventoryItems';
import { useFormKeyboardShortcuts } from '@/hooks/useFormKeyboardShortcuts';
import { useSprint27d1Mount } from '@/hooks/useSprint27d1Mount';
import { Sprint27d2Mount } from '@/components/uth/Sprint27d2Mount';
import { Sprint27eMount } from '@/components/uth/Sprint27eMount';
import { UseLastVoucherButton } from '@/components/uth/UseLastVoucherButton';
import { DraftRecoveryDialog } from '@/components/uth/DraftRecoveryDialog';
import { KeyboardShortcutOverlay } from '@/components/uth/KeyboardShortcutOverlay';
import {
  createProductionPlan,
  applyCapacityCheck,
  type CreateProductionPlanLineInput,
} from '@/lib/production-plan-engine';
import {
  PRODUCTION_PLAN_TYPE_LABELS,
  type ProductionPlanType,
  type ProductionPlanSourceLinks,
} from '@/types/production-plan';

interface DraftLine {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  uom: string;
  planned_qty: number;
  target_date: string;
  suggested_bom_id: string;
  suggested_batch_size: number | null;
  min_batch_size: number | null;
  max_batch_size: number | null;
  is_critical_path: boolean;
  is_export_line: boolean;
  notes: string;
}

const PLAN_TYPES: ProductionPlanType[] = [
  'standalone',
  'sales_plan',
  'sales_order',
  'project_milestone',
  'job_work_out',
  'reorder_replenishment',
  'campaign_batch',
  'master_production_schedule',
];

const newLineId = (): string =>
  `ppl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function emptyLine(): DraftLine {
  return {
    id: newLineId(),
    item_id: '',
    item_code: '',
    item_name: '',
    uom: 'NOS',
    planned_qty: 0,
    target_date: new Date().toISOString().slice(0, 10),
    suggested_bom_id: '',
    suggested_batch_size: null,
    min_batch_size: null,
    max_batch_size: null,
    is_critical_path: false,
    is_export_line: false,
    notes: '',
  };
}

export function ProductionPlanEntryPanel(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const user = useCurrentUser();
  const { items } = useInventoryItems();

  const [planType, setPlanType] = useState<ProductionPlanType>('standalone');
  const [periodStart, setPeriodStart] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState<string>(() =>
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  );
  const [departmentId, setDepartmentId] = useState<string>('');
  const [businessUnitId, setBusinessUnitId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);

  // Adaptive source-link fields
  const [salesPlanId, setSalesPlanId] = useState<string>('');
  const [salesOrderIdsCsv, setSalesOrderIdsCsv] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [projectMilestoneId, setProjectMilestoneId] = useState<string>('');
  const [jobWorkOutCsv, setJobWorkOutCsv] = useState<string>('');
  const [reorderItemCsv, setReorderItemCsv] = useState<string>('');
  const [campaignId, setCampaignId] = useState<string>('');
  const [mpsId, setMpsId] = useState<string>('');

  // Card #2.7 12-item retrofit
  const [helpOpen, setHelpOpen] = useState(false);

  const totalPlannedQty = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.planned_qty) || 0), 0),
    [lines],
  );

  const formState = useMemo(
    () => ({
      planType, periodStart, periodEnd, departmentId, businessUnitId, notes,
      lines, totalPlannedQty,
    }),
    [planType, periodStart, periodEnd, departmentId, businessUnitId, notes, lines, totalPlannedQty],
  );

  const itemsForMount = useMemo(
    () => lines.map(l => ({ item_name: l.item_name, qty: l.planned_qty })),
    [lines],
  );

  const mount = useSprint27d1Mount({
    formKey: 'production-plan-entry',
    entityCode,
    formState,
    items: itemsForMount,
    view: 'new',
    voucherType: 'vt-production-plan',
    userId: user?.id ?? undefined,
    partyId: undefined,
  });

  useFormKeyboardShortcuts({
    onHelp: () => setHelpOpen(true),
    onCancelOrClose: () => setHelpOpen(false),
  });

  const updateLine = (id: string, patch: Partial<DraftLine>): void => {
    setLines(prev => prev.map(l => (l.id === id ? { ...l, ...patch } : l)));
  };

  const addLine = (): void => setLines(prev => [...prev, emptyLine()]);
  const removeLine = (id: string): void =>
    setLines(prev => (prev.length > 1 ? prev.filter(l => l.id !== id) : prev));

  const onPickItem = (lineId: string, itemId: string): void => {
    const it = items.find(i => i.id === itemId);
    if (!it) return;
    updateLine(lineId, {
      item_id: it.id,
      item_code: it.code,
      item_name: it.name,
      uom: it.primary_uom_symbol ?? 'NOS',
    });
  };

  const buildSourceLinks = (): ProductionPlanSourceLinks => {
    const csv = (s: string): string[] =>
      s.split(',').map(x => x.trim()).filter(Boolean);
    switch (planType) {
      case 'sales_plan':                 return { sales_plan_id: salesPlanId || null };
      case 'sales_order':                return { sales_order_ids: csv(salesOrderIdsCsv) };
      case 'project_milestone':          return {
        project_id: projectId || null,
        project_milestone_id: projectMilestoneId || null,
      };
      case 'job_work_out':                return { job_work_out_order_ids: csv(jobWorkOutCsv) };
      case 'reorder_replenishment':      return { reorder_item_ids: csv(reorderItemCsv) };
      case 'campaign_batch':             return { campaign_id: campaignId || null };
      case 'master_production_schedule': return { mps_id: mpsId || null };
      case 'standalone':
      default:                           return {};
    }
  };

  const handleSave = (alsoApprove: boolean): void => {
    if (!departmentId) { toast.error('Department is required'); return; }
    if (lines.some(l => !l.item_id || l.planned_qty <= 0)) {
      toast.error('Each line must have an item and a positive planned quantity');
      return;
    }
    try {
      const planLines: CreateProductionPlanLineInput[] = lines.map(l => ({
        item_id: l.item_id,
        item_code: l.item_code,
        item_name: l.item_name,
        planned_qty: l.planned_qty,
        uom: l.uom,
        target_date: l.target_date,
        suggested_bom_id: l.suggested_bom_id || null,
        suggested_batch_size: l.suggested_batch_size,
        min_batch_size: l.min_batch_size,
        max_batch_size: l.max_batch_size,
        is_critical_path: l.is_critical_path,
        is_export_line: l.is_export_line,
        notes: l.notes,
      }));
      const userRef = { id: user?.id ?? 'current-user', name: user?.name ?? 'Current User' };
      const plan = createProductionPlan(
        {
          entity_id: entityId || entityCode,
          plan_period_start: periodStart,
          plan_period_end: periodEnd,
          plan_type: planType,
          department_id: departmentId,
          business_unit_id: businessUnitId || null,
          source_links: buildSourceLinks(),
          lines: planLines,
          notes,
          created_by: userRef.name,
        },
        userRef,
      );
      applyCapacityCheck(plan, userRef);
      mount.clearDraft();
      toast.success(
        alsoApprove
          ? `Plan ${plan.doc_no} saved · capacity checked`
          : `Plan ${plan.doc_no} saved as draft`,
      );
      // Reset
      setLines([emptyLine()]);
      setNotes('');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <DraftRecoveryDialog
        formKey="production-plan-entry"
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
            <ClipboardList className="h-5 w-5 text-primary" />
            Production Plan Entry
          </h1>
          <p className="text-sm text-muted-foreground">
            8 plan types · adaptive source links · multi-line · capacity check
          </p>
        </div>
        <div className="flex items-center gap-2">
          <UseLastVoucherButton
            entityCode={entityCode}
            recordType="production-plan"
            partyValue={null}
            onUse={() => toast.info('Last voucher loaded')}
          />
        </div>
      </div>

      <Sprint27d2Mount
        formName="ProductionPlanEntry"
        entityCode={entityCode}
        items={itemsForMount as unknown as Array<Record<string, unknown>>}
        isLineItemForm={true}
      />

      <Card>
        <CardHeader><CardTitle className="text-base">Plan Header</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Plan Type</Label>
            <Select value={planType} onValueChange={v => setPlanType(v as ProductionPlanType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLAN_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{PRODUCTION_PLAN_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Period Start</Label>
            <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Period End</Label>
            <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Input
              value={departmentId}
              onChange={e => setDepartmentId(e.target.value)}
              placeholder="Department ID"
            />
          </div>
          <div className="space-y-2">
            <Label>Business Unit</Label>
            <Input
              value={businessUnitId}
              onChange={e => setBusinessUnitId(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label>Total Planned Qty</Label>
            <div className="h-10 rounded-md border bg-muted/30 px-3 flex items-center font-mono text-sm">
              {totalPlannedQty.toLocaleString('en-IN')}
            </div>
          </div>
        </CardContent>
      </Card>

      {planType !== 'standalone' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Source Links
              <Badge variant="outline" className="text-xs">
                {PRODUCTION_PLAN_TYPE_LABELS[planType]}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {planType === 'sales_plan' && (
              <div className="space-y-2">
                <Label>Sales Plan ID</Label>
                <Input value={salesPlanId} onChange={e => setSalesPlanId(e.target.value)} />
              </div>
            )}
            {planType === 'sales_order' && (
              <div className="space-y-2 md:col-span-2">
                <Label>Sales Order IDs (comma-separated)</Label>
                <Input value={salesOrderIdsCsv} onChange={e => setSalesOrderIdsCsv(e.target.value)} placeholder="SO-001, SO-002" />
              </div>
            )}
            {planType === 'project_milestone' && (
              <>
                <div className="space-y-2">
                  <Label>Project ID</Label>
                  <Input value={projectId} onChange={e => setProjectId(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Milestone ID</Label>
                  <Input value={projectMilestoneId} onChange={e => setProjectMilestoneId(e.target.value)} />
                </div>
              </>
            )}
            {planType === 'job_work_out' && (
              <div className="space-y-2 md:col-span-2">
                <Label>Job Work Out Order IDs (comma-separated)</Label>
                <Input value={jobWorkOutCsv} onChange={e => setJobWorkOutCsv(e.target.value)} />
              </div>
            )}
            {planType === 'reorder_replenishment' && (
              <div className="space-y-2 md:col-span-2">
                <Label>Reorder Item IDs (comma-separated)</Label>
                <Input value={reorderItemCsv} onChange={e => setReorderItemCsv(e.target.value)} />
              </div>
            )}
            {planType === 'campaign_batch' && (
              <div className="space-y-2">
                <Label>Campaign ID</Label>
                <Input value={campaignId} onChange={e => setCampaignId(e.target.value)} />
              </div>
            )}
            {planType === 'master_production_schedule' && (
              <div className="space-y-2">
                <Label>MPS ID</Label>
                <Input value={mpsId} onChange={e => setMpsId(e.target.value)} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Plan Lines · {lines.length}</CardTitle>
          <Button size="sm" variant="outline" onClick={addLine}>
            <Plus className="h-4 w-4 mr-1" /> Add Line
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.map((l, idx) => (
            <div key={l.id} className="rounded-lg border p-3 space-y-3 bg-card">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="font-mono">Line {idx + 1}</Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeLine(l.id)}
                  disabled={lines.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Item</Label>
                  <Select value={l.item_id} onValueChange={v => onPickItem(l.id, v)}>
                    <SelectTrigger><SelectValue placeholder="Select item..." /></SelectTrigger>
                    <SelectContent>
                      {items.slice(0, 200).map(it => (
                        <SelectItem key={it.id} value={it.id}>
                          {it.code} · {it.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Planned Qty</Label>
                  <Input
                    type="number"
                    className="font-mono"
                    value={l.planned_qty}
                    onChange={e => updateLine(l.id, { planned_qty: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">UOM</Label>
                  <Input value={l.uom} onChange={e => updateLine(l.id, { uom: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Target Date</Label>
                  <Input
                    type="date"
                    value={l.target_date}
                    onChange={e => updateLine(l.id, { target_date: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Suggested BOM ID</Label>
                  <Input
                    value={l.suggested_bom_id}
                    onChange={e => updateLine(l.id, { suggested_bom_id: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Min / Max Batch</Label>
                  <div className="flex gap-1">
                    <Input
                      type="number"
                      className="font-mono"
                      placeholder="Min"
                      value={l.min_batch_size ?? ''}
                      onChange={e => updateLine(l.id, { min_batch_size: e.target.value === '' ? null : Number(e.target.value) })}
                    />
                    <Input
                      type="number"
                      className="font-mono"
                      placeholder="Max"
                      value={l.max_batch_size ?? ''}
                      onChange={e => updateLine(l.id, { max_batch_size: e.target.value === '' ? null : Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Suggested Batch</Label>
                  <Input
                    type="number"
                    className="font-mono"
                    value={l.suggested_batch_size ?? ''}
                    onChange={e => updateLine(l.id, { suggested_batch_size: e.target.value === '' ? null : Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={l.is_critical_path}
                    onCheckedChange={v => updateLine(l.id, { is_critical_path: v })}
                  />
                  <Label className="text-xs">Critical Path</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={l.is_export_line}
                    onCheckedChange={v => updateLine(l.id, { is_export_line: v })}
                  />
                  <Label className="text-xs">Export Line</Label>
                </div>
                <Input
                  className="flex-1 min-w-[200px]"
                  placeholder="Notes…"
                  value={l.notes}
                  onChange={e => updateLine(l.id, { notes: e.target.value })}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {new Date(periodEnd) < new Date(periodStart) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Period end is before period start.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Plan-level notes…"
            rows={3}
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => handleSave(false)}>
          <Save className="h-4 w-4 mr-1" /> Save Draft
        </Button>
        <Button onClick={() => handleSave(true)}>
          <Save className="h-4 w-4 mr-1" /> Save & Run Capacity Check
        </Button>
      </div>

      <Sprint27eMount entityCode={entityCode} formName="ProductionPlanEntry" />
    </div>
  );
}

export default ProductionPlanEntryPanel;
