/**
 * VoucherTypesMaster.tsx — VT-1
 * Design: Behaviour Matrix — two-zone split layout
 * Left 58%: card grid grouped by family, each card shows behavior signature
 * Right 42%: deep-panel opens on card click, 5-section accordion, no navigation
 * Embedded Behaviour Rules: 7 rule types (auto_post, validation, settlement,
 *   tax_trigger, approval_gate, auto_reversal, narration_template)
 */
import { useState, useMemo } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Lock, Plus, ChevronDown, ChevronRight, X,
  Landmark, Package, BookOpen, Zap, ShieldCheck,
  RotateCcw, MessageSquare, CheckCircle2, AlertTriangle,
  ArrowLeftRight, Cpu, Users, Hash, Trash2, Settings2,
  TrendingUp, FileText, Eye, EyeOff, RefreshCw,
  GitBranch, Clock,
} from 'lucide-react';
import { useVoucherTypes } from '@/hooks/useVoucherTypes';
import type {
  VoucherType, VoucherFamily, BehaviourRule, BehaviourRuleType,
  NumberingMethod,
} from '@/types/voucher-type';
import {
  FAMILY_COLORS, NO_LINE_NARRATION_TYPES,
  ALWAYS_OPTIONAL_TYPES, SALES_ONLY_FIELDS,
} from '@/types/voucher-type';

// ── Constants ───────────────────────────────────────────────────────────────

const FAMILIES: VoucherFamily[] = ['Accounting', 'Non-Accounting', 'Inventory', 'Order', 'Job Work', 'Payroll'];

const FAMILY_ICONS: Record<VoucherFamily, typeof Landmark> = {
  Accounting:     Landmark,
  'Non-Accounting': BookOpen,
  Inventory:      Package,
  Order:          FileText,
  'Job Work':     GitBranch,
  Payroll:        Users,
};

const RULE_META: Record<BehaviourRuleType, { icon: typeof Zap; label: string; color: string }> = {
  auto_post:         { icon: Zap,          label: 'Auto-Post Entry',   color: 'text-amber-500'  },
  validation:        { icon: ShieldCheck,   label: 'Validation',        color: 'text-blue-500'   },
  settlement:        { icon: ArrowLeftRight,label: 'Settlement',        color: 'text-teal-500'   },
  tax_trigger:       { icon: Cpu,           label: 'Tax Trigger',       color: 'text-purple-500' },
  approval_gate:     { icon: CheckCircle2,  label: 'Approval Gate',     color: 'text-green-500'  },
  auto_reversal:     { icon: RotateCcw,     label: 'Auto-Reversal',     color: 'text-rose-500'   },
  narration_template:{ icon: MessageSquare, label: 'Narration Template',color: 'text-slate-500'  },
};

const NUMBERING_LABELS: Record<NumberingMethod, string> = {
  automatic:                 'Automatic',
  automatic_manual_override: 'Auto (Override)',
  manual:                    'Manual',
  multi_user_auto:           'Multi-user Auto',
  none:                      'None',
};

// ── Behaviour Signature Badges ───────────────────────────────────────────────

function BehaviourBadge({ on, icon: Icon, tip }: { on: boolean; icon: typeof Landmark; tip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn(
          'inline-flex items-center justify-center w-6 h-6 rounded transition-all',
          on
            ? 'bg-foreground/10 text-foreground'
            : 'text-muted-foreground/30'
        )}>
          <Icon className="h-3 w-3" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-[11px]">{tip}{on ? '' : ' (off)'}</TooltipContent>
    </Tooltip>
  );
}

// ── Single Voucher Type Card ─────────────────────────────────────────────────

function VTCard({
  vt, isSelected, onClick,
}: { vt: VoucherType; isSelected: boolean; onClick: () => void }) {
  const fc = FAMILY_COLORS[vt.family];

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative text-left w-full rounded-xl border-l-[3px] border border-border/60',
        'p-3 transition-all duration-200',
        'hover:border-primary/40 hover:shadow-md hover:shadow-primary/5',
        fc.border,
        isSelected
          ? 'bg-primary/5 border-primary/40 shadow-md shadow-primary/5 ring-1 ring-primary/20'
          : 'bg-card/80 hover:bg-accent/20',
      )}
    >
      {/* Lock for system types */}
      {vt.is_system && (
        <Lock className="absolute top-2.5 right-2.5 h-2.5 w-2.5 text-muted-foreground/30" />
      )}

      {/* Row 1: status dot + abbreviation chip + name */}
      <div className="flex items-center gap-2 mb-2 pr-4">
        <span className={cn(
          'w-1.5 h-1.5 rounded-full shrink-0 transition-colors',
          vt.is_active ? fc.dot : 'bg-muted-foreground/30'
        )} />
        <span className={cn(
          'font-mono text-[10px] font-bold px-1.5 py-0.5 rounded',
          fc.bg, fc.text
        )}>
          {vt.abbreviation}
        </span>
        <span className="text-[12px] font-semibold text-foreground truncate leading-tight">
          {vt.name}
        </span>
      </div>

      {/* Row 2: behaviour signature */}
      <div className="flex items-center gap-0.5 mb-2">
        <BehaviourBadge on={vt.accounting_impact} icon={Landmark} tip="Accounting impact" />
        <BehaviourBadge on={vt.inventory_impact}  icon={Package}   tip="Inventory impact" />
        <BehaviourBadge on={vt.is_optional_default} icon={Eye}     tip="Optional by default" />
        <BehaviourBadge on={vt.use_effective_date}  icon={Clock}   tip="Effective date" />
        <BehaviourBadge on={vt.allow_narration}     icon={MessageSquare} tip="Narration" />
        <span className="flex-1" />
        {vt.numbering_method === 'automatic' || vt.numbering_method === 'automatic_manual_override' ? (
          <span className="text-[9px] font-mono text-muted-foreground/60">
            {vt.numbering_prefix}{String(vt.current_sequence).padStart(vt.numbering_width, '0')}
          </span>
        ) : null}
      </div>

      {/* Row 3: rules count + activation */}
      <div className="flex items-center gap-1.5">
        {vt.behaviour_rules.length > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Zap className="h-2.5 w-2.5 text-amber-500" />
            {vt.behaviour_rules.filter(r => r.is_active).length} rule{vt.behaviour_rules.filter(r => r.is_active).length !== 1 ? 's' : ''}
          </span>
        )}
        <span className="flex-1" />
        <span className={cn(
          'text-[9px] font-medium px-1.5 py-0.5 rounded-full',
          vt.activation_type === 'active'       ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
          vt.activation_type === 'on_use'        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'      :
                                                   'bg-muted text-muted-foreground'
        )}>
          {vt.activation_type === 'active' ? 'Active' : vt.activation_type === 'on_use' ? 'On-use' : 'Feature'}
        </span>
      </div>
    </button>
  );
}

// ── Family Section ───────────────────────────────────────────────────────────

function FamilySection({
  family, types, selectedId, onSelect,
}: { family: VoucherFamily; types: VoucherType[]; selectedId: string | null; onSelect: (vt: VoucherType) => void }) {
  const [open, setOpen] = useState(true);
  const fc = FAMILY_COLORS[family];
  const Icon = FAMILY_ICONS[family];
  const active = types.filter(t => t.is_active).length;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 px-1 group mb-1">
        <div className={cn('flex items-center justify-center w-5 h-5 rounded', fc.bg)}>
          <Icon className={cn('h-3 w-3', fc.text)} />
        </div>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{family}</span>
        <span className={cn('text-[10px] font-mono ml-1', fc.text)}>{active}/{types.length}</span>
        <span className="flex-1" />
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground/50 transition-transform', !open && '-rotate-90')} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {types.map(vt => (
            <VTCard
              key={vt.id}
              vt={vt}
              isSelected={selectedId === vt.id}
              onClick={() => onSelect(vt)}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── Rule Card (inside deep panel) ────────────────────────────────────────────

function RuleCard({
  rule, onToggle, onRemove,
}: { rule: BehaviourRule; onToggle: () => void; onRemove: () => void }) {
  const meta = RULE_META[rule.rule_type];
  const Icon = meta.icon;

  return (
    <div className={cn(
      'rounded-lg border border-border/60 p-3 transition-all',
      rule.is_active ? 'bg-card' : 'bg-muted/30 opacity-60'
    )}>
      <div className="flex items-start gap-2">
        <div className={cn('flex items-center justify-center w-6 h-6 rounded shrink-0 mt-0.5',
          rule.is_active ? 'bg-foreground/8' : 'bg-muted'
        )}>
          <Icon className={cn('h-3 w-3', rule.is_active ? meta.color : 'text-muted-foreground')} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-foreground truncate">{rule.label}</span>
            <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium',
              'bg-muted text-muted-foreground'
            )}>
              {meta.label}
            </span>
          </div>
          {rule.rule_type === 'auto_post' && (
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
              Dr {(rule.config as any).debit_ledger_name} / Cr {(rule.config as any).credit_ledger_name}
            </p>
          )}
          {rule.rule_type === 'settlement' && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {(rule.config as any).method?.toUpperCase()} · {(rule.config as any).settle_against}
            </p>
          )}
          {rule.rule_type === 'auto_reversal' && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Reversal on: {(rule.config as any).reversal_on?.replace(/_/g, ' ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onToggle}
            className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            {rule.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </button>
          <button
            onClick={onRemove}
            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Section Accordion ────────────────────────────────────────────────────────

function PanelSection({
  title, icon: Icon, children, defaultOpen = true,
}: { title: string; icon: typeof Landmark; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-2.5 border-b border-border/50 group">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider flex-1 text-left">{title}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground/50 transition-transform', !open && '-rotate-90')} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pt-3 pb-1 space-y-3">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground font-medium">{label}</Label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground/60">{hint}</p>}
    </div>
  );
}

function Toggle({
  label, checked, onCheckedChange, disabled, hint,
}: { label: string; checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean; hint?: string }) {
  return (
    <div className={cn('flex items-center justify-between py-1.5', disabled && 'opacity-50')}>
      <div>
        <p className="text-[12px] text-foreground">{label}</p>
        {hint && <p className="text-[10px] text-muted-foreground/60">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} className="scale-75" />
    </div>
  );
}

// ── Deep Panel ───────────────────────────────────────────────────────────────

function DeepPanel({
  vt, onClose,
  updateType, addRule, removeRule, toggleRule,
}: {
  vt: VoucherType;
  onClose: () => void;
  updateType: (id: string, patch: Partial<VoucherType>) => void;
  addRule: (id: string, rule: Omit<BehaviourRule, 'id'>) => void;
  removeRule: (id: string, ruleId: string) => void;
  toggleRule: (id: string, ruleId: string) => void;
}) {
  const fc = FAMILY_COLORS[vt.family];
  const isSalesOnly = SALES_ONLY_FIELDS.includes(vt.base_voucher_type);
  const lineNarDisabled = NO_LINE_NARRATION_TYPES.includes(vt.base_voucher_type);
  const alwaysOptional = ALWAYS_OPTIONAL_TYPES.includes(vt.base_voucher_type);
  const showNumberSeries = vt.numbering_method === 'automatic' || vt.numbering_method === 'automatic_manual_override';

  const upd = (patch: Partial<VoucherType>) => updateType(vt.id, patch);

  const nextPreview = showNumberSeries
    ? `${vt.numbering_prefix}${String(vt.current_sequence).padStart(vt.numbering_width, '0')}`
    : '—';

  const addNewRule = (ruleType: BehaviourRuleType) => {
    const meta = RULE_META[ruleType];
    const configs: Record<BehaviourRuleType, any> = {
      auto_post:          { debit_ledger_code: '', debit_ledger_name: 'Select ledger', credit_ledger_code: '', credit_ledger_name: 'Select ledger', amount_mode: 'full' },
      validation:         { require_party: true, require_narration: false, block_future_date: false, require_cost_centre: false },
      settlement:         { auto_settle: true, settle_against: 'invoices', method: 'fifo', show_bill_by_bill: true },
      tax_trigger:        { apply_gst: true, tax_type: 'auto_detect', tds_applicable: false, tcs_applicable: false },
      approval_gate:      { requires_approval: true, threshold_amount: 100000, approver_role: 'Manager' },
      auto_reversal:      { reversal_on: 'period_start', reversal_narration: 'Auto-reversal of {original_voucher_no}' },
      narration_template: { template: 'Being {transaction_type} of {party_name} against {reference}', variables: ['transaction_type', 'party_name', 'reference'] },
    };
    addRule(vt.id, {
      rule_type: ruleType,
      label: meta.label,
      is_active: true,
      sequence: vt.behaviour_rules.length + 1,
      config: configs[ruleType],
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Panel header */}
      <div className={cn('flex items-center gap-3 px-5 py-4 border-b border-border/50', fc.bg)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={cn('font-mono text-[11px] font-bold px-2 py-0.5 rounded', fc.bg, fc.text, 'border border-current/20')}>
              {vt.abbreviation}
            </span>
            <span className="text-[14px] font-semibold text-foreground truncate">{vt.name}</span>
            {vt.is_system && <Lock className="h-3 w-3 text-muted-foreground/50 shrink-0" />}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Base: {vt.base_voucher_type} · {vt.family}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">Active</span>
            <Switch
              checked={vt.is_active}
              onCheckedChange={() => toggleActive(vt.id)}
              className="scale-75"
            />
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1">

        {/* SECTION 1: IDENTITY */}
        <PanelSection title="Identity" icon={Hash}>
          <Field label="Name" hint={vt.is_system ? 'System types: name can be changed' : undefined}>
            <Input
              value={vt.name}
              onChange={e => upd({ name: e.target.value })}
              className="h-8 text-xs"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Abbreviation">
              <Input
                value={vt.abbreviation}
                maxLength={6}
                onChange={e => upd({ abbreviation: e.target.value.toUpperCase() })}
                className="h-8 text-xs font-mono"
              />
            </Field>
            <Field label="Base Type">
              <div className="h-8 flex items-center px-3 rounded-md border border-border bg-muted/50 text-xs text-muted-foreground gap-1.5">
                <Lock className="h-3 w-3" />
                {vt.base_voucher_type}
              </div>
            </Field>
          </div>
        </PanelSection>

        {/* SECTION 2: BEHAVIOUR */}
        <PanelSection title="Behaviour Flags" icon={Settings2}>
          <div className="grid grid-cols-1 divide-y divide-border/40">
            <Toggle label="Accounting Impact" checked={vt.accounting_impact}
              onCheckedChange={v => upd({ accounting_impact: v })} disabled={vt.is_system}
              hint="Posts to General Ledger" />
            <Toggle label="Inventory Impact" checked={vt.inventory_impact}
              onCheckedChange={v => upd({ inventory_impact: v })} disabled={vt.is_system}
              hint="Moves stock balances" />
            <Toggle label="Optional by Default"
              checked={vt.is_optional_default}
              onCheckedChange={v => upd({ is_optional_default: v })}
              disabled={alwaysOptional}
              hint={alwaysOptional ? 'Always optional for this type' : 'Voucher not posted until regularised'} />
            <Toggle label="Use Effective Date" checked={vt.use_effective_date}
              onCheckedChange={v => upd({ use_effective_date: v })}
              hint="Ageing based on effective date, not voucher date" />
            <Toggle label="Allow Zero Value" checked={vt.allow_zero_value}
              onCheckedChange={v => upd({ allow_zero_value: v })}
              hint="Permits no-value stock movement (samples, returns)" />
            <Toggle label="Allow Narration" checked={vt.allow_narration}
              onCheckedChange={v => upd({ allow_narration: v })}
              hint="Common narration at voucher level" />
            <Toggle label="Allow Line Narration"
              checked={vt.allow_line_narration}
              onCheckedChange={v => upd({ allow_line_narration: v })}
              disabled={lineNarDisabled}
              hint={lineNarDisabled ? 'Not available for this voucher type (Tally spec)' : 'Narration per ledger/item line'} />
          </div>
        </PanelSection>

        {/* SECTION 3: NUMBERING */}
        <PanelSection title="Numbering" icon={Hash} defaultOpen={false}>
          <Field label="Method">
            <Select value={vt.numbering_method} onValueChange={v => upd({ numbering_method: v as typeof vt.numbering_method })}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(NUMBERING_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {showNumberSeries && (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Prefix">
                <Input
                  value={vt.numbering_prefix}
                  placeholder="SI-"
                  onChange={e => upd({ numbering_prefix: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </Field>
              <Field label="Width (digits)">
                <Input
                  type="number" min={2} max={8}
                  value={vt.numbering_width}
                  onChange={e => upd({ numbering_width: Number(e.target.value) })}
                  className="h-8 text-xs font-mono"
                />
              </Field>
            </div>
          )}
          {showNumberSeries && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border/40">
              <RefreshCw className="h-3 w-3 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">Next number preview:</span>
              <span className="text-[11px] font-mono font-bold text-foreground">{nextPreview}</span>
            </div>
          )}
        </PanelSection>

        {/* SECTION 4: BEHAVIOUR RULES ← The unique section */}
        <PanelSection title="Behaviour Rules" icon={Zap}>
          {vt.behaviour_rules.length === 0 ? (
            <div className="text-center py-4">
              <Zap className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-[11px] text-muted-foreground">No rules yet — this type has no embedded logic.</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">Add rules to automate posting, validation, tax, or approval.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {vt.behaviour_rules.map(rule => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  onToggle={() => toggleRule(vt.id, rule.id)}
                  onRemove={() => removeRule(vt.id, rule.id)}
                />
              ))}
            </div>
          )}
          <Separator className="my-2" />
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-2">Add Rule</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.entries(RULE_META) as [BehaviourRuleType, typeof RULE_META[BehaviourRuleType]][]).map(([ruleType, meta]) => {
                const Icon = meta.icon;
                return (
                  <button
                    key={ruleType}
                    onClick={() => addNewRule(ruleType)}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                  >
                    <Icon className={cn('h-3 w-3 shrink-0', meta.color)} />
                    <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors leading-tight">
                      {meta.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </PanelSection>

        {/* SECTION 5: PRINT & DECLARATION */}
        <PanelSection title="Print & Declaration" icon={FileText} defaultOpen={false}>
          <div className="divide-y divide-border/40">
            <Toggle label="Print after Saving" checked={vt.print_after_save}
              onCheckedChange={v => upd({ print_after_save: v })} />
            {isSalesOnly && (
              <>
                <Toggle label="Use for POS Invoicing" checked={vt.use_for_pos}
                  onCheckedChange={v => upd({ use_for_pos: v })}
                  hint="Available for Sales type only" />
                <div className="pt-2 pb-1">
                  <Field label="Default Print Title">
                    <Input value={vt.print_title} onChange={e => upd({ print_title: e.target.value })}
                      className="h-8 text-xs" placeholder="Sales Invoice" />
                  </Field>
                </div>
              </>
            )}
          </div>
          <Field label="Default Jurisdiction">
            <Input value={vt.default_jurisdiction}
              onChange={e => upd({ default_jurisdiction: e.target.value })}
              className="h-8 text-xs" placeholder="e.g. Subject to Maharashtra jurisdiction" />
          </Field>
          <Field label="Declaration Text" hint="Printed at bottom of voucher">
            <Textarea
              value={vt.declaration_text}
              onChange={e => upd({ declaration_text: e.target.value })}
              rows={2}
              className="text-xs resize-none"
              placeholder="We declare that this invoice shows the actual price..."
            />
          </Field>
        </PanelSection>

      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function VoucherTypesMasterPanel() {
  const { types, stats, updateType, createCustomType, toggleActive, addRule, removeRule, toggleRule } = useVoucherTypes();
  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState<VoucherFamily | 'all'>('all');
  const [selected, setSelected] = useState<VoucherType | null>(null);

  const filteredByFamily = useMemo(() =>
    types.filter(t => {
      const q = search.toLowerCase();
      const matchSearch = !q || t.name.toLowerCase().includes(q) || t.abbreviation.toLowerCase().includes(q) || t.base_voucher_type.toLowerCase().includes(q);
      const matchFamily = familyFilter === 'all' || t.family === familyFilter;
      return matchSearch && matchFamily;
    }), [types, search, familyFilter]
  );

  const byFamily = useMemo(() =>
    FAMILIES.reduce<Record<VoucherFamily, VoucherType[]>>((acc, f) => {
      acc[f] = filteredByFamily.filter(t => t.family === f);
      return acc;
    }, {} as Record<VoucherFamily, VoucherType[]>),
    [filteredByFamily]
  );

  const handleSelect = (vt: VoucherType) => {
    setSelected(prev => prev?.id === vt.id ? null : vt);
  };

  // Keep selected vt in sync with latest data
  const selectedVT = selected ? types.find(t => t.id === selected.id) ?? null : null;

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background flex flex-col">
        <ERPHeader />
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ── Command strip ───────────────────────────────────────────── */}
          <div className="border-b border-border/50 bg-card/60 backdrop-blur-sm px-6 py-3.5">
            <div className="flex items-center gap-4 max-w-[1600px] mx-auto">
              <div>
                <h1 className="text-[15px] font-semibold text-foreground tracking-tight">
                  Voucher Types
                </h1>
                <p className="text-[11px] text-muted-foreground">
                  {stats.active} active · {stats.total} total · {stats.withRules} with embedded rules
                </p>
              </div>

              <div className="flex items-center gap-2 flex-1">
                <div className="relative w-52">
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search types…"
                    className="w-full h-8 pl-3 pr-3 text-xs rounded-lg border border-border/60 bg-muted/30 focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/50"
                  />
                </div>
                <div className="flex items-center gap-1 p-0.5 rounded-lg border border-border/50 bg-muted/20">
                  <button
                    onClick={() => setFamilyFilter('all')}
                    className={cn('px-2.5 py-1 text-[10px] font-medium rounded-md transition-all',
                      familyFilter === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >All</button>
                  {FAMILIES.map(f => {
                    const fc = FAMILY_COLORS[f];
                    return (
                      <button key={f}
                        onClick={() => setFamilyFilter(f)}
                        className={cn('px-2.5 py-1 text-[10px] font-medium rounded-md transition-all',
                          familyFilter === f ? cn('bg-background text-foreground shadow-sm') : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <span className={cn('inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle', fc.dot)} />
                        {f}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5"
                onClick={() => {
                  toast.info('Custom type creation — use existing type as base');
                }}>
                <Plus className="h-3.5 w-3.5" />
                Add Custom
              </Button>
            </div>
          </div>

          {/* ── Split body ───────────────────────────────────────────────── */}
          <div className="flex-1 flex overflow-hidden max-w-[1600px] mx-auto w-full">

            {/* Left: Behaviour Matrix */}
            <div className={cn(
              'overflow-y-auto px-5 py-4 transition-all duration-300',
              selectedVT ? 'w-[58%]' : 'w-full'
            )}>
              {FAMILIES.map(family => {
                const familyTypes = byFamily[family];
                if (!familyTypes || familyTypes.length === 0) return null;
                return (
                  <FamilySection
                    key={family}
                    family={family}
                    types={familyTypes}
                    selectedId={selectedVT?.id ?? null}
                    onSelect={handleSelect}
                  />
                );
              })}

              {filteredByFamily.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <TrendingUp className="h-10 w-10 text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">No types match "{search}"</p>
                </div>
              )}
            </div>

            {/* Right: Deep Panel */}
            {selectedVT && (
              <div className="w-[42%] border-l border-border/50 bg-card/40 flex flex-col overflow-hidden animate-fade-in">
                <DeepPanel
                  vt={selectedVT}
                  onClose={() => setSelected(null)}
                  updateType={updateType}
                  addRule={addRule}
                  removeRule={removeRule}
                  toggleRule={toggleRule}
                  toggleActive={toggleActive}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}

// Default export wrapper (matches ERP page pattern)
export default function VoucherTypesMasterPage() {
  return <VoucherTypesMasterPanel />;
}
