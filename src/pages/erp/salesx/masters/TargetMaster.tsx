/**
 * TargetMaster.tsx — Sales target CRUD (Sprint 4)
 * Storage: erp_sam_targets_{entityCode}
 * [JWT] GET/POST/PUT/DELETE /api/salesx/targets
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Save, Trash2, X, Lock } from 'lucide-react';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { comply360SAMKey } from '@/pages/erp/accounting/ComplianceSettingsAutomation';
import type { SAMConfig } from '@/pages/erp/accounting/ComplianceSettingsAutomation';
import { cn } from '@/lib/utils';
import { targetsKey, type SalesTarget } from './TargetMaster.types';

// Backward-compat re-exports — preserve every previous import path.
export type { SalesTarget };
export { targetsKey } from './TargetMaster.types';

interface Props { entityCode: string }

interface FormState {
  financial_year: string;
  target_type: 'company' | 'salesman' | 'agent';
  person_name: string;
  period: 'monthly' | 'quarterly' | 'annual';
  period_label: string;
  dimension: 'sales_value' | 'collection' | 'new_customers' | 'order_volume';
  target_value: string;
  stock_group_name: string;
  territory: string;
  is_active: boolean;
  editingId: string | null;
}

const BLANK: FormState = {
  financial_year: '2025-26',
  target_type: 'salesman',
  person_name: '',
  period: 'monthly',
  period_label: 'Apr-2025',
  dimension: 'sales_value',
  target_value: '',
  stock_group_name: '',
  territory: '',
  is_active: true,
  editingId: null,
};

function loadCfg(entityCode: string): SAMConfig | null {
  try {
    // [JWT] GET /api/compliance/comply360/sam/:entityCode
    return JSON.parse(localStorage.getItem(comply360SAMKey(entityCode)) || 'null');
  } catch { return null; }
}

function loadTargets(entityCode: string): SalesTarget[] {
  try {
    // [JWT] GET /api/salesx/targets?entityCode={entityCode}
    return JSON.parse(localStorage.getItem(targetsKey(entityCode)) || '[]');
  } catch { return []; }
}

function saveTargets(entityCode: string, list: SalesTarget[]): void {
  // [JWT] PUT /api/salesx/targets
  localStorage.setItem(targetsKey(entityCode), JSON.stringify(list));
}

export function TargetMasterPanel({ entityCode }: Props) {
  const cfg = useMemo(() => loadCfg(entityCode), [entityCode]);
  const [targets, setTargets] = useState<SalesTarget[]>(() => loadTargets(entityCode));
  const [form, setForm] = useState<FormState>(BLANK);

  useEffect(() => { setTargets(loadTargets(entityCode)); }, [entityCode]);

  const handleSave = useCallback(() => {
    const value = Number(form.target_value);
    if (!form.period_label.trim()) { toast.error('Period label is required'); return; }
    if (!value || value <= 0) { toast.error('Target value must be positive'); return; }
    if (form.target_type !== 'company' && !form.person_name.trim()) {
      toast.error('Person name required for salesman/agent target'); return;
    }
    const now = new Date().toISOString();
    const list = loadTargets(entityCode);
    const next: SalesTarget = {
      id: form.editingId ?? `tgt-${Date.now()}`,
      entity_id: entityCode,
      financial_year: form.financial_year.trim(),
      target_type: form.target_type,
      person_id: form.target_type === 'company' ? null : form.person_name.trim().toLowerCase().replace(/\s+/g, '-'),
      person_name: form.target_type === 'company' ? null : form.person_name.trim(),
      period: form.period,
      period_label: form.period_label.trim(),
      dimension: form.dimension,
      target_value: value,
      stock_group_id: form.stock_group_name.trim() ? form.stock_group_name.trim().toLowerCase() : null,
      stock_group_name: form.stock_group_name.trim() || null,
      territory: form.territory.trim() || null,
      is_active: form.is_active,
      created_at: form.editingId ? (list.find(t => t.id === form.editingId)?.created_at ?? now) : now,
      updated_at: now,
    };
    const updated = form.editingId
      ? list.map(t => t.id === form.editingId ? next : t)
      : [...list, next];
    saveTargets(entityCode, updated);
    setTargets(updated);
    toast.success(form.editingId ? 'Target updated' : 'Target added');
    setForm(BLANK);
  }, [form, entityCode]);

  const isFormActive = !!(form.target_value || form.editingId);
  useCtrlS(isFormActive ? handleSave : () => {});

  const handleEdit = (t: SalesTarget) => {
    setForm({
      financial_year: t.financial_year,
      target_type: t.target_type,
      person_name: t.person_name ?? '',
      period: t.period,
      period_label: t.period_label,
      dimension: t.dimension,
      target_value: String(t.target_value),
      stock_group_name: t.stock_group_name ?? '',
      territory: t.territory ?? '',
      is_active: t.is_active,
      editingId: t.id,
    });
  };

  const handleDelete = (id: string) => {
    const updated = loadTargets(entityCode).filter(t => t.id !== id);
    saveTargets(entityCode, updated);
    setTargets(updated);
    toast.success('Target removed');
  };

  if (!cfg?.enableSLSMTarget && !cfg?.enableCompanyTarget) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <Lock className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="font-semibold">Targets are disabled</p>
          <p className="text-sm text-muted-foreground">
            Enable SLSM Target or Company Target in Comply360 SAM settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

  return (
    <div data-keyboard-form className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Sales Targets</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setForm(BLANK)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent>
          {targets.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No targets defined yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">FY</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Person</TableHead>
                  <TableHead className="text-xs">Period</TableHead>
                  <TableHead className="text-xs">Dimension</TableHead>
                  <TableHead className="text-xs text-right">Target ₹</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {targets.map(t => (
                  <TableRow key={t.id} className="cursor-pointer" onClick={() => handleEdit(t)}>
                    <TableCell className="text-xs font-mono">{t.financial_year}</TableCell>
                    <TableCell className="text-xs capitalize">{t.target_type}</TableCell>
                    <TableCell className="text-xs">{t.person_name ?? '— Company —'}</TableCell>
                    <TableCell className="text-xs">{t.period_label}</TableCell>
                    <TableCell className="text-xs capitalize">{t.dimension.replace(/_/g, ' ')}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{inrFmt.format(t.target_value)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        'text-[10px]',
                        t.is_active
                          ? 'bg-success/15 text-success border-success/30'
                          : 'bg-muted text-muted-foreground border-border',
                      )}>
                        {t.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{form.editingId ? 'Edit Target' : 'New Target'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Financial Year</Label>
            <Input
              value={form.financial_year}
              onChange={e => setForm(p => ({ ...p, financial_year: e.target.value }))}
              onKeyDown={onEnterNext}
              placeholder="2025-26" className="h-8 text-xs font-mono"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Target Type</Label>
            <Select value={form.target_type} onValueChange={v => setForm(p => ({ ...p, target_type: v as FormState['target_type'] }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {cfg?.enableCompanyTarget && <SelectItem value="company">Company</SelectItem>}
                {cfg?.enableSLSMTarget && <SelectItem value="salesman">Salesman</SelectItem>}
                {cfg?.enableSLSMTarget && <SelectItem value="agent">Agent</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          {form.target_type !== 'company' && (
            <div>
              <Label className="text-xs text-muted-foreground">Person Name *</Label>
              <Input
                value={form.person_name}
                onChange={e => setForm(p => ({ ...p, person_name: e.target.value }))}
                onKeyDown={onEnterNext}
                placeholder="Salesman / Agent" className="h-8 text-xs"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Period</Label>
              <Select value={form.period} onValueChange={v => setForm(p => ({ ...p, period: v as FormState['period'] }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Period Label</Label>
              <Input
                value={form.period_label}
                onChange={e => setForm(p => ({ ...p, period_label: e.target.value }))}
                onKeyDown={onEnterNext}
                placeholder="Apr-2025 / Q1 / 2025-26" className="h-8 text-xs"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Dimension</Label>
            <Select value={form.dimension} onValueChange={v => setForm(p => ({ ...p, dimension: v as FormState['dimension'] }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sales_value">Sales Value</SelectItem>
                <SelectItem value="collection">Collection</SelectItem>
                <SelectItem value="new_customers">New Customers</SelectItem>
                <SelectItem value="order_volume">Order Volume</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Target Value *</Label>
            <Input
              type="number"
              value={form.target_value}
              onChange={e => setForm(p => ({ ...p, target_value: e.target.value }))}
              onKeyDown={onEnterNext}
              className="h-8 text-xs font-mono"
            />
          </div>
          {cfg?.slsmTargetByStockGroup && (
            <div>
              <Label className="text-xs text-muted-foreground">Stock Group</Label>
              <Input
                value={form.stock_group_name}
                onChange={e => setForm(p => ({ ...p, stock_group_name: e.target.value }))}
                onKeyDown={onEnterNext}
                className="h-8 text-xs"
              />
            </div>
          )}
          {cfg?.slsmTargetByTerritory && (
            <div>
              <Label className="text-xs text-muted-foreground">Territory</Label>
              <Input
                value={form.territory}
                onChange={e => setForm(p => ({ ...p, territory: e.target.value }))}
                onKeyDown={onEnterNext}
                className="h-8 text-xs"
              />
            </div>
          )}
          <div className="flex items-center justify-between">
            <Label className="text-xs">Active</Label>
            <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button data-primary size="sm" onClick={handleSave} className="bg-orange-500 hover:bg-orange-600">
              <Save className="h-3.5 w-3.5 mr-1" /> Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setForm(BLANK)}>
              <X className="h-3.5 w-3.5 mr-1" /> Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TargetMaster(props: Props) { return <TargetMasterPanel {...props} />; }
