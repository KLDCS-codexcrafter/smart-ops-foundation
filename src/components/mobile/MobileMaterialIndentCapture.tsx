/**
 * @file        MobileMaterialIndentCapture.tsx
 * @sprint      T-Phase-1.2.6f-d-2-card8-8-pre-1 · Block A · D-403
 * @purpose     OperixGo Material Indent 3-step capture flow.
 * @reuses      request-engine.createMaterialIndent (Card #3 · NO MODIFICATIONS)
 *              offline-queue-engine.enqueueWrite · OfflineIndicator
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, ArrowLeft, ArrowRight, FileText, ClipboardList, Plus, Trash2, CheckCircle2, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';
import { OfflineIndicator } from '@/components/mobile/OfflineIndicator';
import { enqueueWrite } from '@/lib/offline-queue-engine';
import { createMaterialIndent, type CreateMaterialIndentInput } from '@/lib/request-engine';
import type { IndentCategory, Priority, MaterialIndentLine } from '@/types/material-indent';

type Step = 1 | 2 | 3;

interface LineDraft {
  item_name: string;
  uom: string;
  qty: number;
  estimated_rate: number;
  remarks: string;
}

interface FormState {
  department_name: string;
  category: IndentCategory;
  priority: Priority;
  lines: LineDraft[];
  notes: string;
}

const EMPTY_LINE: LineDraft = { item_name: '', uom: 'nos', qty: 0, estimated_rate: 0, remarks: '' };
const EMPTY_FORM: FormState = {
  department_name: '',
  category: 'raw_material',
  priority: 'normal',
  lines: [{ ...EMPTY_LINE }],
  notes: '',
};

const CATEGORIES: { value: IndentCategory; label: string }[] = [
  { value: 'raw_material', label: 'Raw Material' },
  { value: 'packaging_material', label: 'Packaging' },
  { value: 'printing_stationary', label: 'Stationery' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'samples_purchase', label: 'Samples' },
  { value: 'import_purchase', label: 'Import' },
];

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'critical_shutdown', label: 'Critical Shutdown' },
];

function getActiveEntityCode(): string {
  try { return localStorage.getItem('active_entity_code') ?? 'DEMO'; } catch { return 'DEMO'; }
}

function canProceed(s: FormState, step: Step): boolean {
  if (step === 1) return s.department_name.trim().length > 0;
  if (step === 2) return s.lines.length > 0 && s.lines.every(l => l.item_name.trim().length > 0 && l.qty > 0 && l.estimated_rate >= 0);
  return true;
}

function totalValue(lines: LineDraft[]): number {
  return lines.reduce((s, l) => s + l.qty * l.estimated_rate, 0);
}

interface Props { onClose: () => void }

export default function MobileMaterialIndentCapture({ onClose }: Props): JSX.Element {
  const [step, setStep] = useState<Step>(1);
  const [s, setS] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const ENTITY = getActiveEntityCode();

  const addLine = (): void => setS(prev => ({ ...prev, lines: [...prev.lines, { ...EMPTY_LINE }] }));
  const removeLine = (i: number): void => setS(prev => ({ ...prev, lines: prev.lines.filter((_, idx) => idx !== i) }));
  const updateLine = (i: number, patch: Partial<LineDraft>): void => setS(prev => ({
    ...prev, lines: prev.lines.map((l, idx) => idx === i ? { ...l, ...patch } : l),
  }));

  const submit = async (): Promise<void> => {
    setSubmitting(true);
    try {
      // [JWT] POST /api/requestx/material-indents
      const today = new Date().toISOString().slice(0, 10);
      const deptId = s.department_name.toLowerCase().replace(/\s+/g, '-');
      const lines: MaterialIndentLine[] = s.lines.map((l, idx) => ({
        id: `mil-mob-${Date.now()}-${idx}`,
        line_no: idx + 1,
        item_id: l.item_name.toLowerCase().replace(/\s+/g, '-'),
        item_name: l.item_name,
        description: l.remarks,
        uom: l.uom,
        qty: l.qty,
        current_stock_qty: 0,
        estimated_rate: l.estimated_rate,
        estimated_value: l.qty * l.estimated_rate,
        required_date: today,
        schedule_qty: null,
        schedule_date: null,
        remarks: l.remarks,
        target_godown_id: 'gd-main',
        target_godown_name: 'Main Stores',
        is_stocked: true,
        stock_check_status: 'pending',
        store_action: null,
        store_actor_id: null,
        store_action_at: null,
        parent_indent_line_id: null,
        cascade_reason: null,
      }));
      const input: CreateMaterialIndentInput = {
        entity_id: ENTITY,
        voucher_type_id: 'vt-material-indent',
        date: today,
        branch_id: 'branch-default',
        division_id: 'div-default',
        originating_department_id: deptId,
        originating_department_name: s.department_name,
        cost_center_id: 'cc-default',
        category: s.category,
        sub_type: 'general',
        priority: s.priority,
        requested_by_user_id: 'mobile-staff',
        requested_by_name: 'Mobile Staff',
        hod_user_id: 'hod-default',
        project_id: null,
        preferred_vendor_id: null,
        payment_terms: null,
        lines,
        parent_indent_id: null,
        cascade_reason: null,
        created_by: 'mobile-staff',
        updated_by: 'mobile-staff',
      };
      const indent = createMaterialIndent(input, ENTITY);
      enqueueWrite(ENTITY, 'rating_submit', { kind: 'material_indent', id: indent.id, voucher_no: indent.voucher_no });
      toast.success(`Indent ${indent.voucher_no} saved as DRAFT`);
      setS(EMPTY_FORM); setStep(1); onClose();
    } catch (e) {
      toast.error(`Submit failed: ${String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      <OfflineIndicator />
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onClose}><ArrowLeft className="h-4 w-4 mr-1" />Cancel</Button>
        <Badge variant="outline">Step {step} of 3</Badge>
      </div>
      <Progress value={(step / 3) * 100} />

      {step === 1 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Department + Category</h2></div>
          <div><Label>Department</Label><Input value={s.department_name} onChange={e => setS({ ...s, department_name: e.target.value })} placeholder="Production / Maintenance / QC" /></div>
          <div><Label>Category</Label>
            <Select value={s.category} onValueChange={v => setS({ ...s, category: v as IndentCategory })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Priority</Label>
            <Select value={s.priority} onValueChange={v => setS({ ...s, priority: v as Priority })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Items + Quantity</h2></div>
          {s.lines.map((l, i) => (
            <div key={`line-${i}`} className="border rounded p-2 space-y-2">
              <div className="flex justify-between items-center"><span className="text-sm font-medium">Line {i + 1}</span>
                {s.lines.length > 1 && <Button size="sm" variant="ghost" onClick={() => removeLine(i)}><Trash2 className="h-4 w-4" /></Button>}
              </div>
              <Input value={l.item_name} onChange={e => updateLine(i, { item_name: e.target.value })} placeholder="Item name" />
              <div className="grid grid-cols-3 gap-2">
                <Input type="number" value={l.qty || ''} onChange={e => updateLine(i, { qty: Number(e.target.value) })} placeholder="Qty" />
                <Input value={l.uom} onChange={e => updateLine(i, { uom: e.target.value })} placeholder="UOM" />
                <Input type="number" value={l.estimated_rate || ''} onChange={e => updateLine(i, { estimated_rate: Number(e.target.value) })} placeholder="Rate" />
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-4 w-4 mr-1" />Add line</Button>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-success" /><h2 className="text-lg font-semibold">Review</h2></div>
          <div className="text-sm space-y-1">
            <div><span className="text-muted-foreground">Dept:</span> <span className="font-medium">{s.department_name}</span></div>
            <div><span className="text-muted-foreground">Category:</span> {CATEGORIES.find(c => c.value === s.category)?.label}</div>
            <div><span className="text-muted-foreground">Priority:</span> <Badge variant={s.priority === 'urgent' || s.priority === 'critical_shutdown' ? 'destructive' : 'secondary'}>{PRIORITIES.find(p => p.value === s.priority)?.label}</Badge></div>
            <div className="pt-2 border-t">
              {s.lines.map((l, i) => (
                <div key={`rev-${i}`} className="text-xs flex justify-between font-mono"><span>{l.item_name}</span><span>{l.qty} {l.uom} × ₹{l.estimated_rate}</span></div>
              ))}
              <div className="flex items-center justify-end gap-1 pt-2 font-semibold font-mono"><IndianRupee className="h-4 w-4" />{totalValue(s.lines).toLocaleString('en-IN')}</div>
            </div>
          </div>
        </Card>
      )}

      <div className="flex gap-2">
        {step > 1 && <Button variant="outline" onClick={() => setStep(p => (p - 1) as Step)}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>}
        {step < 3 && <Button className="flex-1" disabled={!canProceed(s, step)} onClick={() => setStep(p => (p + 1) as Step)}>Next<ArrowRight className="h-4 w-4 ml-1" /></Button>}
        {step === 3 && <Button className="flex-1" disabled={submitting} onClick={submit}><Send className="h-4 w-4 mr-1" />{submitting ? 'Saving...' : 'Save as DRAFT'}</Button>}
      </div>
    </div>
  );
}
