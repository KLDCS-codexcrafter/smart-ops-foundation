/**
 * VoucherTypesMaster.tsx — VT-1 (Redesigned)
 * Design: List-table with right-side Sheet for create/edit
 * Rules:
 *   - 24 system defaults (is_system=true): edit settings only, no delete, base type locked
 *   - Custom types (is_system=false): full edit + delete
 *   - User picks a BASE TYPE (nature) — cannot change after first save
 *   - Business & financial logic: inherited layer (from base) + custom rules per type
 *   - GL/Inv impact / report bucket all come from base type — immutable
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Lock, Plus, Trash2, Edit2, ChevronDown, Search,
  CheckCircle2, XCircle, Info, Zap, ArrowLeftRight,
  ShieldCheck, RotateCcw, MessageSquare, Cpu, RefreshCw, X,
} from 'lucide-react';
import { useVoucherTypes } from '@/hooks/useVoucherTypes';
import type {
  VoucherType, VoucherFamily, VoucherBaseType, ActivationType,
  BehaviourRule, BehaviourRuleType, NumberingMethod,
  AutoPostConfig, ApprovalGateConfig, NarrationTemplateConfig,
  ValidationConfig, SettlementConfig, TaxTriggerConfig,
  AutoReversalConfig, ForexCaptureConfig, ForexSettlementConfig,
} from '@/types/voucher-type';
import {
  FAMILY_COLORS, NO_LINE_NARRATION_TYPES,
  ALWAYS_OPTIONAL_TYPES, SALES_ONLY_FIELDS,
} from '@/types/voucher-type';
import { onEnterNext } from '@/lib/keyboard';

// ── Constants ────────────────────────────────────────────────────────────────

const FAMILIES: VoucherFamily[] = [
  'Accounting', 'Non-Accounting', 'Inventory', 'Order', 'Job Work', 'Payroll',
];

const FAMILY_PILL: Record<VoucherFamily, string> = {
  Accounting:       'bg-teal-500/10 text-teal-700 dark:text-teal-400',
  'Non-Accounting': 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  Inventory:        'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  Order:            'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  'Job Work':       'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  Payroll:          'bg-rose-500/10 text-rose-700 dark:text-rose-400',
};

const BASE_FAMILY: Record<VoucherBaseType, VoucherFamily> = {
  Contra: 'Accounting', Payment: 'Accounting', Receipt: 'Accounting',
  Journal: 'Accounting', Sales: 'Accounting', Purchase: 'Accounting',
  'Debit Note': 'Accounting', 'Credit Note': 'Accounting',
  Memorandum: 'Non-Accounting', 'Reversing Journal': 'Non-Accounting',
  'Delivery Note': 'Inventory', 'Receipt Note': 'Inventory',
  'Rejections In': 'Inventory', 'Rejections Out': 'Inventory',
  'Stock Journal': 'Inventory', 'Stock Transfer': 'Inventory', 'Physical Stock': 'Inventory',
  'Sales Order': 'Order', 'Purchase Order': 'Order',
  'Job Work In Order': 'Job Work', 'Job Work Out Order': 'Job Work',
  'Material In': 'Job Work', 'Material Out': 'Job Work',
  Attendance: 'Payroll', Payroll: 'Payroll',
  'Capital Purchase': 'Accounting', 'Put To Use': 'Non-Accounting', 'Depreciation': 'Accounting',
  'Asset Transfer': 'Non-Accounting', 'Asset Verification': 'Non-Accounting',
  'Asset Write Off': 'Accounting', 'Capital Sale': 'Accounting',
  'Custodian Change': 'Non-Accounting', 'Expense Booking': 'Accounting',
};

const BASE_INHERITED: Record<VoucherBaseType, { gl: boolean; inv: boolean; settlement: boolean; report: string }> = {
  Contra:               { gl: true,  inv: false, settlement: false, report: 'Cash/Bank Book' },
  Payment:              { gl: true,  inv: false, settlement: true,  report: 'Payment Register' },
  Receipt:              { gl: true,  inv: false, settlement: true,  report: 'Receipt Register' },
  Journal:              { gl: true,  inv: false, settlement: false, report: 'Journal Register' },
  Sales:                { gl: true,  inv: true,  settlement: true,  report: 'Sales Register' },
  Purchase:             { gl: true,  inv: true,  settlement: true,  report: 'Purchase Register' },
  'Debit Note':         { gl: true,  inv: false, settlement: true,  report: 'Debit Note Register' },
  'Credit Note':        { gl: true,  inv: false, settlement: true,  report: 'Credit Note Register' },
  Memorandum:           { gl: true,  inv: false, settlement: false, report: 'Provisional View' },
  'Reversing Journal':  { gl: true,  inv: false, settlement: false, report: 'Reversing Journal Register' },
  'Delivery Note':      { gl: false, inv: true,  settlement: false, report: 'Delivery Register' },
  'Receipt Note':       { gl: false, inv: true,  settlement: false, report: 'GRN Register' },
  'Rejections In':      { gl: false, inv: true,  settlement: false, report: 'Rejection Register' },
  'Rejections Out':     { gl: false, inv: true,  settlement: false, report: 'Rejection Register' },
  'Stock Journal':      { gl: false, inv: true,  settlement: false, report: 'Stock Journal Register' },
  'Stock Transfer':     { gl: false, inv: true,  settlement: false, report: 'Stock Transfer Register' },
  'Physical Stock':     { gl: false, inv: true,  settlement: false, report: 'Physical Stock Report' },
  'Sales Order':        { gl: false, inv: false, settlement: false, report: 'Order Book' },
  'Purchase Order':     { gl: false, inv: false, settlement: false, report: 'PO Register' },
  'Job Work In Order':  { gl: false, inv: false, settlement: false, report: 'Job Work Register' },
  'Job Work Out Order': { gl: false, inv: false, settlement: false, report: 'Job Work Register' },
  'Material In':        { gl: false, inv: true,  settlement: false, report: 'Material In Register' },
  'Material Out':       { gl: false, inv: true,  settlement: false, report: 'Material Out Register' },
  Attendance:           { gl: false, inv: false, settlement: false, report: 'Attendance Register' },
  Payroll:              { gl: true,  inv: false, settlement: false, report: 'Payroll Register' },
  'Capital Purchase':   { gl: true,  inv: false, settlement: false, report: 'Fixed Asset Register' },
  'Put To Use':         { gl: false, inv: false, settlement: false, report: 'Fixed Asset Register' },
  'Depreciation':       { gl: true,  inv: false, settlement: false, report: 'Depreciation Workings' },
  'Asset Transfer':     { gl: false, inv: false, settlement: false, report: 'Fixed Asset Register' },
  'Asset Verification': { gl: false, inv: false, settlement: false, report: 'Fixed Asset Register' },
  'Asset Write Off':    { gl: true,  inv: false, settlement: false, report: 'Asset Disposal' },
  'Capital Sale':       { gl: true,  inv: false, settlement: false, report: 'Asset Disposal' },
  'Custodian Change':   { gl: false, inv: false, settlement: false, report: 'Fixed Asset Register' },
  'Expense Booking':    { gl: true,  inv: false, settlement: false, report: 'Fixed Asset Register' },
};

const NUMBERING_LABELS: Record<NumberingMethod, string> = {
  automatic: 'Automatic', automatic_manual_override: 'Auto (Override)',
  manual: 'Manual', multi_user_auto: 'Multi-user Auto', none: 'None',
};

const RULE_META: Record<BehaviourRuleType, { icon: React.ElementType; label: string; color: string }> = {
  auto_post:          { icon: Zap,           label: 'Auto-Post Entry',    color: 'text-amber-500' },
  validation:         { icon: ShieldCheck,    label: 'Validation',         color: 'text-blue-500'  },
  settlement:         { icon: ArrowLeftRight, label: 'Settlement',         color: 'text-teal-500'  },
  tax_trigger:        { icon: Cpu,            label: 'Tax Trigger',        color: 'text-purple-500'},
  approval_gate:      { icon: CheckCircle2,   label: 'Approval Gate',      color: 'text-green-500' },
  auto_reversal:      { icon: RotateCcw,      label: 'Auto-Reversal',      color: 'text-rose-500'  },
  narration_template: { icon: MessageSquare,  label: 'Narration Template', color: 'text-slate-500' },
  forex_capture:      { icon: Zap,            label: 'Forex Capture',      color: 'text-cyan-500'  },
  forex_settlement:   { icon: ArrowLeftRight, label: 'Forex Settlement',   color: 'text-orange-500'},
};

const ALL_BASE_TYPES: VoucherBaseType[] = [
  'Contra','Payment','Receipt','Journal','Sales','Purchase','Debit Note','Credit Note',
  'Memorandum','Reversing Journal','Delivery Note','Receipt Note','Rejections In','Rejections Out',
  'Stock Journal','Physical Stock','Sales Order','Purchase Order',
  'Job Work In Order','Job Work Out Order','Material In','Material Out','Attendance','Payroll',
];

const TAX_APPLICABLE: VoucherBaseType[] = ['Sales','Purchase','Debit Note','Credit Note'];

// ── Blank form ────────────────────────────────────────────────────────────────

const BLANK = {
  name: '', abbreviation: '', base_voucher_type: '' as VoucherBaseType,
  family: 'Accounting' as VoucherFamily, is_active: true, activation_type: 'active' as ActivationType,
  accounting_impact: true, inventory_impact: false,
  is_optional_default: false, use_effective_date: false,
  allow_zero_value: false, allow_narration: true, allow_line_narration: true,
  numbering_method: 'automatic' as NumberingMethod, use_custom_series: false, numbering_prefix: '', numbering_suffix: '', numbering_start: 1, numbering_width: 4, numbering_prefill_zeros: true, prevent_duplicate_manual: true, insertion_deletion_behaviour: 'retain_original' as 'retain_original' | 'renumber', show_unused_numbers: false,
  current_sequence: 1, behaviour_rules: [] as BehaviourRule[],
  print_after_save: false, use_for_pos: false, print_title: '',
  default_bank_ledger_id: null as string | null, default_jurisdiction: '', declaration_text: '',
  entity_id: null as string | null,
};

// ── Small helpers ─────────────────────────────────────────────────────────────

function GlIcon({ on }: { on: boolean }) {
  return on
    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
    : <XCircle className="h-3.5 w-3.5 text-muted-foreground/25" />;
}

function ActiveDot({ on, onClick }: { on: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center justify-center w-6">
      <span className={cn('inline-block w-2 h-2 rounded-full transition-colors',
        on ? 'bg-emerald-500' : 'bg-muted-foreground/30')} />
    </button>
  );
}

// ── Inherited Behaviour Banner ────────────────────────────────────────────────

function InheritedBanner({ base }: { base: VoucherBaseType }) {
  const info = BASE_INHERITED[base];
  if (!info) return null;
  const checks = [
    { on: info.gl,         label: info.gl ? 'Posts to General Ledger (GL accounting impact)' : 'No GL posting — inventory/order document only' },
    { on: info.inv,        label: info.inv ? 'Moves inventory stock balances' : 'No inventory movement' },
    { on: info.settlement, label: 'Bill-by-bill settlement against outstanding entries' },
    { on: true,            label: `Report bucket → ${info.report}` },
  ].filter((c, i) => i < 2 || c.on);

  return (
    <div data-keyboard-form className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/20 p-3">
      <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-2">
        Nature inherited from "{base}" — fixed, cannot override
      </p>
      <div className="space-y-1.5">
        {checks.map((c, i) => (
          <div key={i} className="flex items-center gap-2 text-[12px] text-blue-900 dark:text-blue-300">
            <span className={cn(
              'w-3.5 h-3.5 rounded-sm flex items-center justify-center flex-shrink-0',
              c.on ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
            )}>
              {c.on && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
            </span>
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Rule Card ─────────────────────────────────────────────────────────────────

function RuleCard({ rule, inherited = false, onToggle, onRemove }:
  { rule: BehaviourRule; inherited?: boolean; onToggle?: () => void; onRemove?: () => void }) {
  const meta = RULE_META[rule.rule_type];
  const Icon = meta.icon as React.ElementType;
  return (
    <div data-keyboard-form className={cn(
      'flex items-start gap-2 rounded-md border p-2 text-[11px]',
      inherited ? 'bg-muted/20 border-border/30 opacity-60' : 'bg-card border-border/60',
      !rule.is_active && !inherited && 'opacity-40'
    )}>
      <Icon className={cn('h-3 w-3 mt-0.5 shrink-0', rule.is_active ? meta.color : 'text-muted-foreground')} />
      <div className="flex-1 min-w-0">
        <span className="font-medium text-foreground">{rule.label}</span>
        {rule.rule_type === 'auto_post' && (
          <p className="text-muted-foreground font-mono text-[10px] mt-0.5">
            Dr {(rule.config as AutoPostConfig).debit_ledger_name} / Cr {(rule.config as AutoPostConfig).credit_ledger_name}
          </p>
        )}
        {rule.rule_type === 'approval_gate' && (
          <p className="text-muted-foreground text-[10px] mt-0.5">
            Above ₹{Number((rule.config as ApprovalGateConfig).threshold_amount || 0).toLocaleString('en-IN')} → {(rule.config as ApprovalGateConfig).approver_role}
          </p>
        )}
        {rule.rule_type === 'narration_template' && (
          <p className="text-muted-foreground font-mono text-[10px] mt-0.5 truncate">
            {(rule.config as NarrationTemplateConfig).template}
          </p>
        )}
      </div>
      {!inherited && (
        <div className="flex items-center gap-0.5 shrink-0">
          {onToggle && (
            <button onClick={onToggle} className="p-0.5 rounded hover:bg-muted/50 text-muted-foreground">
              {rule.is_active ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <XCircle className="h-3 w-3" />}
            </button>
          )}
          {onRemove && (
            <button onClick={onRemove} className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Toggle Row ─────────────────────────────────────────────────────────────────

function TRow({ label, checked, onChange, disabled, hint }:
  { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; hint?: string }) {
  return (
    <div className={cn('flex items-center justify-between py-2 border-b border-border/40 last:border-0', disabled && 'opacity-40')}>
      <div>
        <p className="text-[13px] text-foreground">{label}</p>
        {hint && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} className="scale-75" />
    </div>
  );
}

// ── Sheet (Create / Edit) ─────────────────────────────────────────────────────

function VoucherSheet({
  open, onOpenChange, editVt, onSave, addRule, removeRule, toggleRule,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editVt: VoucherType | null;
  onSave: (form: typeof BLANK) => void;
  addRule: (id: string, r: Omit<BehaviourRule, 'id'>) => void;
  removeRule: (id: string, rId: string) => void;
  toggleRule: (id: string, rId: string) => void;
}) {
  const isEdit = !!editVt;
  const baseLocked = isEdit && editVt!.current_sequence > 1;
  const sysLocked  = isEdit && editVt!.is_system;

  const initForm = useCallback(() =>
    editVt
      ? { name: editVt.name, abbreviation: editVt.abbreviation, base_voucher_type: editVt.base_voucher_type,
          family: editVt.family, is_active: editVt.is_active, activation_type: editVt.activation_type,
          accounting_impact: editVt.accounting_impact, inventory_impact: editVt.inventory_impact,
          is_optional_default: editVt.is_optional_default, use_effective_date: editVt.use_effective_date,
          allow_zero_value: editVt.allow_zero_value, allow_narration: editVt.allow_narration,
          allow_line_narration: editVt.allow_line_narration, numbering_method: editVt.numbering_method,
          use_custom_series: editVt.use_custom_series ?? false, numbering_prefix: editVt.numbering_prefix, numbering_suffix: editVt.numbering_suffix ?? '', numbering_start: editVt.numbering_start ?? 1, numbering_width: editVt.numbering_width, numbering_prefill_zeros: editVt.numbering_prefill_zeros ?? true, prevent_duplicate_manual: editVt.prevent_duplicate_manual ?? true, insertion_deletion_behaviour: editVt.insertion_deletion_behaviour ?? 'retain_original', show_unused_numbers: editVt.show_unused_numbers ?? false,
          current_sequence: editVt.current_sequence, behaviour_rules: editVt.behaviour_rules,
          print_after_save: editVt.print_after_save, use_for_pos: editVt.use_for_pos,
          print_title: editVt.print_title, default_bank_ledger_id: editVt.default_bank_ledger_id,
          default_jurisdiction: editVt.default_jurisdiction, declaration_text: editVt.declaration_text,
          entity_id: editVt.entity_id }
      : { ...BLANK },
  [editVt]);

  const [form, setForm] = useState<typeof BLANK>(initForm);
  const upd = (p: Partial<typeof BLANK>) => setForm(f => ({ ...f, ...p }));

  useEffect(() => {
    if (open) {
      const freshForm = initForm();
      // Auto-fill jurisdiction from company governance on Create (not edit)
      if (!editVt && !freshForm.default_jurisdiction) {
        try {
          // [JWT] GET /api/foundation/companies
          interface CompanyRef { hqCity?: string; hqState?: string; jurisdiction?: string }
          const companies: CompanyRef[] = JSON.parse(localStorage.getItem('erp_companies') || '[]');
          const co = companies[0];
          if (co) {
            const parts = [co.hqCity, co.hqState].filter(Boolean);
            if (parts.length > 0) {
              freshForm.default_jurisdiction = `Subject to ${parts.join(', ')} jurisdiction`;
            } else if (co.jurisdiction) {
              freshForm.default_jurisdiction = co.jurisdiction;
            }
          }
        } catch { /* ignore */ }
      }
      setForm(freshForm);
    }
  }, [open, initForm, editVt]);

  const handleBase = (base: VoucherBaseType) => {
    const fam = BASE_FAMILY[base];
    const inh = BASE_INHERITED[base];
    upd({
      base_voucher_type: base, family: fam,
      accounting_impact: inh.gl, inventory_impact: inh.inv,
      numbering_prefix: base.slice(0, 4).toUpperCase().replace(/\s/g, '') + '-',
      allow_line_narration: !NO_LINE_NARRATION_TYPES.includes(base),
    });
  };

  const showAutoFields = form.numbering_method === 'automatic' || form.numbering_method === 'automatic_manual_override' || form.numbering_method === 'multi_user_auto';
  const isManual     = form.numbering_method === 'manual';
  const numStr       = String(form.numbering_start ?? 1).padStart(form.numbering_prefill_zeros ? form.numbering_width : 0, '0');
  const nextPrev     = showAutoFields && form.use_custom_series
    ? `${form.numbering_prefix || ''}${numStr}${form.numbering_suffix || ''}`
    : showAutoFields
    ? `${form.numbering_prefix || ''}${String(form.current_sequence).padStart(form.numbering_width, '0')}`
    : '—';
  const lineOff    = NO_LINE_NARRATION_TYPES.includes(form.base_voucher_type);
  const alwaysOpt  = ALWAYS_OPTIONAL_TYPES.includes(form.base_voucher_type);
  const salesOnly  = SALES_ONLY_FIELDS.includes(form.base_voucher_type);
  const inh        = BASE_INHERITED[form.base_voucher_type];

  const save = () => {
    if (!form.name.trim())            { toast.error('Name is required'); return; }
    if (!form.base_voucher_type)       { toast.error('Base type is required'); return; }
    if (!form.abbreviation.trim())     { toast.error('Abbreviation is required'); return; }
    onSave(form);
    onOpenChange(false);
  };

  const addNew = (rt: BehaviourRuleType) => {
    if (!editVt) return;
    const cfgs: Record<BehaviourRuleType, AutoPostConfig | ValidationConfig | SettlementConfig | TaxTriggerConfig | ApprovalGateConfig | AutoReversalConfig | NarrationTemplateConfig | ForexCaptureConfig | ForexSettlementConfig> = {
      auto_post:          { debit_ledger_code:'', debit_ledger_name:'Select ledger', credit_ledger_code:'', credit_ledger_name:'Select ledger', amount_mode:'full' },
      validation:         { require_party:true, require_narration:false, block_future_date:false, require_cost_centre:false },
      settlement:         { auto_settle:true, settle_against:'invoices', method:'fifo', show_bill_by_bill:true },
      tax_trigger:        { apply_gst:true, tax_type:'auto_detect', tds_applicable:false, tcs_applicable:false },
      approval_gate:      { requires_approval:true, threshold_amount:100000, approver_role:'Manager' },
      auto_reversal:      { reversal_on:'period_start', reversal_narration:'Auto-reversal of {original_voucher_no}' },
      narration_template: { template:'Being {type} of {party} against {ref}', variables:['type','party','ref'] },
      forex_capture:      { default_rate_type:'selling', allow_rate_override:true, require_rate_if_foreign:true, store_dual_amounts:true },
      forex_settlement:   { calculate_realized_gain_loss:true, gain_ledger_code:'FXGAIN-SYS', loss_ledger_code:'FXLOSS-SYS', auto_reversal_on_next_period:false },
    };
    addRule(editVt.id, { rule_type:rt, label:RULE_META[rt].label, is_active:true, sequence:editVt.behaviour_rules.length+1, config:cfgs[rt] });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[420px] p-0 flex flex-col overflow-hidden">
        <SheetHeader className="px-5 py-4 border-b border-border/50 shrink-0">
          <SheetTitle className="text-[15px]">
            {isEdit ? `Edit — ${editVt!.name}` : 'New Custom Voucher Type'}
          </SheetTitle>
          <SheetDescription className="text-[12px]">
            {isEdit && sysLocked
              ? 'System type — configure settings only. Base type and nature are permanently locked.'
              : isEdit
              ? 'Edit name, series, flags, and business logic rules.'
              : 'Give it a name. Pick a base type. The nature is fixed — cannot change after save.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* IDENTITY */}
          <div className="space-y-3">
            <div>
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">
                Voucher Type Name <span className="text-destructive">*</span>
              </Label>
              <Input value={form.name} onChange={e => upd({ name: e.target.value })}
                placeholder="e.g. Bank Payment — HDFC" className="mt-1 h-8 text-sm" />
              <p className="text-[10px] text-muted-foreground mt-1">What users see in the transaction type dropdown</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">
                  Abbreviation <span className="text-destructive">*</span>
                </Label>
                <Input value={form.abbreviation}
                  onChange={e => upd({ abbreviation: e.target.value.toUpperCase().slice(0, 6) })}
                  placeholder="BNKH" maxLength={6}
                  className="mt-1 h-8 text-sm font-mono" />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">
                  Base Type (Nature) <span className="text-destructive">*</span>
                </Label>
                {baseLocked || sysLocked ? (
                  <div className="mt-1 h-8 flex items-center gap-1.5 px-3 rounded-md border border-border bg-muted/50 text-[13px] text-muted-foreground">
                    <Lock className="h-3 w-3" /> {form.base_voucher_type}
                  </div>
                ) : (
                  <Select value={form.base_voucher_type} onValueChange={v => handleBase(v as VoucherBaseType)}>
                    <SelectTrigger className="mt-1 h-8 text-sm">
                      <SelectValue placeholder="Select base type" />
                    </SelectTrigger>
                    <SelectContent>
                      {FAMILIES.map(fam => (
                        <div key={fam}>
                          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{fam}</div>
                          {ALL_BASE_TYPES.filter(bt => BASE_FAMILY[bt] === fam).map(bt => (
                            <SelectItem key={bt} value={bt} className="text-sm">{bt}</SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {baseLocked && (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 p-2.5 text-[11px] text-amber-700 dark:text-amber-400">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                Base type locked — {editVt!.current_sequence - 1} voucher(s) already posted.
              </div>
            )}
          </div>

          {/* INHERITED */}
          {form.base_voucher_type && <InheritedBanner base={form.base_voucher_type} />}

          <Separator />

          {/* NUMBERING */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 w-full group py-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex-1 text-left">Numbering</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50 transition-transform group-data-[state=closed]:-rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">

              {/* Method */}
              <div>
                <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Method</Label>
                <Select value={form.numbering_method} onValueChange={v => upd({ numbering_method: v as NumberingMethod })}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(NUMBERING_LABELS) as [NumberingMethod, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-sm pl-2">
                        <div>
                          <span>{v}</span>
                          {k === 'automatic_manual_override' && (
                            <span className="text-[10px] text-muted-foreground ml-1">— pre-fills last+1, user can override</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Manual: prevent duplicate toggle */}
              {isManual && (
                <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2">
                  <TRow
                    label="Prevent duplicate voucher numbers"
                    checked={form.prevent_duplicate_manual}
                    onChange={v => upd({ prevent_duplicate_manual: v })}
                    hint="Rejects a number already used by this voucher type during transaction entry"
                  />
                </div>
              )}

              {/* Auto methods: custom series toggle */}
              {showAutoFields && (
                <>
                  <TRow
                    label="Use custom number series"
                    checked={form.use_custom_series}
                    onChange={v => upd({ use_custom_series: v })}
                    hint="OFF = auto series (e.g. SI-0001). ON = configure prefix, suffix, width."
                  />

                  {form.use_custom_series && (
                    <div className="rounded-lg border border-border/50 bg-muted/10 p-3 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Prefix</Label>
                          <Input value={form.numbering_prefix}
                            onChange={e => upd({ numbering_prefix: e.target.value })}
                            className="mt-1 h-8 text-sm font-mono" placeholder="SI/" />
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Suffix</Label>
                          <Input value={form.numbering_suffix}
                            onChange={e => upd({ numbering_suffix: e.target.value })}
                            className="mt-1 h-8 text-sm font-mono" placeholder="/MH" />
                        </div>
                      </div>
                      <div className="grid grid-cols-[1fr_80px_80px] gap-2">
                        <div>
                          <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Starting Number</Label>
                          <Input type="number" min={1} value={form.numbering_start ?? 1}
                            onChange={e => upd({ numbering_start: Number(e.target.value) })}
                            className="mt-1 h-8 text-sm font-mono" />
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Width</Label>
                          <Input type="number" min={1} max={10} value={form.numbering_width}
                            onChange={e => upd({ numbering_width: Number(e.target.value) })}
                            className="mt-1 h-8 text-sm font-mono" />
                        </div>
                        <div className="flex flex-col">
                          <Label className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Fill zeros</Label>
                          <Switch checked={form.numbering_prefill_zeros} onCheckedChange={v => upd({ numbering_prefill_zeros: v })} className="scale-75 mt-1" />
                        </div>
                      </div>
                      {/* Live preview */}
                      <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 border border-border/40 text-[11px]">
                        <RefreshCw className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Preview:</span>
                        <span className="font-mono font-semibold text-foreground">{nextPrev}</span>
                      </div>
                    </div>
                  )}

                  {!form.use_custom_series && showAutoFields && (
                    <div className="flex items-center gap-2 rounded-md bg-muted/30 px-3 py-1.5 border border-border/30 text-[11px]">
                      <RefreshCw className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Next:</span>
                      <span className="font-mono font-semibold text-foreground">
                        {form.numbering_prefix || form.abbreviation || 'XX'}-{String(form.current_sequence).padStart(4, '0')}
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Insertion / Deletion behaviour — for all auto methods */}
              {showAutoFields && (
                <div className="space-y-2 pt-1">
                  <Separator />
                  <div>
                    <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Numbering behaviour on insertion / deletion</Label>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5 mb-2">What happens to voucher numbers when an entry is inserted or deleted mid-sequence?</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(['retain_original', 'renumber'] as const).map(opt => (
                        <button key={opt} type="button"
                          onClick={() => upd({ insertion_deletion_behaviour: opt })}
                          className={cn(
                            'flex flex-col items-start gap-0.5 rounded-lg border p-2.5 text-left transition-all',
                            form.insertion_deletion_behaviour === opt
                              ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/20'
                              : 'border-border/50 hover:border-border bg-muted/10'
                          )}>
                          <span className="text-[12px] font-medium text-foreground">
                            {opt === 'retain_original' ? 'Retain Original No.' : 'Renumber Vouchers'}
                          </span>
                          <span className="text-[10px] text-muted-foreground leading-tight">
                            {opt === 'retain_original'
                              ? 'Gaps allowed. Existing numbers never change. GST-safe.'
                              : 'Subsequent vouchers renumbered in sequence.'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {form.insertion_deletion_behaviour === 'retain_original' && (
                    <TRow
                      label="Show unused numbers in transaction entry"
                      checked={form.show_unused_numbers}
                      onChange={v => upd({ show_unused_numbers: v })}
                      hint="Transaction screen will surface gaps for reuse"
                    />
                  )}
                  {form.insertion_deletion_behaviour === 'renumber' && (
                    <div className="flex items-start gap-2 rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400">
                      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      Renumbering may affect previously issued invoice numbers. Not recommended for GST-registered entities.
                    </div>
                  )}
                </div>
              )}

            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* BEHAVIOUR FLAGS */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 w-full group py-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex-1 text-left">Behaviour Flags</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50 transition-transform group-data-[state=closed]:-rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {/* is_optional_default intentionally hidden — belongs to transaction module, not master setup */}
              <TRow label="Use effective date" checked={form.use_effective_date}
                onChange={v => upd({ use_effective_date: v })}
                hint="Ageing uses effective date instead of voucher date" />
              <TRow label="Allow zero-value transactions" checked={form.allow_zero_value}
                onChange={v => upd({ allow_zero_value: v })} />
              <TRow label="Allow narration" checked={form.allow_narration}
                onChange={v => upd({ allow_narration: v })} />
              <TRow label="Allow line-level narration" checked={form.allow_line_narration}
                onChange={v => upd({ allow_line_narration: v })} disabled={lineOff}
                hint={lineOff ? 'Not supported for this base type (Tally spec)' : undefined} />
              <TRow label="Print after saving" checked={form.print_after_save}
                onChange={v => upd({ print_after_save: v })} />
              {salesOnly && <>
                <TRow label="Use for POS invoicing" checked={form.use_for_pos}
                  onChange={v => upd({ use_for_pos: v })} />
                <div className="pt-2">
                  <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Print Title</Label>
                  <Input value={form.print_title} onChange={e => upd({ print_title: e.target.value })}
                    className="mt-1 h-8 text-sm" placeholder="Sales Invoice" />
                </div>
              </>}
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* BUSINESS & FINANCIAL LOGIC */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 w-full group py-1">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex-1 text-left">Business &amp; Financial Logic</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50 transition-transform group-data-[state=closed]:-rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-2">
              {/* Inherited read-only rules */}
              {form.base_voucher_type && inh && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Inherited from "{form.base_voucher_type}" — read only
                  </p>
                  <div className="space-y-1.5">
                    {inh.gl && <RuleCard inherited rule={{ id:'i1', rule_type:'validation', label:'Party ledger mandatory', is_active:true, sequence:0, config:{require_party:true,require_narration:false,block_future_date:false,require_cost_centre:false} }} />}
                    {inh.settlement && <RuleCard inherited rule={{ id:'i2', rule_type:'settlement', label:'FIFO settlement against outstanding entries', is_active:true, sequence:0, config:{auto_settle:true,settle_against:'invoices',method:'fifo',show_bill_by_bill:true} }} />}
                    {TAX_APPLICABLE.includes(form.base_voucher_type) && <RuleCard inherited rule={{ id:'i3', rule_type:'tax_trigger', label:'GST auto-calculation on posting', is_active:true, sequence:0, config:{apply_gst:true,tax_type:'auto_detect',tds_applicable:false,tcs_applicable:false} }} />}
                  </div>
                </div>
              )}

              {/* Custom rules (only for edit mode) */}
              {isEdit && editVt && (
                <div className="pt-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Custom rules for this type only
                  </p>
                  {editVt.behaviour_rules.length === 0
                    ? <p className="text-[11px] text-muted-foreground py-1">No custom rules yet.</p>
                    : <div className="space-y-1.5">
                        {editVt.behaviour_rules.map(rule => (
                          <RuleCard key={rule.id} rule={rule}
                            onToggle={() => toggleRule(editVt.id, rule.id)}
                            onRemove={() => removeRule(editVt.id, rule.id)} />
                        ))}
                      </div>
                  }
                  <Separator className="my-3" />
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Add rule</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.entries(RULE_META) as [BehaviourRuleType, typeof RULE_META[BehaviourRuleType]][]).map(([rt, meta]) => {
                      const Icon = meta.icon as React.ElementType;
                      return (
                        <button key={rt} onClick={() => addNew(rt)}
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group">
                          <Icon className={cn('h-3 w-3 shrink-0', meta.color)} />
                          <span className="text-[10px] text-muted-foreground group-hover:text-foreground leading-tight">{meta.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {!isEdit && (
                <p className="text-[11px] text-muted-foreground">Save first, then open Edit to add custom rules.</p>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* DECLARATION */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 w-full group py-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex-1 text-left">Declaration &amp; Jurisdiction</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50 transition-transform group-data-[state=closed]:-rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              <Textarea value={form.declaration_text}
                onChange={e => upd({ declaration_text: e.target.value })}
                rows={2} className="text-sm resize-none"
                placeholder="Printed at the bottom of this voucher type…" />
              <div>
                <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Jurisdiction</Label>
                <Input value={form.default_jurisdiction}
                  onChange={e => upd({ default_jurisdiction: e.target.value })}
                  className="mt-1 h-8 text-sm" placeholder="e.g. Subject to Maharashtra jurisdiction" />
                <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Auto-filled from company governance · set it once in Entity Management to apply everywhere
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

        </div>

        <div className="px-5 py-3 border-t border-border/50 flex gap-2 shrink-0">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" className="flex-1 h-8 text-xs" onClick={save}>
            {isEdit ? 'Save Changes' : 'Create Voucher Type'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function VoucherTypesMasterPanel() {
  const { types, stats, updateType, createCustomType, toggleActive, addRule, removeRule, toggleRule, deleteType } = useVoucherTypes();

  const [search,       setSearch]       = useState('');
  const [familyFilter, setFamilyFilter] = useState<VoucherFamily | 'all'>('all');
  const [viewFilter,   setViewFilter]   = useState<'all' | 'active' | 'custom'>('all');
  const [sheetOpen,    setSheetOpen]    = useState(false);
  const [editVt,       setEditVt]       = useState<VoucherType | null>(null);
  const [delTarget,    setDelTarget]    = useState<VoucherType | null>(null);

  const openNew  = () => { setEditVt(null); setSheetOpen(true); };
  const openEdit = (vt: VoucherType) => { setEditVt(vt); setSheetOpen(true); };

  const handleSave = (form: typeof BLANK) => {
    if (editVt) {
      updateType(editVt.id, form as Partial<VoucherType>);
    } else {
      createCustomType({ ...form, is_active: true });
    }
  };

  const confirmDelete = () => {
    if (!delTarget) return;
    deleteType(delTarget.id);
    setDelTarget(null);
  };

  const filtered = useMemo(() =>
    types.filter(t => {
      const q = search.toLowerCase();
      const mQ = !q || t.name.toLowerCase().includes(q) || t.abbreviation.toLowerCase().includes(q) || t.base_voucher_type.toLowerCase().includes(q);
      const mF = familyFilter === 'all' || t.family === familyFilter;
      const mV = viewFilter === 'all' || (viewFilter === 'active' && t.is_active) || (viewFilter === 'custom' && !t.is_system);
      return mQ && mF && mV;
    }), [types, search, familyFilter, viewFilter]
  );

  const customTypes  = filtered.filter(t => !t.is_system);
  const systemTypes  = filtered.filter(t => t.is_system);
  const byFam = FAMILIES.reduce<Record<VoucherFamily, VoucherType[]>>((acc, f) => {
    acc[f] = systemTypes.filter(t => t.family === f);
    return acc;
  }, {} as Record<VoucherFamily, VoucherType[]>);

  const TH = () => (
    <thead>
      <tr className="bg-muted/40 border-b border-border/50">
        {['','Name','Abbr','Base Type (Nature)','Family','GL','Inv','Next #','Rules','Active','Actions'].map((h, i) => (
          <th key={i} className={cn(
            'px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap',
            i >= 9 ? 'text-right' : 'text-left', i === 5 || i === 6 ? 'text-center' : ''
          )}>{h}</th>
        ))}
      </tr>
    </thead>
  );

  const TR = ({ vt }: { vt: VoucherType }) => (
    <tr className="hover:bg-muted/20 transition-colors border-b border-border/30 last:border-0">
      <td className="px-3 py-2.5 w-7">
        {vt.is_system && <Lock className="h-3 w-3 text-muted-foreground/25" />}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium text-foreground">{vt.name}</span>
          {!vt.is_system && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-medium">Custom</span>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5">
        <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{vt.abbreviation}</span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] text-muted-foreground">{vt.base_voucher_type}</span>
          {!vt.is_system && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground border border-border/50 font-medium">inherited</span>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5">
        <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full', FAMILY_PILL[vt.family])}>
          {vt.family}
        </span>
      </td>
      <td className="px-3 py-2.5 text-center"><GlIcon on={vt.accounting_impact} /></td>
      <td className="px-3 py-2.5 text-center"><GlIcon on={vt.inventory_impact} /></td>
      <td className="px-3 py-2.5">
        {vt.numbering_method !== 'none'
          ? <span className="font-mono text-[11px] text-muted-foreground">
              {vt.use_custom_series
                ? `${vt.numbering_prefix || ''}${String(vt.current_sequence).padStart(vt.numbering_width, '0')}${vt.numbering_suffix || ''}`
                : `${vt.numbering_prefix || ''}${String(vt.current_sequence).padStart(vt.numbering_width, '0')}`}
            </span>
          : <span className="text-[11px] text-muted-foreground">Manual</span>}
      </td>
      <td className="px-3 py-2.5">
        {vt.behaviour_rules.length > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Zap className="h-2.5 w-2.5 text-amber-500" />
            {vt.behaviour_rules.filter(r => r.is_active).length}
          </span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <ActiveDot on={vt.is_active} onClick={() => toggleActive(vt.id)} />
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1 justify-end">
          <button onClick={() => openEdit(vt)}
            className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors">
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          {!vt.is_system
            ? <button onClick={() => setDelTarget(vt)}
                className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            : <span className="w-[28px]" />}
        </div>
      </td>
    </tr>
  );

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background flex flex-col">
        <ERPHeader />
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ── Command strip ── */}
          <div className="border-b border-border/50 bg-card/60 backdrop-blur-sm px-6 py-3 shrink-0">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="shrink-0">
                <h1 className="text-[15px] font-semibold text-foreground">Voucher Types</h1>
                <p className="text-[11px] text-muted-foreground">
                  {stats.total} total · {stats.system} system · {stats.custom} custom · {stats.active} active
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search types…" className="pl-8 h-8 text-xs w-44 bg-muted/30" />
              </div>

              <div className="flex border border-border/60 rounded-md overflow-hidden text-[11px]">
                {(['all','active','custom'] as const).map(v => (
                  <button key={v} onClick={() => setViewFilter(v)}
                    className={cn('px-3 py-1.5 capitalize border-r border-border/40 last:border-0 transition-colors',
                      viewFilter === v ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted/40')}>
                    {v}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 flex-wrap">
                {(['all', ...FAMILIES] as const).map(f => (
                  <button key={f} onClick={() => setFamilyFilter(f)}
                    className={cn('px-2.5 py-1 text-[10px] font-medium rounded-full border transition-colors',
                      familyFilter === f
                        ? 'bg-foreground text-background border-foreground'
                        : 'border-border/60 text-muted-foreground hover:border-primary/40')}>
                    {f === 'all' ? 'All' : f}
                  </button>
                ))}
              </div>

              <div className="flex-1" />
              <Button size="sm" className="h-8 text-xs gap-1.5 shrink-0" onClick={openNew}>
                <Plus className="h-3.5 w-3.5" />
                New Custom Type
              </Button>
            </div>
          </div>

          {/* ── Table ── */}
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-sm min-w-[900px]">
              <TH />
              <tbody>
                {customTypes.length > 0 && (
                  <>
                    <tr>
                      <td colSpan={11}
                        className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-b border-blue-100 dark:border-blue-900/40">
                        Custom types ({customTypes.length}) — different names, base type inherited · full edit + delete
                      </td>
                    </tr>
                    {customTypes.map(vt => <TR key={vt.id} vt={vt} />)}
                  </>
                )}

                {FAMILIES.map(fam => {
                  const rows = byFam[fam];
                  if (!rows?.length) return null;
                  const fc = FAMILY_COLORS[fam];
                  return (
                    <tr key={fam}>
                      <td colSpan={11} className="p-0">
                        <table className="w-full border-collapse">
                          <tbody>
                            <tr>
                              <td colSpan={11}
                                className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/20 border-b border-border/30 border-t border-border/20">
                                <span className="flex items-center gap-1.5">
                                  <span className={cn('inline-block w-1.5 h-1.5 rounded-full', fc.dot)} />
                                  {fam} — {rows.length} system types · settings configurable · base type locked
                                </span>
                              </td>
                            </tr>
                            {rows.map(vt => <TR key={vt.id} vt={vt} />)}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-16 text-center text-muted-foreground text-sm">
                      No types match "{search}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <VoucherSheet
        open={sheetOpen} onOpenChange={setSheetOpen}
        editVt={editVt} onSave={handleSave}
        addRule={addRule} removeRule={removeRule} toggleRule={toggleRule}
      />

      <AlertDialog open={!!delTarget} onOpenChange={v => !v && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{delTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This custom voucher type will be permanently removed.
              {delTarget && delTarget.current_sequence > 1 && (
                <span className="block mt-1 text-destructive font-medium">
                  {delTarget.current_sequence - 1} voucher(s) have been posted with this type.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}

export default function VoucherTypesMasterPage() {
  return <VoucherTypesMasterPanel />;
}
