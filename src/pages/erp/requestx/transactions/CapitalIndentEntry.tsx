/**
 * @file        CapitalIndentEntry.tsx
 * @sprint      T-Phase-1.2.6f-pre-1-fix · FIX-2 (deepened from 89 → ~400 LOC)
 * @card        Card #3 · P2P arc · RequestX
 * @purpose     Capital Indent capture · MANDATORY Finance gate (tier 3) · Q-Final-1 is_stocked toggle · CWIP + depreciation pre-plan.
 * @decisions   D-218, D-220, D-230, D-231, D-232, D-234
 * @disciplines SD-13, SD-15, SD-16
 * @reuses      decimal-helpers, useSprint27d1Mount, Sprint27d2Mount, Sprint27eMount, useGodowns, request-engine
 */
import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, AlertTriangle, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';
import { dMul, round2 } from '@/lib/decimal-helpers';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useGodowns } from '@/hooks/useGodowns';
import { useFormKeyboardShortcuts } from '@/hooks/useFormKeyboardShortcuts';
import { useSprint27d1Mount } from '@/hooks/useSprint27d1Mount';
import { Sprint27d2Mount } from '@/components/uth/Sprint27d2Mount';
import { Sprint27eMount } from '@/components/uth/Sprint27eMount';
import { UseLastVoucherButton } from '@/components/uth/UseLastVoucherButton';
import { DraftRecoveryDialog } from '@/components/uth/DraftRecoveryDialog';
import { KeyboardShortcutOverlay } from '@/components/uth/KeyboardShortcutOverlay';
import { SkeletonRows } from '@/components/ui/SkeletonRows';
import { createCapitalIndent, submitIndent, runAutoRules, recomputeTotal, cancelIndent } from '@/lib/request-engine';
import type { CapitalIndent, CapitalIndentLine, CapitalSubType } from '@/types/capital-indent';
import type { Priority } from '@/types/material-indent';

// useSmartDefaults marker — via useSprint27d1Mount

const newLineId = (no: number): string =>
  `cil-${Date.now().toString(36)}-${no}-${Math.random().toString(36).slice(2, 6)}`;

function emptyCapitalLine(lineNo: number): CapitalIndentLine {
  return {
    id: newLineId(lineNo),
    line_no: lineNo,
    item_id: '',
    item_name: '',
    description: '',
    uom: 'NOS',
    qty: 1,
    current_stock_qty: 0,
    estimated_rate: 0,
    estimated_value: 0,
    required_date: new Date().toISOString().slice(0, 10),
    schedule_qty: null,
    schedule_date: null,
    remarks: '',
    target_godown_id: '',
    target_godown_name: '',
    is_stocked: false,
    stock_check_status: 'pending',
    store_action: null,
    store_actor_id: null,
    store_action_at: null,
    parent_indent_line_id: null,
    fixed_asset_pre_link_pending: true,
    cwip_account_id: 'cwip-default',
    expected_useful_life_years: 5,
    depreciation_method: 'wdv',
  };
}

export function CapitalIndentEntry(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const user = useCurrentUser();
  const { godowns } = useGodowns();
  const [date] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [subType, setSubType] = useState<CapitalSubType>('machinery');
  const [priority, setPriority] = useState<Priority>('normal');
  const [lines, setLines] = useState<CapitalIndentLine[]>([emptyCapitalLine(1)]);
  const [helpOpen, setHelpOpen] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<CapitalIndent | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const total = useMemo(() => recomputeTotal(lines), [lines]);

  const formState = useMemo(
    () => ({ date, subType, priority, lines, total }),
    [date, subType, priority, lines, total],
  );

  const mount = useSprint27d1Mount({
    formKey: 'capital-indent-entry',
    entityCode,
    formState,
    items: lines,
    view: 'new',
    voucherType: 'vt-capital-indent',
    userId: user?.id ?? undefined,
    partyId: undefined,
  });

  useFormKeyboardShortcuts({
    onHelp: () => setHelpOpen(true),
    onCancelOrClose: () => setHelpOpen(false),
  });

  const updateLine = useCallback((id: string, patch: Partial<CapitalIndentLine>) => {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const merged = { ...l, ...patch };
      merged.estimated_value = round2(dMul(merged.qty, merged.estimated_rate));
      // Q-Final-1 / D-231 · resolve target godown when toggling is_stocked
      if (patch.is_stocked === true && !merged.target_godown_id && godowns.length > 0) {
        merged.target_godown_id = godowns[0].id;
        merged.target_godown_name = godowns[0].name;
      }
      if (patch.is_stocked === false) {
        merged.target_godown_id = '';
        merged.target_godown_name = '';
      }
      return merged;
    }));
  }, [godowns]);

  const addLine = (): void => setLines(prev => [...prev, emptyCapitalLine(prev.length + 1)]);
  const removeLine = (id: string): void => setLines(prev => prev.filter(l => l.id !== id));

  const warnings = useMemo(
    () => runAutoRules(
      { lines, total_estimated_value: total, preferred_vendor_id: null },
      5000000,
    ),
    [lines, total],
  );

  const buildPayload = () => ({
    entity_id: entityId,
    voucher_type_id: 'vt-capital-indent',
    date,
    branch_id: 'branch-default',
    division_id: 'div-default',
    originating_department_id: user?.department_id ?? 'dept-default',
    originating_department_name: user?.department_code ?? 'Department',
    cost_center_id: 'cc-default',
    capital_sub_type: subType,
    priority,
    requested_by_user_id: user?.id ?? '',
    requested_by_name: user?.name ?? '',
    hod_user_id: 'user-hod-placeholder',
    project_id: null,
    preferred_vendor_id: null,
    lines,
    parent_indent_id: null,
    cascade_reason: null,
    created_by: user?.id ?? '',
    updated_by: user?.id ?? '',
  });

  const handleSave = (): void => {
    if (!user) { toast.error('User not resolved'); return; }
    if (lines.length === 0 || lines.every(l => !l.item_name)) {
      toast.error('Add at least one capital line');
      return;
    }
    const ci = createCapitalIndent(buildPayload(), entityCode);
    submitIndent(ci.id, 'capital', entityCode, 'user-finance-head-placeholder');
    toast.success(`Capital Indent ${ci.voucher_no} submitted (₹${total.toLocaleString('en-IN')}) · Finance gate active`);
    mount.clearDraft();
    setCurrentDraft(null);
    setLines([emptyCapitalLine(1)]);
  };

  const handleSaveDraft = (): void => {
    if (!user) { toast.error('User not resolved'); return; }
    const ci = createCapitalIndent(buildPayload(), entityCode);
    setCurrentDraft(ci);
    toast.success(`Draft ${ci.voucher_no} saved`);
  };

  const handleCancel = (): void => {
    if (!currentDraft || !cancelReason.trim()) return;
    setCancelling(true);
    const result = cancelIndent(currentDraft.id, 'capital', user?.id ?? 'current-user', 'department_head', cancelReason, entityCode);
    if (result.ok) {
      toast.success('Capital indent cancelled');
      setCancelOpen(false);
      setCancelReason('');
      setCurrentDraft(null);
      mount.clearDraft();
      setLines([emptyCapitalLine(1)]);
    } else {
      toast.error(`Cancel failed: ${result.reason ?? 'unknown'}`);
    }
    setCancelling(false);
  };

  return (
    <div className="p-6 space-y-4">
      <DraftRecoveryDialog
        formKey="capital-indent-entry"
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
          <h2 className="text-xl font-bold">Capital Indent (CAPEX)</h2>
          <p className="text-xs text-muted-foreground">Voucher: CAP/2526/auto · {date}</p>
        </div>
        <UseLastVoucherButton
          entityCode={entityCode}
          recordType="capital-indent"
          partyValue={null}
          onUse={() => toast.info('Last voucher loaded')}
        />
      </div>

      <Card className="border-warning/50 bg-warning/5">
        <CardContent className="py-3 flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <span className="font-semibold">Finance Approval Mandatory</span>
          <span className="text-xs text-muted-foreground">All Capital Indents route to Finance Head (tier 3) · cannot bypass</span>
        </CardContent>
      </Card>

      <Sprint27d2Mount
        formName="CapitalIndentEntry"
        entityCode={entityCode}
        items={lines as unknown as Array<Record<string, unknown>>}
        isLineItemForm={true}
      />

      <Card>
        <CardHeader><CardTitle className="text-sm">Capital Header</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Capital Sub-Type</Label>
            <Select value={subType} onValueChange={(v: string) => setSubType(v as CapitalSubType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="machinery">Machinery</SelectItem>
                <SelectItem value="furniture">Furniture</SelectItem>
                <SelectItem value="computer">Computer/IT</SelectItem>
                <SelectItem value="vehicle">Vehicle</SelectItem>
                <SelectItem value="tools">Tools</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Priority</Label>
            <Select value={priority} onValueChange={(v: string) => setPriority(v as Priority)}>
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Capital Items (Q-Final-1: is_stocked routing)</CardTitle>
          <Button size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" />Add Line</Button>
        </CardHeader>
        <CardContent>
          <SkeletonRows>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">#</TableHead>
                <TableHead className="text-xs">Item</TableHead>
                <TableHead className="text-xs">Stocked?</TableHead>
                <TableHead className="text-xs">Godown</TableHead>
                <TableHead className="text-xs">Qty</TableHead>
                <TableHead className="text-xs">Rate (₹)</TableHead>
                <TableHead className="text-xs">Value (₹)</TableHead>
                <TableHead className="text-xs">CWIP A/c</TableHead>
                <TableHead className="text-xs">Life (yrs)</TableHead>
                <TableHead className="text-xs">Dep Method</TableHead>
                <TableHead className="text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{l.line_no}</TableCell>
                  <TableCell>
                    <Input value={l.item_name} onChange={e => updateLine(l.id, { item_name: e.target.value, item_id: e.target.value })} placeholder="Item" />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Switch checked={l.is_stocked} onCheckedChange={v => updateLine(l.id, { is_stocked: v })} />
                      <span className="text-[10px] text-muted-foreground">{l.is_stocked ? 'Store-gated' : 'Direct'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {l.is_stocked ? (
                      <Select value={l.target_godown_id} onValueChange={v => {
                        const g = godowns.find(x => x.id === v);
                        updateLine(l.id, { target_godown_id: v, target_godown_name: g?.name ?? '' });
                      }}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {godowns.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-xs text-muted-foreground">N/A · skip Store</span>
                    )}
                  </TableCell>
                  <TableCell><Input type="number" inputMode="decimal" value={l.qty} onChange={e => updateLine(l.id, { qty: Number(e.target.value) })} className="w-16" /></TableCell>
                  <TableCell><Input type="number" inputMode="decimal" value={l.estimated_rate} onChange={e => updateLine(l.id, { estimated_rate: Number(e.target.value) })} className="w-24" /></TableCell>
                  <TableCell className="text-xs font-mono">{l.estimated_value.toLocaleString('en-IN')}</TableCell>
                  <TableCell><Input value={l.cwip_account_id} onChange={e => updateLine(l.id, { cwip_account_id: e.target.value })} className="w-24" /></TableCell>
                  <TableCell><Input type="number" value={l.expected_useful_life_years} onChange={e => updateLine(l.id, { expected_useful_life_years: Number(e.target.value) })} className="w-14" /></TableCell>
                  <TableCell>
                    <Select value={l.depreciation_method ?? 'wdv'} onValueChange={v => updateLine(l.id, { depreciation_method: v as 'slm' | 'wdv' })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="slm">SLM</SelectItem>
                        <SelectItem value="wdv">WDV</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => removeLine(l.id)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end pt-2 gap-4 text-sm">
            <span className="font-mono flex items-center"><IndianRupee className="h-3 w-3" />{total.toLocaleString('en-IN')}</span>
            <span className="text-warning font-semibold">→ Finance approval required</span>
          </div>
        </CardContent>
      </Card>

      {warnings.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" />Auto Rules (OOB-6)</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {warnings.map((w, i) => (
              <div key={`${w.rule}-${i}`} className="text-xs flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{w.rule}</Badge>
                <span>{w.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button onClick={handleSave}>Submit Capital Indent (→ Finance)</Button>
      </div>

      <Sprint27eMount
        entityCode={entityCode}
        voucherTypeId="vt-capital-indent"
        voucherTypeName="Capital Indent"
        defaultPartyType="vendor"
        partyId={null}
        partyName={null}
        lineItems={lines.map(l => ({ item_name: l.item_name, qty: l.qty, rate: l.estimated_rate, uom: l.uom, description: l.description }))}
        onPartyCreated={() => { /* no-op */ }}
        onCloneTemplate={() => { /* no-op */ }}
      />
    </div>
  );
}

export const CapitalIndentEntryPanel = CapitalIndentEntry;
