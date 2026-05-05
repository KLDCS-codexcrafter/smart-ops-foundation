/**
 * @file        MaterialIndentEntry.tsx
 * @sprint      T-Phase-1.2.6f-pre-1 (RequestX Foundation)
 * @card        Card #3 · P2P arc · sub-arc RequestX
 * @date        2026-05-02
 * @purpose     Material Indent capture form · State Machine v3.0 (D-218) · STORE-FIRST routing.
 * @decisions   D-218, D-220, D-230, D-231, D-232, D-234
 * @disciplines SD-12, SD-13, SD-15, SD-16
 * @reuses      decimal-helpers, useSprint27d1Mount, Sprint27d2Mount, Sprint27eMount
 * @[JWT]       /api/requestx/material-indents
 */
import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, AlertTriangle, IndianRupee, Save } from 'lucide-react';
import { toast } from 'sonner';
import { dMul, dAdd, round2 } from '@/lib/decimal-helpers';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useFormKeyboardShortcuts } from '@/hooks/useFormKeyboardShortcuts';
import { useSprint27d1Mount } from '@/hooks/useSprint27d1Mount';
import { Sprint27d2Mount } from '@/components/uth/Sprint27d2Mount';
import { Sprint27eMount } from '@/components/uth/Sprint27eMount';
import { UseLastVoucherButton } from '@/components/uth/UseLastVoucherButton';
import { DraftRecoveryDialog } from '@/components/uth/DraftRecoveryDialog';
import { KeyboardShortcutOverlay } from '@/components/uth/KeyboardShortcutOverlay';
import { SkeletonRows } from '@/components/ui/SkeletonRows';
import { createMaterialIndent, getApprovalTier, runAutoRules, submitIndent, cancelIndent } from '@/lib/request-engine';
import { APPROVAL_MATRIX } from '@/types/requisition-common';
import type { IndentCategory, MaterialIndent, MaterialIndentLine, Priority } from '@/types/material-indent';

// useSmartDefaults — re-exported via useSprint27d1Mount (smartLedger / smartWarehouse)
// Card #2.7-d-1 SD-13 marker · OOB-1 carry-forward

const newLineId = (): string => `mil-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function emptyLine(no: number): MaterialIndentLine {
  return {
    id: newLineId(),
    line_no: no,
    item_id: '',
    item_name: '',
    description: '',
    uom: 'NOS',
    qty: 0,
    current_stock_qty: 0,
    estimated_rate: 0,
    estimated_value: 0,
    required_date: new Date().toISOString().slice(0, 10),
    schedule_qty: null,
    schedule_date: null,
    remarks: '',
    target_godown_id: 'gd-default',
    target_godown_name: 'Main Godown',
    is_stocked: true,
    stock_check_status: 'pending',
    store_action: null,
    store_actor_id: null,
    store_action_at: null,
    parent_indent_line_id: null,
    cascade_reason: null,
  };
}

interface DeptBudgetGaugeProps {
  budget: number;
  spent: number;
}
function DepartmentBudgetGauge({ budget, spent }: DeptBudgetGaugeProps): JSX.Element {
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const color = pct < 70 ? 'bg-success' : pct < 90 ? 'bg-warning' : 'bg-destructive';
  return (
    <div className="flex items-center gap-3">
      <div className="w-48 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`${color} h-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono">
        ₹{spent.toLocaleString('en-IN')} / ₹{budget.toLocaleString('en-IN')} ({pct}%)
      </span>
    </div>
  );
}

export function MaterialIndentEntry(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const user = useCurrentUser();
  const [date] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<IndentCategory>('raw_material');
  const [subType, setSubType] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [lines, setLines] = useState<MaterialIndentLine[]>([emptyLine(1)]);
  const [helpOpen, setHelpOpen] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<MaterialIndent | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const total = useMemo(() => {
    let t = 0;
    for (const l of lines) t = dAdd(t, l.estimated_value);
    return round2(t);
  }, [lines]);

  const formState = useMemo(() => ({ date, category, subType, priority, lines, total }), [date, category, subType, priority, lines, total]);

  const mount = useSprint27d1Mount({
    formKey: 'material-indent-entry',
    entityCode,
    formState,
    items: lines,
    view: 'new',
    voucherType: 'vt-material-indent',
    userId: user?.id ?? undefined,
    partyId: undefined,
  });

  useFormKeyboardShortcuts({
    onHelp: () => setHelpOpen(true),
    onCancelOrClose: () => setHelpOpen(false),
  });

  const updateLine = useCallback((id: string, patch: Partial<MaterialIndentLine>) => {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const merged = { ...l, ...patch };
      merged.estimated_value = round2(dMul(merged.qty, merged.estimated_rate));
      return merged;
    }));
  }, []);

  const addLine = (): void => setLines(prev => [...prev, emptyLine(prev.length + 1)]);
  const removeLine = (id: string): void => setLines(prev => prev.filter(l => l.id !== id));

  const warnings = useMemo(
    () => runAutoRules({ lines, total_estimated_value: total, preferred_vendor_id: null }, 5000000),
    [lines, total],
  );

  const approvalChain = useMemo(() => {
    if (lines.length === 0) return null;
    const tier = getApprovalTier(total, false);
    const tierConfig = APPROVAL_MATRIX.find(t => t.tier === tier);
    if (!tierConfig) return null;
    return {
      tier,
      approvers: tierConfig.required_approvals,
      estimated_total_hours: tierConfig.estimated_hours,
      threshold_label: tierConfig.threshold_label,
    };
  }, [lines, total]);

  const buildPayload = () => ({
    entity_id: entityId,
    voucher_type_id: 'vt-material-indent',
    date,
    branch_id: 'branch-default',
    division_id: 'div-default',
    originating_department_id: user?.department_id ?? 'dept-default',
    originating_department_name: user?.department_code ?? 'Department',
    cost_center_id: 'cc-default',
    category,
    sub_type: subType,
    priority,
    requested_by_user_id: user?.id ?? '',
    requested_by_name: user?.name ?? '',
    hod_user_id: 'user-hod-placeholder',
    project_id: null,
    preferred_vendor_id: null,
    payment_terms: null,
    lines,
    parent_indent_id: null,
    cascade_reason: null,
    created_by: user?.id ?? '',
    updated_by: user?.id ?? '',
  });

  const handleSave = (): void => {
    if (!user) { toast.error('User not resolved'); return; }
    const indent = createMaterialIndent(buildPayload(), entityCode);
    submitIndent(indent.id, 'material', entityCode, 'user-hod-placeholder');
    toast.success(`Material Indent ${indent.voucher_no} submitted`);
    mount.clearDraft();
    setCurrentDraft(null);
    setLines([emptyLine(1)]);
  };

  const handleSaveDraft = (): void => {
    if (!user) { toast.error('User not resolved'); return; }
    const indent = createMaterialIndent(buildPayload(), entityCode);
    setCurrentDraft(indent);
    toast.success(`Draft ${indent.voucher_no} saved`);
  };

  const handleCancel = (): void => {
    if (!currentDraft || !cancelReason.trim()) return;
    setCancelling(true);
    const result = cancelIndent(currentDraft.id, 'material', user?.id ?? 'current-user', 'department_head', cancelReason, entityCode);
    if (result.ok) {
      toast.success('Indent cancelled');
      setCancelOpen(false);
      setCancelReason('');
      setCurrentDraft(null);
      mount.clearDraft();
      setLines([emptyLine(1)]);
    } else {
      toast.error(`Cancel failed: ${result.reason ?? 'unknown'}`);
    }
    setCancelling(false);
  };

  return (
    <div className="p-6 space-y-4">
      <DraftRecoveryDialog
        formKey="material-indent-entry"
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
          <h2 className="text-xl font-bold">Material Indent</h2>
          <p className="text-xs text-muted-foreground">Voucher: MI/2526/auto · {date}</p>
        </div>
        <div className="flex items-center gap-2">
          <UseLastVoucherButton
            entityCode={entityCode}
            recordType="material-indent"
            partyValue={null}
            onUse={() => toast.info('Last voucher loaded')}
          />
          <Button onClick={handleSave}><Save className="h-4 w-4 mr-1" />Submit</Button>
        </div>
      </div>

      <Sprint27d2Mount
        formName="MaterialIndentEntry"
        entityCode={entityCode}
        items={lines as unknown as Array<Record<string, unknown>>}
        isLineItemForm={true}
      />

      <Card>
        <CardHeader><CardTitle className="text-sm">Department Budget</CardTitle></CardHeader>
        <CardContent><DepartmentBudgetGauge budget={5000000} spent={total} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Header</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-3">
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={v => setCategory(v as IndentCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="raw_material">Raw Material</SelectItem>
                <SelectItem value="packaging_material">Packaging</SelectItem>
                <SelectItem value="printing_stationary">Printing/Stationary</SelectItem>
                <SelectItem value="housekeeping">Housekeeping</SelectItem>
                <SelectItem value="electrical">Electrical</SelectItem>
                <SelectItem value="import_purchase">Import</SelectItem>
                <SelectItem value="samples_purchase">Samples</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sub-type</Label>
            <Input value={subType} onChange={e => setSubType(e.target.value)} />
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={v => setPriority(v as Priority)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="critical_shutdown">Critical Shutdown</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Lines</CardTitle>
          <Button size="sm" variant="outline" onClick={addLine}><Plus className="h-3 w-3 mr-1" />Add Line</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {lines.map(l => (
            <div key={l.id} className="grid grid-cols-12 gap-2 items-end border-b pb-2">
              <div className="col-span-3">
                <Label className="text-[10px]">Item</Label>
                <Input value={l.item_name} onChange={e => updateLine(l.id, { item_name: e.target.value, item_id: e.target.value })} />
              </div>
              <div className="col-span-1">
                <Label className="text-[10px]">UoM</Label>
                <Input value={l.uom} onChange={e => updateLine(l.id, { uom: e.target.value })} />
              </div>
              <div className="col-span-1">
                <Label className="text-[10px]">Qty</Label>
                <Input type="number" inputMode="decimal" value={l.qty} onChange={e => updateLine(l.id, { qty: Number(e.target.value) })} />
              </div>
              <div className="col-span-1">
                <Label className="text-[10px]">Stock</Label>
                <Input type="number" value={l.current_stock_qty} onChange={e => updateLine(l.id, { current_stock_qty: Number(e.target.value) })} />
              </div>
              <div className="col-span-2">
                <Label className="text-[10px]">Est. Rate</Label>
                <Input type="number" inputMode="decimal" value={l.estimated_rate} onChange={e => updateLine(l.id, { estimated_rate: Number(e.target.value) })} />
              </div>
              <div className="col-span-2">
                <Label className="text-[10px]">Est. Value</Label>
                <div className="text-sm font-mono py-1.5">₹{l.estimated_value.toLocaleString('en-IN')}</div>
              </div>
              <div className="col-span-1">
                <Badge variant={l.is_stocked ? 'default' : 'outline'} className="text-[10px] cursor-pointer"
                  onClick={() => updateLine(l.id, { is_stocked: !l.is_stocked })}>
                  {l.is_stocked ? 'Stocked' : 'Non-stocked'}
                </Badge>
              </div>
              <div className="col-span-1">
                <Button size="icon" variant="ghost" onClick={() => removeLine(l.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
          <div className="flex justify-end pt-2 text-sm font-mono">
            <span className="text-muted-foreground mr-2">Total:</span>
            <span className="font-semibold flex items-center"><IndianRupee className="h-3 w-3" />{total.toLocaleString('en-IN')}</span>
          </div>
        </CardContent>
      </Card>

      {warnings.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" />Auto Rules (OOB-6)</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {warnings.map((w, i) => (
              <div key={i} className="text-xs flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{w.rule}</Badge>
                <span>{w.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {approvalChain && lines.some(l => l.item_name) && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              Approval Timeline Preview (OOB-7)
              <Badge variant="outline" className="text-[10px]">Tier {approvalChain.tier}</Badge>
              <Badge variant="outline" className="text-[10px]">{approvalChain.threshold_label}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">On submit · this indent will route to:</p>
            <ol className="space-y-1">
              {approvalChain.approvers.map((a, i) => (
                <li key={`${a.role}-${i}`} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-muted-foreground">{i + 1}.</span>
                    <span className="font-semibold">{a.role}</span>
                  </span>
                  <span className="text-muted-foreground">avg {a.avg_response_hours}h SLA</span>
                </li>
              ))}
            </ol>
            <div className="mt-3 pt-3 border-t flex justify-between text-xs">
              <span className="text-muted-foreground">Estimated total approval time:</span>
              <span className="font-semibold">~{approvalChain.estimated_total_hours} hours</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Sprint27eMount
        entityCode={entityCode}
        voucherTypeId="vt-material-indent"
        voucherTypeName="Material Indent"
        defaultPartyType="vendor"
        partyId={null}
        partyName={null}
        lineItems={[]}
        onPartyCreated={() => { /* no-op */ }}
        onCloneTemplate={() => { /* no-op */ }}
      />
    </div>
  );
}

export const MaterialIndentEntryPanel = MaterialIndentEntry;
