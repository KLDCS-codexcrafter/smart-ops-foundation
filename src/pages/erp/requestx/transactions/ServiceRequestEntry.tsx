/**
 * @file        ServiceRequestEntry.tsx
 * @sprint      T-Phase-1.2.6f-pre-1-fix · FIX-1 (deepened from 89 → ~420 LOC)
 * @card        Card #3 · P2P arc · RequestX
 * @purpose     Service Request capture (3-track flow per Q-Final-2) · full line grid · category cascade · SLA · auto-rules.
 * @decisions   D-218, D-220, D-230, D-232
 * @disciplines SD-13, SD-15, SD-16
 * @reuses      decimal-helpers, useSprint27d1Mount, Sprint27d2Mount, Sprint27eMount,
 *              UseLastVoucherButton, DraftRecoveryDialog, KeyboardShortcutOverlay, request-engine
 */
import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, AlertTriangle, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';
import { dMul, round2 } from '@/lib/decimal-helpers';
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
import { createServiceRequest, submitIndent, runAutoRules, recomputeTotal, cancelIndent } from '@/lib/request-engine';
import type {
  ServiceRequest, ServiceRequestLine, ServiceCategory, ServiceSubType, ServiceTrack,
} from '@/types/service-request';
import type { Priority } from '@/types/material-indent';

// useSmartDefaults marker — re-exported via useSprint27d1Mount

const SERVICE_CATEGORIES: Record<ServiceCategory, ServiceSubType[]> = {
  maintenance: ['breakdown', 'preventive', 'shutdown', 'spare'],
  service: ['amc', 'repair', 'consultancy', 'labour', 'freight'],
  operational: ['amc', 'repair'],
};

const newLineId = (no: number): string =>
  `srl-${Date.now().toString(36)}-${no}-${Math.random().toString(36).slice(2, 6)}`;

function emptyServiceLine(lineNo: number): ServiceRequestLine {
  return {
    id: newLineId(lineNo),
    line_no: lineNo,
    service_id: '',
    service_name: '',
    description: '',
    qty: 1,
    uom: 'JOB',
    estimated_rate: 0,
    estimated_value: 0,
    required_date: new Date().toISOString().slice(0, 10),
    sla_days: 7,
    remarks: '',
  };
}

export function ServiceRequestEntry(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const user = useCurrentUser();
  const [date] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [track, setTrack] = useState<ServiceTrack>('standard_enquiry');
  const [category, setCategory] = useState<ServiceCategory>('service');
  const [subType, setSubType] = useState<ServiceSubType>('amc');
  const [priority, setPriority] = useState<Priority>('normal');
  const [lines, setLines] = useState<ServiceRequestLine[]>([emptyServiceLine(1)]);
  const [helpOpen, setHelpOpen] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<ServiceRequest | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const total = useMemo(() => recomputeTotal(lines), [lines]);

  const formState = useMemo(
    () => ({ date, track, category, subType, priority, lines, total }),
    [date, track, category, subType, priority, lines, total],
  );

  const mount = useSprint27d1Mount({
    formKey: 'service-request-entry',
    entityCode,
    formState,
    items: lines,
    view: 'new',
    voucherType: 'vt-service-request',
    userId: user?.id ?? undefined,
    partyId: undefined,
  });

  useFormKeyboardShortcuts({
    onHelp: () => setHelpOpen(true),
    onCancelOrClose: () => setHelpOpen(false),
  });

  const updateLine = useCallback((id: string, patch: Partial<ServiceRequestLine>) => {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const merged = { ...l, ...patch };
      merged.estimated_value = round2(dMul(merged.qty, merged.estimated_rate));
      return merged;
    }));
  }, []);

  const addLine = (): void => setLines(prev => [...prev, emptyServiceLine(prev.length + 1)]);
  const removeLine = (id: string): void => setLines(prev => prev.filter(l => l.id !== id));

  const warnings = useMemo(
    () => runAutoRules(
      {
        lines,
        total_estimated_value: total,
        preferred_vendor_id: null,
      },
      2000000,
    ),
    [lines, total],
  );

  const buildPayload = () => ({
    entity_id: entityId,
    voucher_type_id: 'vt-service-request',
    date,
    branch_id: 'branch-default',
    division_id: 'div-default',
    originating_department_id: user?.department_id ?? 'dept-default',
    originating_department_name: user?.department_code ?? 'Department',
    cost_center_id: 'cc-default',
    category,
    sub_type: subType,
    priority,
    service_track: track,
    vendor_id: null,
    requested_by_user_id: user?.id ?? '',
    requested_by_name: user?.name ?? '',
    hod_user_id: 'user-hod-placeholder',
    project_id: null,
    lines,
    created_by: user?.id ?? '',
    updated_by: user?.id ?? '',
  });

  const handleSave = (): void => {
    if (!user) { toast.error('User not resolved'); return; }
    if (lines.length === 0 || lines.every(l => !l.service_name)) {
      toast.error('Add at least one service line');
      return;
    }
    const sr = createServiceRequest(buildPayload(), entityCode);
    submitIndent(sr.id, 'service', entityCode, 'user-hod-placeholder');
    toast.success(`Service Request ${sr.voucher_no} submitted (₹${total.toLocaleString('en-IN')})`);
    mount.clearDraft();
    setCurrentDraft(null);
    setLines([emptyServiceLine(1)]);
  };

  const handleSaveDraft = (): void => {
    if (!user) { toast.error('User not resolved'); return; }
    const sr = createServiceRequest(buildPayload(), entityCode);
    setCurrentDraft(sr);
    toast.success(`Draft ${sr.voucher_no} saved`);
  };

  const handleCancel = (): void => {
    if (!currentDraft || !cancelReason.trim()) return;
    setCancelling(true);
    const result = cancelIndent(currentDraft.id, 'service', user?.id ?? 'current-user', 'department_head', cancelReason, entityCode);
    if (result.ok) {
      toast.success('Service request cancelled');
      setCancelOpen(false);
      setCancelReason('');
      setCurrentDraft(null);
      mount.clearDraft();
      setLines([emptyServiceLine(1)]);
    } else {
      toast.error(`Cancel failed: ${result.reason ?? 'unknown'}`);
    }
    setCancelling(false);
  };

  return (
    <div className="p-6 space-y-4">
      <DraftRecoveryDialog
        formKey="service-request-entry"
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
          <h2 className="text-xl font-bold">Service Request</h2>
          <p className="text-xs text-muted-foreground">Voucher: SR/2526/auto · {date}</p>
        </div>
        <UseLastVoucherButton
          entityCode={entityCode}
          recordType="service-request"
          partyValue={null}
          onUse={() => toast.info('Last voucher loaded')}
        />
      </div>

      <Sprint27d2Mount
        formName="ServiceRequestEntry"
        entityCode={entityCode}
        items={lines as unknown as Array<Record<string, unknown>>}
        isLineItemForm={true}
      />

      <Card>
        <CardHeader><CardTitle className="text-sm">Service Track (Q-Final-2 · 3-track)</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          {(['auto_po', 'direct_po', 'standard_enquiry'] as const).map(t => (
            <Button key={t} size="sm" variant={track === t ? 'default' : 'outline'} onClick={() => setTrack(t)}>
              {t === 'auto_po' ? 'Auto-PO (renewal)' : t === 'direct_po' ? 'Direct PO (low-value)' : 'Standard Enquiry'}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Service Header</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={(v: string) => {
              const next = v as ServiceCategory;
              setCategory(next);
              setSubType(SERVICE_CATEGORIES[next][0]);
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="operational">Operational</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Sub-Type</Label>
            <Select value={subType} onValueChange={(v: string) => setSubType(v as ServiceSubType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SERVICE_CATEGORIES[category].map(st => (
                  <SelectItem key={st} value={st}>{st.charAt(0).toUpperCase() + st.slice(1)}</SelectItem>
                ))}
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
          <CardTitle className="text-sm">Service Lines</CardTitle>
          <Button size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" />Add Line</Button>
        </CardHeader>
        <CardContent>
          <SkeletonRows>
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">#</TableHead>
                    <TableHead className="text-xs">Service Name</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs">Qty</TableHead>
                    <TableHead className="text-xs">UoM</TableHead>
                    <TableHead className="text-xs">Rate (₹)</TableHead>
                    <TableHead className="text-xs">Value (₹)</TableHead>
                    <TableHead className="text-xs">Required</TableHead>
                    <TableHead className="text-xs">SLA Days</TableHead>
                    <TableHead className="text-xs">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{l.line_no}</TableCell>
                      <TableCell>
                        <Input value={l.service_name} onChange={e => updateLine(l.id, { service_name: e.target.value, service_id: e.target.value })} placeholder="Service" />
                      </TableCell>
                      <TableCell><Input value={l.description} onChange={e => updateLine(l.id, { description: e.target.value })} /></TableCell>
                      <TableCell><Input type="number" inputMode="decimal" value={l.qty} onChange={e => updateLine(l.id, { qty: Number(e.target.value) })} className="w-16" /></TableCell>
                      <TableCell>
                        <Select value={l.uom} onValueChange={v => updateLine(l.id, { uom: v })}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="JOB">JOB</SelectItem>
                            <SelectItem value="HRS">HRS</SelectItem>
                            <SelectItem value="VISIT">VISIT</SelectItem>
                            <SelectItem value="MTH">MTH</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input type="number" inputMode="decimal" value={l.estimated_rate} onChange={e => updateLine(l.id, { estimated_rate: Number(e.target.value) })} className="w-24" /></TableCell>
                      <TableCell className="text-xs font-mono">{l.estimated_value.toLocaleString('en-IN')}</TableCell>
                      <TableCell><Input type="date" value={l.required_date} onChange={e => updateLine(l.id, { required_date: e.target.value })} /></TableCell>
                      <TableCell><Input type="number" value={l.sla_days} onChange={e => updateLine(l.id, { sla_days: Number(e.target.value) })} className="w-16" /></TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => removeLine(l.id)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end pt-2 text-sm font-mono">
                <span className="text-muted-foreground mr-2">Total:</span>
                <span className="font-semibold flex items-center"><IndianRupee className="h-3 w-3" />{total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </SkeletonRows>
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
        <Button variant="outline" onClick={handleSaveDraft}>Save Draft</Button>
        {currentDraft?.status === 'draft' && (
          <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)}>Cancel Service Request</Button>
        )}
        <Button onClick={handleSave}>Submit Service Request</Button>
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Service Request</DialogTitle>
          </DialogHeader>
          <Textarea
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation (required · max 500 chars)"
            maxLength={500}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Back</Button>
            <Button variant="destructive" disabled={cancelling || !cancelReason.trim()} onClick={handleCancel}>
              {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sprint27eMount
        entityCode={entityCode}
        voucherTypeId="vt-service-request"
        voucherTypeName="Service Request"
        defaultPartyType="vendor"
        partyId={null}
        partyName={null}
        lineItems={lines.map(l => ({ item_name: l.service_name, qty: l.qty, rate: l.estimated_rate, uom: l.uom, description: l.description }))}
        onPartyCreated={() => { /* no-op */ }}
        onCloneTemplate={() => { /* no-op */ }}
      />
    </div>
  );
}

export const ServiceRequestEntryPanel = ServiceRequestEntry;
