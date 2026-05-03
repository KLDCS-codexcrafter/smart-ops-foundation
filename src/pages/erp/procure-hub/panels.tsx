/**
 * @file        panels.tsx
 * @sprint      T-Phase-1.2.6f-b-2-fix-1 · Block H + M
 * @purpose     Procure360 panels (welcome · enquiry entry · enquiry list · RFQ · quotation · reports)
 * @decisions   D-269 OOB-12 3-Tier · D-278 ALL 12 Card #2.7 mounts · D-242/D-243/D-247
 * @disciplines SD-13 · SD-15 · FR-25 · FR-58
 * @reuses      decimal-helpers · useSprint27d1Mount · Sprint27d2Mount · Sprint27eMount ·
 *              UseLastVoucherButton · DraftRecoveryDialog · KeyboardShortcutOverlay ·
 *              ApprovalTimelinePanel · APPROVAL_MATRIX · buildItemVendorMatrix · useItemVendors
 * @[JWT]       /api/procure360/enquiries · /api/procure360/enquiries/:id/approvals
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Save, IndianRupee, Keyboard, ShoppingCart, Truck, PackageCheck, Clock, Bell } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listEnquiries, promoteIndentToProcurementEnquiry, createEnquiry, updateEnquiry,
  transitionEnquiryStatus,
} from '@/lib/procurement-enquiry-engine';
import { getPendingPurchaseIndents, type PendingPurchaseIndent } from '@/lib/procurement-pr-receiver';
import { listRfqs } from '@/lib/rfq-engine';
import {
  computeRfqRegister, computePendingRfqs, computeAwardHistory,
  computeVendorPerformance, computeBestPriceAnalysis, computeSpendByVendor,
  computeWelcomeKpis, applyReportFilter, type ReportFilter,
} from '@/lib/procure360-report-engine';
import { listQuotations, compareQuotations, validateQuotationCompliance } from '@/lib/vendor-quotation-engine';
import { emitLeakEvent } from '@/lib/leak-register-engine';
import { getTopVendorsByScore, type VendorScore } from '@/lib/vendor-scoring-engine';
import { getOverdueRfqFollowups } from '@/lib/procure-followup-engine';
import { subscribeProcurementPulse, type PulseAlert } from '@/lib/procurement-pulse-stub';
import { getExpiringContracts } from '@/lib/oob/contract-expiry-alerts';
// Block H · D-278 · ALL 12 Card #2.7 mounts
import { dAdd, dMul, round2 } from '@/lib/decimal-helpers';
import { appendAuditEntry } from '@/lib/audit-trail-hash-chain';
import { useFormKeyboardShortcuts } from '@/hooks/useFormKeyboardShortcuts';
import { useSprint27d1Mount } from '@/hooks/useSprint27d1Mount';
import { Sprint27d2Mount } from '@/components/uth/Sprint27d2Mount';
import { Sprint27eMount } from '@/components/uth/Sprint27eMount';
import { UseLastVoucherButton } from '@/components/uth/UseLastVoucherButton';
import { DraftRecoveryDialog } from '@/components/uth/DraftRecoveryDialog';
import { KeyboardShortcutOverlay } from '@/components/uth/KeyboardShortcutOverlay';
import { ApprovalTimelinePanel } from '@/components/uth/ApprovalTimelinePanel';
import { APPROVAL_MATRIX } from '@/types/requisition-common';
import { buildItemVendorMatrix } from '@/lib/item-vendor-matrix-builder';
import { useItemVendors } from '@/hooks/useItemVendors';
// Block M · D-269
import { ApprovalActionPanel, type ApprovalRecord } from '@/components/procure-hub/ApprovalActionPanel';
import { tierFor } from '@/lib/approval-tier-helper';
import type {
  ProcurementEnquiry, ProcurementEnquiryLine, VendorSelectionMode,
} from '@/types/procurement-enquiry';
// Sprint 3-c-1 · Blocks A · B · C · D · E · F · per D-283 + D-284
import {
  listPurchaseOrders, transitionPoStatus, approvePo, sendPoToVendor,
  recordPoFollowup, listOverduePos, computePoOverdueDays,
} from '@/lib/po-management-engine';
import type { PurchaseOrderRecord, PoStatus, PoFollowup } from '@/types/po';
import {
  listGitStage1, listInTransit, createGitStage1FromPo,
  listAgedAwaitingStage2, computeAgedGitDays,
} from '@/lib/git-engine';
import type { GitStage1Record, GitStage1Status } from '@/types/git';
import { toast } from 'sonner';
import type { Procure360Module } from './Procure360Sidebar.types';

const inr = (n: number): string => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// Block K-fix · Q3=B · inline CSV helper (no shared util)
function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const esc = (v: string | number): string => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}


interface NavProps { onNavigate?: (m: Procure360Module) => void }

export function Procure360Welcome({ onNavigate }: NavProps): JSX.Element {
  const { entityCode } = useEntityCode();
  const [pulses, setPulses] = useState<PulseAlert[]>([]);

  const kpis = useMemo(() => computeWelcomeKpis(entityCode), [entityCode]);
  const expiring = useMemo(() => getExpiringContracts(entityCode, 30), [entityCode]);

  useEffect(() => {
    const handle = subscribeProcurementPulse((a) => setPulses((p) => [a, ...p].slice(0, 8)), 30000);
    return () => handle.stop();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Procure360</h1>
        <p className="text-sm text-muted-foreground">Procurement Enquiry → RFQ → Quotation → Award</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Pending Enquiries" value={kpis.pendingEnquiries} />
        <KpiCard label="Active RFQs" value={kpis.activeRfqs} />
        <KpiCard label="Awaiting Quotations" value={kpis.awaitingQuotations} />
        <KpiCard label="Overdue Follow-ups" value={kpis.overdueFollowups} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-x-2">
            <Button onClick={() => onNavigate?.('enquiry-entry')}>New Enquiry</Button>
            <Button variant="outline" onClick={() => onNavigate?.('rfq-list')}>RFQ List</Button>
            <Button variant="outline" onClick={() => onNavigate?.('quotation-comparison')}>Compare</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Procurement Pulse</CardTitle></CardHeader>
          <CardContent>
            {pulses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Listening for alerts…</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {pulses.map((p) => (
                  <li key={p.id} className="flex justify-between">
                    <span>{p.message}</span>
                    <Badge variant="outline">{p.severity}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      {expiring.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Contract Expiry Alerts</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {expiring.map((e) => (
                <li key={e.contract_no}>
                  {e.vendor_name} · {e.contract_no} · {e.days_remaining} days remaining
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold font-mono mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

interface EnquiryFormLine {
  id: string;
  line_no: number;
  item_id: string;
  item_name: string;
  uom: string;
  qty: number;
  estimated_rate: number;
  estimated_value: number;
  required_date: string;
  remarks: string;
  vendor_mode_override: VendorSelectionMode | null;
}

const newLineId = (): string => `pel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const emptyEnquiryLine = (n: number): EnquiryFormLine => ({
  id: newLineId(), line_no: n, item_id: '', item_name: '', uom: 'NOS',
  qty: 0, estimated_rate: 0, estimated_value: 0,
  required_date: new Date().toISOString().slice(0, 10),
  remarks: '', vendor_mode_override: null,
});

export function ProcurementEnquiryEntryPanel(): JSX.Element {
  // 12 Card #2.7 mounts per D-278 — mirror MaterialIndentEntry pattern
  const { entityCode, entityId } = useEntityCode();
  const [pending, setPending] = useState<PendingPurchaseIndent[]>([]);
  const [enquiryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isCapex, setIsCapex] = useState(false);
  const [vendorMode, setVendorMode] = useState<VendorSelectionMode>('scoring');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<EnquiryFormLine[]>([emptyEnquiryLine(1)]);
  const [helpOpen, setHelpOpen] = useState(false);

  // mount #9 · decimal helpers · total
  const totalEstimatedValue = useMemo(() => {
    let t = 0;
    for (const l of lines) t = dAdd(t, l.estimated_value);
    return round2(t);
  }, [lines]);

  const formState = useMemo(
    () => ({ enquiryDate, isCapex, vendorMode, notes, lines, total: totalEstimatedValue }),
    [enquiryDate, isCapex, vendorMode, notes, lines, totalEstimatedValue],
  );

  // mount #7 · useSprint27d1Mount · smart defaults + auto-save + draft recovery
  const mount = useSprint27d1Mount({
    formKey: 'procurement-enquiry-entry',
    entityCode,
    formState,
    items: lines,
    view: 'new',
    voucherType: 'procurement_enquiry',
  });

  // mount #1 · useFormKeyboardShortcuts (rich keyboard bindings)
  useFormKeyboardShortcuts({
    onHelp: () => setHelpOpen(true),
    onCancelOrClose: () => setHelpOpen(false),
  });

  // D-243 strict matching · useItemVendors (Item-Vendor preview)
  const itemVendors = useItemVendors();

  // Item-Vendor matrix preview (RFQ count) · uses buildItemVendorMatrix
  const matrixPreview = useMemo(() => {
    if (lines.length === 0 || lines.every(l => !l.item_id)) return null;
    const stubEnquiry: ProcurementEnquiry = {
      id: 'preview', enquiry_no: 'preview', enquiry_date: enquiryDate,
      entity_id: entityId, branch_id: null, division_id: null, department_id: null,
      cost_center_id: null, source_indent_ids: [], is_standalone: true,
      standalone_approval_tier: null, vendor_mode: vendorMode, selected_vendor_ids: [],
      vendor_overrides: [], item_vendor_matrix: [], matrix_overrides: [],
      lines: lines.map(l => ({
        id: l.id, line_no: l.line_no, source_indent_id: null, source_indent_line_id: null,
        item_id: l.item_id, item_name: l.item_name, uom: l.uom,
        required_qty: l.qty, current_stock_qty: 0,
        estimated_rate: l.estimated_rate, estimated_value: l.estimated_value,
        required_date: l.required_date, schedule_date: l.required_date,
        vendor_mode_override: l.vendor_mode_override, override_reason: null,
        matched_vendor_ids: [], remarks: l.remarks, status: 'draft',
      } as ProcurementEnquiryLine)),
      requested_by_user_id: 'mock-user', hod_id: null, purchase_manager_id: null,
      director_id: null, approval_stage: null, rfq_ids: [], awarded_quotation_ids: [],
      award_notes: '', awarded_at: null, awarded_by_user_id: null, notes: '',
      status: 'draft', created_at: '', updated_at: '',
    };
    return buildItemVendorMatrix(stubEnquiry, vendorMode, itemVendors, []);
  }, [lines, vendorMode, enquiryDate, entityId, itemVendors]);

  useEffect(() => { setPending(getPendingPurchaseIndents(entityCode)); }, [entityCode]);

  const updateLine = useCallback((id: string, patch: Partial<EnquiryFormLine>): void => {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const merged = { ...l, ...patch };
      // mount #9 · decimal-helpers (dMul · round2)
      merged.estimated_value = round2(dMul(merged.qty, merged.estimated_rate));
      return merged;
    }));
  }, []);

  const addLine = (): void => setLines(prev => [...prev, emptyEnquiryLine(prev.length + 1)]);
  const removeLine = (id: string): void => setLines(prev => prev.filter(l => l.id !== id));

  const promote = (indentId: string): void => {
    const result = promoteIndentToProcurementEnquiry([indentId], entityCode, 'mock-user');
    if (result) {
      toast.success(`Promoted to Enquiry ${result.enquiry_no}`);
      setPending(getPendingPurchaseIndents(entityCode));
    } else {
      toast.error('Could not promote indent');
    }
  };

  const handleSubmit = (): void => {
    const validLines = lines.filter(l => l.item_name && l.qty > 0);
    if (validLines.length === 0) { toast.error('Add at least one line'); return; }
    const enquiry = createEnquiry({
      entity_id: entityId, branch_id: null, division_id: null, department_id: null,
      cost_center_id: null, source_indent_ids: [], is_standalone: true,
      vendor_mode: vendorMode,
      lines: validLines.map(l => ({
        source_indent_id: null, source_indent_line_id: null,
        item_id: l.item_id || l.item_name, item_name: l.item_name, uom: l.uom,
        required_qty: l.qty, current_stock_qty: 0,
        estimated_rate: l.estimated_rate, estimated_value: l.estimated_value,
        required_date: l.required_date, schedule_date: l.required_date,
        vendor_mode_override: l.vendor_mode_override, override_reason: null,
        matched_vendor_ids: [], remarks: l.remarks,
      })),
      requested_by_user_id: 'mock-user',
      notes,
    }, entityCode);
    toast.success(`Enquiry ${enquiry.enquiry_no} submitted`);
    mount.clearDraft();
    setLines([emptyEnquiryLine(1)]);
    setNotes('');
  };

  const handleCancel = (): void => {
    // mount #10 · audit trail on cancel
    void appendAuditEntry({
      entityCode, entityId,
      voucherId: 'enquiry-pending',
      voucherKind: 'procurement_enquiry',
      action: 'enquiry.cancel',
      actorUserId: 'mock-user',
      payload: { lines: lines.length, total: totalEstimatedValue },
    }).catch(() => { /* best-effort */ });
    mount.clearDraft();
    setLines([emptyEnquiryLine(1)]);
    setNotes('');
  };

  return (
    <div className="p-6 space-y-4">
      {/* mount #5 · DraftRecoveryDialog */}
      <DraftRecoveryDialog
        formKey="procurement-enquiry-entry"
        entityCode={entityCode}
        open={mount.recoveryOpen}
        draftAge={mount.draftAge}
        onRecover={() => mount.setRecoveryOpen(false)}
        onDiscard={() => { mount.clearDraft(); mount.setRecoveryOpen(false); }}
        onClose={() => mount.setRecoveryOpen(false)}
      />
      {/* mount #6 · KeyboardShortcutOverlay */}
      <KeyboardShortcutOverlay open={helpOpen} onClose={() => setHelpOpen(false)} formName="Procurement Enquiry Entry" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Procurement Enquiry · New</h1>
          <p className="text-sm text-muted-foreground">
            Promote pending-purchase indents OR create standalone enquiry · all 12 Card #2.7 mounts active
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* mount #4 · UseLastVoucherButton */}
          <UseLastVoucherButton
            entityCode={entityCode}
            recordType="procurement-enquiry"
            partyValue={null}
            onUse={() => toast.info('Last enquiry loaded')}
          />
          <Button variant="outline" size="sm" onClick={() => setHelpOpen(true)}>
            <Keyboard className="h-4 w-4 mr-1" /> Shortcuts
          </Button>
          <Button onClick={handleSubmit}><Save className="h-4 w-4 mr-1" />Submit</Button>
        </div>
      </div>

      {/* mount #2 · Sprint27d2Mount · keyboard + bulk paste + line-search */}
      <Sprint27d2Mount
        formName="ProcurementEnquiryEntry"
        entityCode={entityCode}
        items={lines as unknown as Array<Record<string, unknown>>}
        isLineItemForm={true}
      />

      {/* Pending indents · existing flow */}
      <Card>
        <CardHeader><CardTitle>Pending Purchase Indents (Promote to Enquiry)</CardTitle></CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No indents pending promotion.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Indent No</TableHead><TableHead>Department</TableHead>
                  <TableHead>Lines</TableHead><TableHead>Value</TableHead>
                  <TableHead>Days</TableHead><TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((p) => (
                  <TableRow key={p.indent_id}>
                    <TableCell className="font-mono">{p.indent_no}</TableCell>
                    <TableCell>{p.originating_department_name}</TableCell>
                    <TableCell>{p.line_count}</TableCell>
                    <TableCell className="font-mono">{inr(p.total_value)}</TableCell>
                    <TableCell>{p.days_pending}{p.is_urgent ? ' !' : ''}</TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => promote(p.indent_id)}>Promote</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Standalone enquiry form · Tier-3 default unless smaller */}
      <Card>
        <CardHeader><CardTitle>Standalone Enquiry</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Enquiry Date</Label>
              <Input type="date" value={enquiryDate} readOnly />
            </div>
            <div className="col-span-2 flex items-center gap-2 pt-6">
              <Checkbox id="capex" checked={isCapex} onCheckedChange={(c) => setIsCapex(c === true)} />
              <Label htmlFor="capex">CAPEX (forces Tier-3 approval)</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Vendor Selection Mode (D-242)</Label>
            <RadioGroup value={vendorMode} onValueChange={(v) => setVendorMode(v as VendorSelectionMode)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="vm-single" />
                <Label htmlFor="vm-single">Single (pick one vendor)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="scoring" id="vm-scoring" />
                <Label htmlFor="vm-scoring">Multiple-Scoring (top N by score)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="floating" id="vm-floating" />
                <Label htmlFor="vm-floating">Floating (all vendors per item)</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Line Items</Label>
              <Button size="sm" variant="outline" onClick={addLine}>
                <Plus className="h-3 w-3 mr-1" />Add Line
              </Button>
            </div>
            <div className="space-y-2">
              {lines.map(l => (
                <div key={l.id} className="grid grid-cols-12 gap-2 items-end border-b pb-2">
                  <div className="col-span-3">
                    <Label className="text-[10px]">Item</Label>
                    <Input
                      value={l.item_name}
                      onChange={(e) => updateLine(l.id, { item_name: e.target.value, item_id: e.target.value })}
                    />
                  </div>
                  <div className="col-span-1">
                    <Label className="text-[10px]">UoM</Label>
                    <Input value={l.uom} onChange={(e) => updateLine(l.id, { uom: e.target.value })} />
                  </div>
                  <div className="col-span-1">
                    <Label className="text-[10px]">Qty</Label>
                    <Input type="number" inputMode="decimal" value={l.qty}
                      onChange={(e) => updateLine(l.id, { qty: Number(e.target.value) })} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[10px]">Est. Rate</Label>
                    <Input type="number" inputMode="decimal" value={l.estimated_rate}
                      onChange={(e) => updateLine(l.id, { estimated_rate: Number(e.target.value) })} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[10px]">Est. Value</Label>
                    <div className="text-sm font-mono py-1.5">{inr(l.estimated_value)}</div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[10px]">Per-line Mode</Label>
                    <Select
                      value={l.vendor_mode_override ?? '__inherit__'}
                      onValueChange={(v) =>
                        updateLine(l.id, { vendor_mode_override: v === '__inherit__' ? null : (v as VendorSelectionMode) })
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__inherit__">Inherit</SelectItem>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="scoring">Scoring</SelectItem>
                        <SelectItem value="floating">Floating</SelectItem>
                      </SelectContent>
                    </Select>
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
                <span className="font-semibold flex items-center">
                  <IndianRupee className="h-3 w-3" />{totalEstimatedValue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {matrixPreview && (
            <Card className="bg-muted/40">
              <CardContent className="p-4 space-y-1">
                <p className="text-sm font-medium">RFQs to be generated: {matrixPreview.rfq_count}</p>
                {matrixPreview.warnings.length > 0 && (
                  <ul className="text-xs text-warning">
                    {matrixPreview.warnings.map((w, i) => <li key={`mw-${i}`}>! {w}</li>)}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {/* mount #12 · ApprovalTimelinePanel REUSE */}
          <ApprovalTimelinePanel totalEstimatedValue={totalEstimatedValue} forceFinanceGate={isCapex} />

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button onClick={handleSubmit}>Submit</Button>
          </div>
        </CardContent>
      </Card>

      {/* mount #3 · Sprint27eMount · pinned templates */}
      <Sprint27eMount
        entityCode={entityCode}
        voucherTypeId="procurement_enquiry"
        voucherTypeName="Procurement Enquiry"
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

type MockApproverRole = 'Department Head' | 'Purchase Manager' | 'Purchase Head' | 'Director / Finance Head';

export function EnquiryListPanel(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const [enquiries, setEnquiries] = useState<ProcurementEnquiry[]>(() => listEnquiries(entityCode));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mockRole, setMockRole] = useState<MockApproverRole>('Department Head');

  const refresh = (): void => setEnquiries(listEnquiries(entityCode));

  const selected = useMemo(
    () => (selectedId ? enquiries.find(e => e.id === selectedId) ?? null : null),
    [selectedId, enquiries],
  );

  const enquiryTotal = (e: ProcurementEnquiry): number =>
    round2(e.lines.reduce((s, l) => dAdd(s, l.estimated_value ?? 0), 0));

  const handleApprove = (enquiry: ProcurementEnquiry, _tier: 1 | 2 | 3, role: string): void => {
    const approvals: ApprovalRecord[] = [
      ...(((enquiry as unknown as { approvals?: ApprovalRecord[] }).approvals) ?? []),
      { role, approved_at: new Date().toISOString(), approved_by: 'mock-user' },
    ];
    const total = enquiryTotal(enquiry);
    const isCapex = (enquiry as unknown as { is_capex?: boolean }).is_capex ?? false;
    const tier = tierFor(total, isCapex);
    const tierConfig = APPROVAL_MATRIX[tier - 1];
    const allDone = tierConfig.required_approvals.every(r => approvals.some(a => a.role === r.role));
    updateEnquiry(
      enquiry.id,
      { ...((({ approvals } as unknown) as Partial<ProcurementEnquiry>)) },
      entityCode,
    );
    if (allDone) {
      transitionEnquiryStatus(enquiry.id, 'approved', entityCode, 'mock-user');
    }
    refresh();
    setSelectedId(null);
  };

  const handleReject = (enquiry: ProcurementEnquiry, _reason: string): void => {
    transitionEnquiryStatus(enquiry.id, 'rejected', entityCode, 'mock-user');
    refresh();
    setSelectedId(null);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Procurement Enquiries</h1>
      <Card>
        <CardContent className="pt-6">
          {enquiries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No enquiries yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Enquiry No</TableHead><TableHead>Date</TableHead>
                  <TableHead>Mode</TableHead><TableHead>Lines</TableHead>
                  <TableHead>Value</TableHead><TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead><TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enquiries.map(e => {
                  const total = enquiryTotal(e);
                  const isCapex = (e as unknown as { is_capex?: boolean }).is_capex ?? false;
                  const tier = tierFor(total, isCapex);
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono">{e.enquiry_no}</TableCell>
                      <TableCell>{e.enquiry_date}</TableCell>
                      <TableCell>{e.vendor_mode}</TableCell>
                      <TableCell>{e.lines.length}</TableCell>
                      <TableCell className="font-mono">{inr(total)}</TableCell>
                      <TableCell><Badge variant="outline">T{tier}</Badge></TableCell>
                      <TableCell><Badge>{e.status}</Badge></TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedId(e.id)}>Open</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selected && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-2">
              <Label>Current User Role (demo · OOB-12 mock auth)</Label>
              <Select value={mockRole} onValueChange={(v) => setMockRole(v as MockApproverRole)}>
                <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Department Head">Department Head</SelectItem>
                  <SelectItem value="Purchase Manager">Purchase Manager</SelectItem>
                  <SelectItem value="Purchase Head">Purchase Head</SelectItem>
                  <SelectItem value="Director / Finance Head">Director / Finance Head</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <ApprovalActionPanel
            enquiryId={selected.id}
            enquiryNo={selected.enquiry_no}
            totalEstimatedValue={enquiryTotal(selected)}
            isCapex={(selected as unknown as { is_capex?: boolean }).is_capex ?? false}
            currentApprovals={((selected as unknown as { approvals?: ApprovalRecord[] }).approvals) ?? []}
            currentUserRole={mockRole}
            entityCode={entityCode}
            entityId={entityId}
            onApprove={(tier, role) => handleApprove(selected, tier, role)}
            onReject={(reason) => handleReject(selected, reason)}
          />
        </div>
      )}
    </div>
  );
}

// Block I-fix · D-256 · RFQ list with Send / Decline / Timeout / Cancel + channel inline edit
export function RfqListPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const rfqs = useMemo(() => {
    void version; // re-read on refresh
    return listRfqs(entityCode);
  }, [entityCode, version]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reasonOpen, setReasonOpen] = useState<{ id: string; mode: 'decline' | 'cancel' } | null>(null);
  const [reasonText, setReasonText] = useState('');

  const filtered = useMemo(() => rfqs.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!r.rfq_no.toLowerCase().includes(s) && !r.vendor_name.toLowerCase().includes(s)) return false;
    }
    return true;
  }), [rfqs, search, statusFilter]);

  const fmtDate = (iso: string | null): string => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return iso; }
  };

  const onChangeChannel = (rfq: typeof rfqs[number], channel: 'internal' | 'whatsapp' | 'email'): void => {
    if (rfq.status !== 'draft') {
      toast.error('Channel can be edited only on draft RFQs.');
      return;
    }
    import('@/lib/rfq-engine').then(({ updateRfq }) => {
      updateRfq(rfq.id, { primary_channel: channel }, entityCode);
      toast.success(`Primary channel set to ${channel}.`);
      refresh();
    });
  };

  const onSend = async (rfq: typeof rfqs[number]): Promise<void> => {
    setBusyId(rfq.id);
    try {
      const { sendRfq } = await import('@/lib/rfq-engine');
      await sendRfq(
        rfq.id,
        { id: rfq.vendor_id, name: rfq.vendor_name, contact_email: undefined, contact_mobile: undefined },
        rfq.send_channels.length > 0 ? rfq.send_channels : [rfq.primary_channel],
        entityCode,
        'mock-user',
      );
      toast.success(`RFQ ${rfq.rfq_no} sent.`);
      refresh();
    } catch (e) {
      toast.error(`Send failed · ${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  };

  const onTimeout = async (rfq: typeof rfqs[number]): Promise<void> => {
    setBusyId(rfq.id);
    try {
      const { timeoutRfq } = await import('@/lib/rfq-engine');
      const { triggerFallback } = await import('@/lib/rfq-fallback-engine');
      timeoutRfq(rfq.id, entityCode);
      // Q2=B · Timeout DOES call triggerFallback
      const result = triggerFallback(rfq, 'timeout', entityCode, []);
      toast.warning(`RFQ ${rfq.rfq_no} marked timeout · fallback ${result.success ? 'triggered' : result.reason}.`);
      refresh();
    } finally {
      setBusyId(null);
    }
  };

  const submitReason = async (): Promise<void> => {
    if (!reasonOpen) return;
    const rfq = rfqs.find((r) => r.id === reasonOpen.id);
    if (!rfq) return;
    const reason = reasonText.trim() || (reasonOpen.mode === 'decline' ? 'Declined by vendor' : 'Cancelled by buyer');
    setBusyId(rfq.id);
    try {
      if (reasonOpen.mode === 'decline') {
        const { declineRfq } = await import('@/lib/rfq-engine');
        const { triggerFallback } = await import('@/lib/rfq-fallback-engine');
        declineRfq(rfq.id, reason, entityCode, 'mock-user');
        // Q2=B · Decline DOES call triggerFallback
        const result = triggerFallback(rfq, 'declined', entityCode, []);
        toast.warning(`RFQ ${rfq.rfq_no} declined · fallback ${result.success ? 'triggered' : result.reason}.`);
      } else {
        // Q2=B · Cancel marks status='cancelled' + audit · NO triggerFallback
        const { updateRfq } = await import('@/lib/rfq-engine');
        updateRfq(rfq.id, { status: 'cancelled' }, entityCode);
        await appendAuditEntry({
          entityCode,
          entityId: rfq.entity_id,
          voucherId: rfq.id,
          voucherKind: 'rfq',
          action: 'rfq.cancelled',
          actorUserId: 'mock-user',
          payload: { rfq_no: rfq.rfq_no, reason },
        }).catch(() => { /* best-effort */ });
        toast.success(`RFQ ${rfq.rfq_no} cancelled.`);
      }
      refresh();
    } finally {
      setBusyId(null);
      setReasonOpen(null);
      setReasonText('');
    }
  };

  const statusBadge = (s: string): JSX.Element => {
    const variant: 'default' | 'secondary' | 'outline' =
      s === 'awarded' || s === 'quoted' ? 'default'
      : s === 'declined' || s === 'timeout' || s === 'cancelled' ? 'outline'
      : 'secondary';
    return <Badge variant={variant}>{s}</Badge>;
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">RFQ List</h1>
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Search</label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="RFQ no or vendor" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="opened">Opened</SelectItem>
                  <SelectItem value="quoted">Quoted</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="timeout">Timeout</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="awarded">Awarded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end text-sm text-muted-foreground">
              {filtered.length} of {rfqs.length} RFQs
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RFQ No</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Timeout</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    No RFQs match the current filter.
                  </TableCell>
                </TableRow>
              ) : filtered.map((r) => {
                const canSend = r.status === 'draft';
                const canDeclineOrTimeout = ['sent', 'opened', 'received_by_vendor'].includes(r.status);
                const canCancel = ['draft', 'sent', 'opened', 'received_by_vendor'].includes(r.status);
                const isBusy = busyId === r.id;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono">{r.rfq_no}</TableCell>
                    <TableCell>{r.vendor_name}</TableCell>
                    <TableCell>
                      {r.status === 'draft' ? (
                        <Select value={r.primary_channel} onValueChange={(v) => onChangeChannel(r, v as 'internal' | 'whatsapp' | 'email')}>
                          <SelectTrigger className="h-8 w-[120px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="internal">Internal</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline">{r.primary_channel}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-xs">{fmtDate(r.sent_at)}</TableCell>
                    <TableCell className="text-xs">{fmtDate(r.timeout_at)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="default" disabled={!canSend || isBusy} onClick={() => onSend(r)}>Send</Button>
                      <Button size="sm" variant="outline" disabled={!canDeclineOrTimeout || isBusy}
                        onClick={() => { setReasonOpen({ id: r.id, mode: 'decline' }); setReasonText(''); }}>
                        Decline
                      </Button>
                      <Button size="sm" variant="outline" disabled={!canDeclineOrTimeout || isBusy} onClick={() => onTimeout(r)}>Timeout</Button>
                      <Button size="sm" variant="ghost" disabled={!canCancel || isBusy}
                        onClick={() => { setReasonOpen({ id: r.id, mode: 'cancel' }); setReasonText(''); }}>
                        Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {reasonOpen && (
        <Card className="border-warning">
          <CardHeader><CardTitle className="text-base">
            {reasonOpen.mode === 'decline' ? 'Decline RFQ · enter vendor reason' : 'Cancel RFQ · enter buyer reason'}
          </CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={reasonText} onChange={(e) => setReasonText(e.target.value)} rows={3}
              placeholder={reasonOpen.mode === 'decline' ? 'e.g. Out of stock' : 'e.g. Requirement cancelled'} />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setReasonOpen(null); setReasonText(''); }}>Close</Button>
              <Button onClick={submitReason} disabled={busyId !== null}>
                Confirm {reasonOpen.mode === 'decline' ? 'Decline' : 'Cancel'}
              </Button>
            </div>
            {reasonOpen.mode === 'decline' && (
              <p className="text-xs text-muted-foreground">Decline triggers auto-fallback (Mode 2 · scoring).</p>
            )}
            {reasonOpen.mode === 'cancel' && (
              <p className="text-xs text-muted-foreground">Cancel marks status only · audit appended · no fallback.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function QuotationComparisonPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const enquiries = listEnquiries(entityCode);
  const [selected, setSelected] = useState<string>('');
  const rows = selected ? compareQuotations(selected, entityCode) : [];
  const complianceByVendor = useMemo(() => {
    const quotes = selected ? listQuotations(entityCode).filter(q => q.parent_enquiry_id === selected) : [];
    const m = new Map<string, ReturnType<typeof validateQuotationCompliance>>();
    quotes.forEach(q => m.set(q.vendor_id, validateQuotationCompliance(q)));
    return m;
  }, [selected, entityCode]);

  const checkLeak = (vendorId: string, rate: number, bestRate: number): void => {
    if (bestRate <= 0) return;
    const variance = ((rate - bestRate) / bestRate) * 100;
    if (variance > 10) {
      // D-274 / D-279 · cost leakage when selected vendor is >110% of best
      emitLeakEvent({
        entity_id: entityCode,
        category: 'cost',
        sub_kind: 'quotation_above_best_price',
        ref_type: 'quotation',
        ref_id: vendorId,
        amount: rate,
        baseline_amount: bestRate,
        variance_pct: Math.round(variance * 100) / 100,
        notes: `Vendor rate ${variance.toFixed(1)}% above best`,
        emitted_by: 'mock-user',
      });
      toast.info(`Cost leakage logged · ${variance.toFixed(1)}% above best`);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Quotation Comparison</h1>
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex flex-wrap gap-2">
            {enquiries.map((e) => (
              <Button
                key={e.id}
                size="sm"
                variant={selected === e.id ? 'default' : 'outline'}
                onClick={() => setSelected(e.id)}
              >
                {e.enquiry_no}
              </Button>
            ))}
            {enquiries.length === 0 && (
              <p className="text-sm text-muted-foreground">No enquiries available.</p>
            )}
          </div>
          {selected && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">No quotations received yet.</p>
          )}
          {rows.map((r) => (
            <Card key={r.enquiry_line_id}>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Line {r.enquiry_line_id}</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Delivery (days)</TableHead>
                      <TableHead>Compliance</TableHead>
                      <TableHead>Best</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {r.cells.map((c) => {
                      const comp = complianceByVendor.get(c.vendor_id);
                      const bestCell = r.cells.find(x => x.vendor_id === r.best_price_vendor_id);
                      return (
                        <TableRow key={c.vendor_id}>
                          <TableCell>{c.vendor_name}</TableCell>
                          <TableCell className="font-mono">{inr(c.rate)}</TableCell>
                          <TableCell className="font-mono">{inr(c.amount_after_tax)}</TableCell>
                          <TableCell>{c.delivery_days}</TableCell>
                          <TableCell>
                            {comp ? (
                              comp.ok
                                ? <Badge variant="outline" className="text-success">OK</Badge>
                                : <Badge variant="outline" className="text-warning" title={comp.warnings.join(' · ')}>{comp.failed_rules.length} issue(s)</Badge>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>
                            {c.vendor_id === r.best_price_vendor_id
                              ? '★'
                              : (
                                <Button size="sm" variant="ghost" onClick={() => checkLeak(c.vendor_id, c.rate, bestCell?.rate ?? 0)}>
                                  Check leak
                                </Button>
                              )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function AwardHistoryPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const awards = listQuotations(entityCode).filter((q) => q.is_awarded);
  return (
    <PanelList
      title="Awards"
      headers={['Quotation No', 'Vendor', 'Amount', 'Awarded At']}
      rows={awards.map((a) => [a.quotation_no, a.vendor_name, inr(a.total_after_tax), a.award_at ?? '—'])}
    />
  );
}

export function RfqRegisterReportPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [filter, setFilter] = useState<ReportFilter>({});
  const all = computeRfqRegister(entityCode);
  const filtered = applyReportFilter(
    all.map((r) => ({ ...r, sent_at: r.sent_at ?? undefined })),
    filter,
  );
  const headers = ['RFQ No', 'Vendor', 'Status', 'Sent', 'Age (days)'];
  const rows = filtered.map((r) => [r.rfq_no, r.vendor_name, r.status, r.sent_at ?? '—', String(r.age_days)]);
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">RFQ Register</h1>
        <Button size="sm" variant="outline" onClick={() => downloadCsv('rfq-register.csv', headers, rows)}>
          Export CSV
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">From</label>
            <Input type="date" value={filter.date_from ?? ''} onChange={(e) => setFilter((f) => ({ ...f, date_from: e.target.value || undefined }))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">To</label>
            <Input type="date" value={filter.date_to ?? ''} onChange={(e) => setFilter((f) => ({ ...f, date_to: e.target.value || undefined }))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Status</label>
            <Input value={filter.status ?? ''} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value || undefined }))} placeholder="sent / quoted / …" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Vendor ID</label>
            <Input value={filter.vendor_id ?? ''} onChange={(e) => setFilter((f) => ({ ...f, vendor_id: e.target.value || undefined }))} placeholder="vendor id" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground mb-2">{filtered.length} of {all.length} RFQs</p>
          <Table>
            <TableHeader><TableRow>{headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={headers.length} className="text-center text-sm text-muted-foreground py-8">No rows match.</TableCell></TableRow>
              ) : rows.map((r, i) => (
                <TableRow key={`${r[0]}-${i}`}>{r.map((c, j) => <TableCell key={j} className={j === 0 ? 'font-mono' : ''}>{c}</TableCell>)}</TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function PendingRfqReportPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [vendorFilter, setVendorFilter] = useState('');
  const all = computePendingRfqs(entityCode);
  const filtered = vendorFilter
    ? all.filter((r) => r.vendor_name.toLowerCase().includes(vendorFilter.toLowerCase()))
    : all;
  const headers = ['RFQ No', 'Vendor', 'Status', 'Sent At', 'Timeout At', 'Days Overdue'];
  const today = Date.now();
  const rows = filtered.map((r) => {
    const overdue = r.timeout_at && new Date(r.timeout_at).getTime() < today
      ? Math.floor((today - new Date(r.timeout_at).getTime()) / 86400000)
      : 0;
    return [r.rfq_no, r.vendor_name, r.status, r.sent_at ?? '—', r.timeout_at ?? '—', String(overdue)];
  });
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pending RFQs</h1>
        <Button size="sm" variant="outline" onClick={() => downloadCsv('pending-rfqs.csv', headers, rows)}>Export CSV</Button>
      </div>
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="md:max-w-sm">
            <label className="text-xs text-muted-foreground">Vendor name contains</label>
            <Input value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} placeholder="filter by vendor" />
          </div>
          <p className="text-xs text-muted-foreground">{filtered.length} of {all.length} pending RFQs</p>
          <Table>
            <TableHeader><TableRow>{headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={headers.length} className="text-center text-sm text-muted-foreground py-8">No pending RFQs.</TableCell></TableRow>
              ) : rows.map((r, i) => (
                <TableRow key={`${r[0]}-${i}`}>{r.map((c, j) => (
                  <TableCell key={j} className={j === 0 ? 'font-mono' : j === 5 && Number(c) > 0 ? 'text-warning font-mono' : ''}>{c}</TableCell>
                ))}</TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function ComparisonReportPanel(): JSX.Element {
  return <QuotationComparisonPanel />;
}

export function AwardHistoryReportPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const rows = computeAwardHistory(entityCode);
  return (
    <PanelList
      title="Award History"
      headers={['Quotation No', 'Vendor', 'Amount', 'Awarded At', 'Remarks']}
      rows={rows.map((a) => [a.quotation_no, a.vendor_name, inr(a.amount), a.awarded_at ?? '—', a.remarks ?? ''])}
    />
  );
}

export function VendorPerfReportPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [sortKey, setSortKey] = useState<'spend' | 'response' | 'awards'>('spend');
  const all = computeVendorPerformance(entityCode);
  const sorted = [...all].sort((a, b) => {
    if (sortKey === 'spend') return b.total_spend - a.total_spend;
    if (sortKey === 'response') return b.response_rate - a.response_rate;
    return b.awarded_count - a.awarded_count;
  });
  const headers = ['Vendor', 'RFQs', 'Quoted', 'Awarded', 'Spend', 'Response %'];
  const rows = sorted.map((r) => [
    r.vendor_name, String(r.rfq_count), String(r.quoted_count),
    String(r.awarded_count), inr(r.total_spend), `${r.response_rate}%`,
  ]);
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vendor Performance</h1>
        <Button size="sm" variant="outline" onClick={() => downloadCsv('vendor-performance.csv', headers, rows)}>Export CSV</Button>
      </div>
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex gap-2 items-center">
            <span className="text-xs text-muted-foreground">Sort by:</span>
            <Button size="sm" variant={sortKey === 'spend' ? 'default' : 'outline'} onClick={() => setSortKey('spend')}>Spend</Button>
            <Button size="sm" variant={sortKey === 'response' ? 'default' : 'outline'} onClick={() => setSortKey('response')}>Response %</Button>
            <Button size="sm" variant={sortKey === 'awards' ? 'default' : 'outline'} onClick={() => setSortKey('awards')}>Awards</Button>
          </div>
          <Table>
            <TableHeader><TableRow>{headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={headers.length} className="text-center text-sm text-muted-foreground py-8">No vendor activity yet.</TableCell></TableRow>
              ) : rows.map((r, i) => (
                <TableRow key={`${r[0]}-${i}`}>{r.map((c, j) => (
                  <TableCell key={j} className={j >= 1 ? 'font-mono' : ''}>{c}</TableCell>
                ))}</TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function BestPriceReportPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const items = Array.from(new Set(listQuotations(entityCode).flatMap((q) => q.lines.map((l) => l.item_id))));
  const [selected, setSelected] = useState<string>(items[0] ?? '');
  const rows = selected ? computeBestPriceAnalysis(selected, entityCode) : [];
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Best Price Analysis</h1>
      <div className="flex flex-wrap gap-2">
        {items.map((id) => (
          <Button key={id} size="sm" variant={selected === id ? 'default' : 'outline'} onClick={() => setSelected(id)}>
            {id}
          </Button>
        ))}
      </div>
      <Card><CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead><TableHead>Rate</TableHead><TableHead>Quoted At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={`${r.vendor_id}-${i}`}>
                <TableCell>{r.vendor_name}</TableCell>
                <TableCell className="font-mono">{inr(r.rate)}</TableCell>
                <TableCell>{r.quoted_at}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

export function SpendByVendorReportPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const all = computeSpendByVendor(entityCode);
  const totalSpend = all.reduce((s, r) => s + r.spend, 0);
  const sorted = [...all].sort((a, b) => b.spend - a.spend);
  const headers = ['Vendor', 'Spend', 'Awards', 'Share %'];
  const rows = sorted.map((r) => [
    r.vendor_name,
    inr(r.spend),
    String(r.award_count),
    totalSpend > 0 ? `${((r.spend / totalSpend) * 100).toFixed(1)}%` : '0%',
  ]);
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Spend by Vendor</h1>
        <Button size="sm" variant="outline" onClick={() => downloadCsv('spend-by-vendor.csv', headers, rows)}>Export CSV</Button>
      </div>
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">Total spend</p>
              <p className="text-xl font-bold font-mono">{inr(totalSpend)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">Vendors</p>
              <p className="text-xl font-bold font-mono">{all.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">Top vendor share</p>
              <p className="text-xl font-bold font-mono">{rows[0]?.[3] ?? '0%'}</p>
            </div>
          </div>
          <Table>
            <TableHeader><TableRow>{headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={headers.length} className="text-center text-sm text-muted-foreground py-8">No spend data.</TableCell></TableRow>
              ) : rows.map((r, i) => (
                <TableRow key={`${r[0]}-${i}`}>{r.map((c, j) => (
                  <TableCell key={j} className={j >= 1 ? 'font-mono' : ''}>{c}</TableCell>
                ))}</TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function RfqFollowupRegisterReportPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const overdue = getOverdueRfqFollowups(entityCode);
  return (
    <PanelList
      title="RFQ Follow-up Register"
      headers={['RFQ ID', 'Days Overdue']}
      rows={overdue.map((o) => [o.rfq_id, String(o.days_overdue)])}
    />
  );
}

export function CrossDeptHandoffPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const enquiries = listEnquiries(entityCode);
  const rfqs = listRfqs(entityCode);
  const quotations = listQuotations(entityCode);
  const pos = listPurchaseOrders(entityCode);
  const gitRecords = listGitStage1(entityCode);

  const stageBadge = (count: number, total: number): JSX.Element => {
    if (total === 0 && count === 0) return <Badge variant="outline">—</Badge>;
    if (count === 0) return <Badge variant="outline">0/{total}</Badge>;
    if (count < total) return <Badge variant="secondary">{count}/{total}</Badge>;
    return <Badge variant="default">{count}/{total} ✓</Badge>;
  };

  // Summary KPIs · bottleneck detection
  const totalAwarded = quotations.filter((q) => q.is_awarded).length;
  const pendingPoCreation = quotations.filter(
    (q) => q.is_awarded && !pos.some((p) => p.source_quotation_id === q.id),
  ).length;
  const pendingReceipt = pos.filter(
    (p) => (p.status === 'sent_to_vendor' || p.status === 'approved')
      && !gitRecords.some((g) => g.po_id === p.id),
  ).length;
  const pendingStage2 = gitRecords.filter(
    (g) => (g.status === 'received_at_gate' || g.status === 'partial_receive') && g.stage2_grn_id === null,
  ).length;
  const stalled15Plus = gitRecords.filter(
    (g) => g.stage2_grn_id === null && computeAgedGitDays(g) > 14,
  ).length;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Cross-Dept Procurement Handoff</h1>
        <p className="text-sm text-muted-foreground">11-stage pipeline · MOAT #20 · POFU-2 extension</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-6">
          <div className="text-xs text-muted-foreground">Pending PO Creation</div>
          <div className="text-2xl font-mono font-bold">{pendingPoCreation}</div>
          <div className="text-xs text-muted-foreground">of {totalAwarded} awarded</div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="text-xs text-muted-foreground">Pending Receipt</div>
          <div className="text-2xl font-mono font-bold">{pendingReceipt}</div>
          <div className="text-xs text-muted-foreground">POs awaiting GIT-S1</div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="text-xs text-muted-foreground">Pending Stage 2</div>
          <div className="text-2xl font-mono font-bold">{pendingStage2}</div>
          <div className="text-xs text-muted-foreground">received at gate</div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="text-xs text-muted-foreground">Stalled (15+ days)</div>
          <div className="text-2xl font-mono font-bold text-destructive">{stalled15Plus}</div>
          <div className="text-xs text-muted-foreground">awaiting Stage 2</div>
        </CardContent></Card>
      </div>

      <Card><CardContent className="pt-6">
        {enquiries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No enquiries yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Enquiry</TableHead>
                <TableHead>Source Indents</TableHead>
                <TableHead>RFQs</TableHead>
                <TableHead>Quotes</TableHead>
                <TableHead>Awarded</TableHead>
                <TableHead>POs</TableHead>
                <TableHead>GIT Stage 1</TableHead>
                <TableHead>GIT Stage 2</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enquiries.map((e) => {
                const rs = rfqs.filter((r) => r.parent_enquiry_id === e.id);
                const qs = quotations.filter((q) => q.parent_enquiry_id === e.id);
                const aw = qs.filter((q) => q.is_awarded);
                const enquiryPos = pos.filter((p) => aw.some((q) => q.id === p.source_quotation_id));
                const enquiryGitS1 = gitRecords.filter((g) => enquiryPos.some((p) => p.id === g.po_id));
                const enquiryGitS2Count = enquiryGitS1.filter((g) => g.stage2_grn_id !== null).length;
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono">{e.enquiry_no}</TableCell>
                    <TableCell>{e.source_indent_ids.length}</TableCell>
                    <TableCell>{rs.length}</TableCell>
                    <TableCell>{qs.length}</TableCell>
                    <TableCell>{aw.length}</TableCell>
                    <TableCell>{stageBadge(enquiryPos.length, aw.length)}</TableCell>
                    <TableCell>{stageBadge(enquiryGitS1.length, enquiryPos.length)}</TableCell>
                    <TableCell>{stageBadge(enquiryGitS2Count, enquiryGitS1.length)}</TableCell>
                    <TableCell><Badge variant="outline">{e.status}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  );
}

export function VendorScoringDashboardPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [scores, setScores] = useState<VendorScore[]>([]);
  useEffect(() => { setScores(getTopVendorsByScore(entityCode, 20)); }, [entityCode]);
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Vendor Scoring Dashboard</h1>
      <p className="text-sm text-muted-foreground">Top 20 vendors · 6-factor weighted score (D-244)</p>
      <Card><CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead><TableHead>Total</TableHead>
              <TableHead>RFQs</TableHead><TableHead>Quotes</TableHead><TableHead>Awards</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scores.map((s) => (
              <TableRow key={s.vendor_id}>
                <TableCell>{s.vendor_name}</TableCell>
                <TableCell className="font-mono">{s.total_score}</TableCell>
                <TableCell>{s.rfq_count}</TableCell>
                <TableCell>{s.quote_count}</TableCell>
                <TableCell>{s.award_count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

function PanelList(props: { title: string; headers: string[]; rows: string[][] }): JSX.Element {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">{props.title}</h1>
      <Card><CardContent className="pt-6">
        {props.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No records.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>{props.headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {props.rows.map((r, i) => (
                <TableRow key={`row-${i}`}>
                  {r.map((c, j) => <TableCell key={`c-${i}-${j}`}>{c}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sprint T-Phase-1.2.6f-c-1 · Block B · PO panels (per D-283)
// ─────────────────────────────────────────────────────────────────────────────

const PO_STATUS_TABS: Array<{ id: 'all' | PoStatus; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'pending_approval', label: 'Pending Approval' },
  { id: 'approved', label: 'Approved' },
  { id: 'sent_to_vendor', label: 'Sent' },
  { id: 'partially_received', label: 'Partial' },
  { id: 'fully_received', label: 'Received' },
  { id: 'closed', label: 'Closed' },
  { id: 'cancelled', label: 'Cancelled' },
];

export function PoListPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [pos, setPos] = useState<PurchaseOrderRecord[]>(() => listPurchaseOrders(entityCode));
  const [activeTab, setActiveTab] = useState<'all' | PoStatus>('all');
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);

  const refresh = useCallback(() => setPos(listPurchaseOrders(entityCode)), [entityCode]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: pos.length };
    for (const p of pos) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [pos]);

  const filteredPos = useMemo(
    () => (activeTab === 'all' ? pos : pos.filter((p) => p.status === activeTab)),
    [pos, activeTab],
  );

  const selected = useMemo(
    () => (selectedPoId ? pos.find((p) => p.id === selectedPoId) ?? null : null),
    [selectedPoId, pos],
  );

  const handleApprove = async (po: PurchaseOrderRecord): Promise<void> => {
    const updated = await approvePo(po.id, entityCode, 'mock-user');
    if (updated) {
      refresh();
      toast.success(`PO ${po.po_no} approved`);
    } else {
      toast.error('Approval failed');
    }
  };

  const handleSend = async (po: PurchaseOrderRecord): Promise<void> => {
    const updated = await sendPoToVendor(po.id, entityCode, 'mock-user');
    if (updated) {
      refresh();
      toast.success(`PO ${po.po_no} sent to ${po.vendor_name}`);
    } else {
      toast.error('Send failed');
    }
  };

  const handleCancel = async (po: PurchaseOrderRecord): Promise<void> => {
    const updated = await transitionPoStatus(po.id, 'cancelled', entityCode, 'mock-user');
    if (updated) {
      refresh();
      toast.info(`PO ${po.po_no} cancelled`);
    } else {
      toast.error('Cancel not allowed');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Purchase Orders</h1>
        <p className="text-sm text-muted-foreground">Procure360 PO workflow · sibling of FineCore PurchaseOrder voucher (D-283)</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PO_STATUS_TABS.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={activeTab === t.id ? 'default' : 'outline'}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label} <span className="ml-1 font-mono text-xs">{counts[t.id] ?? 0}</span>
          </Button>
        ))}
      </div>

      <Card><CardContent className="pt-6">
        {filteredPos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No purchase orders.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPos.map((po) => (
                <TableRow
                  key={po.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedPoId(po.id === selectedPoId ? null : po.id)}
                >
                  <TableCell className="font-mono">{po.po_no}</TableCell>
                  <TableCell className="font-mono text-xs">{po.po_date.slice(0, 10)}</TableCell>
                  <TableCell>{po.vendor_name}</TableCell>
                  <TableCell className="text-right font-mono">{inr(po.total_after_tax)}</TableCell>
                  <TableCell className="font-mono text-xs">{po.expected_delivery_date.slice(0, 10)}</TableCell>
                  <TableCell><Badge variant="outline">{po.status}</Badge></TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      {(po.status === 'draft' || po.status === 'pending_approval') && (
                        <Button size="sm" variant="outline" onClick={() => handleApprove(po)}>Approve</Button>
                      )}
                      {po.status === 'approved' && (
                        <Button size="sm" variant="outline" onClick={() => handleSend(po)}>Send</Button>
                      )}
                      {po.status !== 'cancelled' && po.status !== 'closed' && po.status !== 'fully_received' && (
                        <Button size="sm" variant="ghost" onClick={() => handleCancel(po)}>Cancel</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>

      {selected && (
        <Card><CardHeader><CardTitle>{selected.po_no} · Detail</CardTitle></CardHeader><CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div><span className="text-muted-foreground">Vendor: </span>{selected.vendor_name}</div>
            <div><span className="text-muted-foreground">Status: </span><Badge variant="outline">{selected.status}</Badge></div>
            <div><span className="text-muted-foreground">PO Date: </span><span className="font-mono">{selected.po_date.slice(0, 10)}</span></div>
            <div><span className="text-muted-foreground">Expected: </span><span className="font-mono">{selected.expected_delivery_date.slice(0, 10)}</span></div>
            <div><span className="text-muted-foreground">Source Quotation: </span><span className="font-mono text-xs">{selected.source_quotation_id}</span></div>
            <div><span className="text-muted-foreground">Approved: </span>{selected.approved_at ? selected.approved_at.slice(0, 10) : '—'}</div>
          </div>
          <h4 className="font-semibold mb-2">Lines</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">After Tax</TableHead>
                <TableHead className="text-right">Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selected.lines.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.item_name}</TableCell>
                  <TableCell className="text-right font-mono">{l.qty}</TableCell>
                  <TableCell className="text-right font-mono">{inr(l.rate)}</TableCell>
                  <TableCell className="text-right font-mono">{inr(l.amount_after_tax)}</TableCell>
                  <TableCell className="text-right font-mono">{l.qty_received}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {selected.followups.length > 0 && (
            <>
              <h4 className="font-semibold mt-4 mb-2">Followup History</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selected.followups.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-xs">{f.created_at.slice(0, 10)}</TableCell>
                      <TableCell>{f.channel}</TableCell>
                      <TableCell><Badge variant="outline">{f.outcome}</Badge></TableCell>
                      <TableCell className="text-sm">{f.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent></Card>
      )}
    </div>
  );
}

export function PoFollowupRegisterPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [overdue, setOverdue] = useState<PurchaseOrderRecord[]>(() => listOverduePos(entityCode));
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const [channel, setChannel] = useState<PoFollowup['channel']>('call');
  const [outcome, setOutcome] = useState<PoFollowup['outcome']>('no_response');
  const [notes, setNotes] = useState('');
  const [nextAction, setNextAction] = useState('');

  const refresh = useCallback(() => setOverdue(listOverduePos(entityCode)), [entityCode]);

  const handleLog = async (): Promise<void> => {
    if (!selectedPoId || !notes.trim()) {
      toast.error('Select PO and enter notes');
      return;
    }
    const followup: PoFollowup = {
      id: `fup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      po_id: selectedPoId,
      channel,
      outcome,
      notes,
      next_action_due: nextAction || null,
      created_by_user_id: 'mock-user',
      created_at: new Date().toISOString(),
    };
    const updated = await recordPoFollowup(selectedPoId, followup, entityCode, 'mock-user');
    if (updated) {
      toast.success('Followup logged');
      setNotes('');
      setNextAction('');
      setSelectedPoId(null);
      refresh();
    } else {
      toast.error('Log failed');
    }
  };

  const selected = useMemo(
    () => (selectedPoId ? overdue.find((p) => p.id === selectedPoId) ?? null : null),
    [selectedPoId, overdue],
  );

  const ageBadge = (days: number): JSX.Element => {
    if (days > 7) return <Badge variant="destructive">{days}d overdue</Badge>;
    if (days >= 3) return <Badge variant="secondary">{days}d overdue</Badge>;
    return <Badge variant="outline">{days}d overdue</Badge>;
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">PO Followup Register</h1>
        <p className="text-sm text-muted-foreground">Overdue purchase orders · log followup activity</p>
      </div>

      <Card><CardContent className="pt-6">
        {overdue.length === 0 ? (
          <p className="text-sm text-muted-foreground">No overdue purchase orders.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO No</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Aging</TableHead>
                <TableHead>Followups</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overdue.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-mono">{po.po_no}</TableCell>
                  <TableCell>{po.vendor_name}</TableCell>
                  <TableCell className="font-mono text-xs">{po.expected_delivery_date.slice(0, 10)}</TableCell>
                  <TableCell>{ageBadge(computePoOverdueDays(po))}</TableCell>
                  <TableCell className="font-mono">{po.followups.length}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setSelectedPoId(po.id)}>
                      Log Followup
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>

      {selected && (
        <Card><CardHeader><CardTitle>{selected.po_no} · Log Followup</CardTitle></CardHeader><CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="channel">Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as PoFollowup['channel'])}>
                <SelectTrigger id="channel"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="visit">Visit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="outcome">Outcome</Label>
              <Select value={outcome} onValueChange={(v) => setOutcome(v as PoFollowup['outcome'])}>
                <SelectTrigger id="outcome"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="committed">Committed</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="no_response">No Response</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mb-4">
            <Label htmlFor="fup-notes">Notes</Label>
            <Textarea
              id="fup-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was discussed?"
              rows={3}
            />
          </div>
          <div className="mb-4">
            <Label htmlFor="next-action">Next action due (YYYY-MM-DD · optional)</Label>
            <Input
              id="next-action"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="2026-05-10"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleLog}>Log Followup</Button>
            <Button variant="ghost" onClick={() => setSelectedPoId(null)}>Cancel</Button>
          </div>

          {selected.followups.length > 0 && (
            <>
              <h4 className="font-semibold mt-6 mb-2">Followup History</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selected.followups.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-xs">{f.created_at.slice(0, 10)}</TableCell>
                      <TableCell>{f.channel}</TableCell>
                      <TableCell><Badge variant="outline">{f.outcome}</Badge></TableCell>
                      <TableCell className="text-sm">{f.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent></Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sprint T-Phase-1.2.6f-c-1 · Block D · GIT panels (per D-284)
// ─────────────────────────────────────────────────────────────────────────────

export function GitInTransitPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [pos, setPos] = useState<PurchaseOrderRecord[]>(() => listInTransit(entityCode));
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [qualityNotes, setQualityNotes] = useState('');
  const [lineQtys, setLineQtys] = useState<Record<string, number>>({});

  const refresh = useCallback(() => setPos(listInTransit(entityCode)), [entityCode]);

  const selected = useMemo(
    () => (selectedPoId ? pos.find((p) => p.id === selectedPoId) ?? null : null),
    [selectedPoId, pos],
  );

  const openReceive = (po: PurchaseOrderRecord): void => {
    setSelectedPoId(po.id);
    const initial: Record<string, number> = {};
    for (const l of po.lines) initial[l.id] = Math.max(0, l.qty - l.qty_received);
    setLineQtys(initial);
    setVehicleNo('');
    setDriverName('');
    setInvoiceNo('');
    setQualityNotes('');
  };

  const handleReceive = async (): Promise<void> => {
    if (!selected) return;
    const lines = selected.lines.map((pl) => ({
      po_line_id: pl.id,
      qty_received: lineQtys[pl.id] ?? 0,
      qty_accepted: lineQtys[pl.id] ?? 0,
      qty_rejected: 0,
      rejection_reason: null,
    }));
    const result = await createGitStage1FromPo(
      selected.id,
      {
        vehicle_no: vehicleNo || null,
        driver_name: driverName || null,
        invoice_no: invoiceNo || null,
        quality_notes: qualityNotes,
        quality_check_passed: true,
        lines,
      },
      entityCode,
      'mock-user',
    );
    if (result) {
      toast.success(`GIT ${result.git_no} · Stage 1 receipt recorded`);
      setSelectedPoId(null);
      setLineQtys({});
      refresh();
    } else {
      toast.error('Receive failed');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">GIT · In Transit</h1>
        <p className="text-sm text-muted-foreground">Purchase orders awaiting gate-receipt (Stage 1)</p>
      </div>

      <Card><CardContent className="pt-6">
        {pos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No POs in transit.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO No</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pos.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-mono">{po.po_no}</TableCell>
                  <TableCell>{po.vendor_name}</TableCell>
                  <TableCell className="font-mono text-xs">{po.expected_delivery_date.slice(0, 10)}</TableCell>
                  <TableCell><Badge variant="outline">{po.status}</Badge></TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => openReceive(po)}>
                      Receive at Gate
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>

      {selected && (
        <Card><CardHeader><CardTitle>{selected.po_no} · Gate Receipt Form</CardTitle></CardHeader><CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="veh">Vehicle No</Label>
              <Input id="veh" value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} placeholder="MH-12-AB-1234" />
            </div>
            <div>
              <Label htmlFor="drv">Driver Name</Label>
              <Input id="drv" value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Ramesh Kumar" />
            </div>
            <div>
              <Label htmlFor="inv">Vendor Invoice No</Label>
              <Input id="inv" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="INV-2026-0042" />
            </div>
          </div>
          <h4 className="font-semibold mb-2">Lines · Received Quantity</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Ordered</TableHead>
                <TableHead className="text-right">Already Received</TableHead>
                <TableHead className="text-right">Receive Now</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selected.lines.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.item_name}</TableCell>
                  <TableCell className="text-right font-mono">{l.qty}</TableCell>
                  <TableCell className="text-right font-mono">{l.qty_received}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      className="w-24 text-right font-mono ml-auto"
                      value={lineQtys[l.id] ?? 0}
                      onChange={(e) => setLineQtys((prev) => ({ ...prev, [l.id]: Number(e.target.value) || 0 }))}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4">
            <Label htmlFor="qnotes">Quality Notes</Label>
            <Textarea id="qnotes" value={qualityNotes} onChange={(e) => setQualityNotes(e.target.value)} rows={2} />
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleReceive}><Save className="h-4 w-4 mr-1" />Confirm Receipt</Button>
            <Button variant="ghost" onClick={() => setSelectedPoId(null)}>Cancel</Button>
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}

export function GitReceivedPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const allGit = useMemo(() => listGitStage1(entityCode), [entityCode]);
  const [statusFilter, setStatusFilter] = useState<GitStage1Status | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => (statusFilter === 'all' ? allGit : allGit.filter((g) => g.status === statusFilter)),
    [allGit, statusFilter],
  );

  const selected = useMemo(
    () => (selectedId ? allGit.find((g) => g.id === selectedId) ?? null : null),
    [selectedId, allGit],
  );

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">GIT · Received at Gate</h1>
        <p className="text-sm text-muted-foreground">Stage 1 records · awaiting Stage 2 inventory acceptance</p>
      </div>

      <div className="flex gap-2 items-center">
        <Label className="text-sm">Status:</Label>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as GitStage1Status | 'all')}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="in_transit">In Transit</SelectItem>
            <SelectItem value="received_at_gate">Received at Gate</SelectItem>
            <SelectItem value="rejected_at_gate">Rejected at Gate</SelectItem>
            <SelectItem value="partial_receive">Partial Receive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card><CardContent className="pt-6">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No GIT records.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GIT No</TableHead>
                <TableHead>PO No</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Receipt Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Days at Gate</TableHead>
                <TableHead>Stage 2</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((g) => (
                <TableRow
                  key={g.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedId(g.id === selectedId ? null : g.id)}
                >
                  <TableCell className="font-mono">{g.git_no}</TableCell>
                  <TableCell className="font-mono">{g.po_no}</TableCell>
                  <TableCell>{g.vendor_name}</TableCell>
                  <TableCell className="font-mono text-xs">{g.receipt_date.slice(0, 10)}</TableCell>
                  <TableCell><Badge variant="outline">{g.status}</Badge></TableCell>
                  <TableCell className="text-right font-mono">{computeAgedGitDays(g)}</TableCell>
                  <TableCell>
                    {g.stage2_grn_id ? (
                      <Badge variant="default">Linked ✓</Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>

      {selected && (
        <Card><CardHeader><CardTitle>{selected.git_no} · Line Detail</CardTitle></CardHeader><CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm mb-4">
            <div><span className="text-muted-foreground">Vehicle: </span>{selected.vehicle_no ?? '—'}</div>
            <div><span className="text-muted-foreground">Driver: </span>{selected.driver_name ?? '—'}</div>
            <div><span className="text-muted-foreground">Invoice: </span>{selected.invoice_no ?? '—'}</div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Ordered</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Accepted</TableHead>
                <TableHead className="text-right">Rejected</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selected.lines.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.item_name}</TableCell>
                  <TableCell className="text-right font-mono">{l.qty_ordered}</TableCell>
                  <TableCell className="text-right font-mono">{l.qty_received}</TableCell>
                  <TableCell className="text-right font-mono">{l.qty_accepted}</TableCell>
                  <TableCell className="text-right font-mono">{l.qty_rejected}</TableCell>
                  <TableCell className="text-sm">{l.rejection_reason ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sprint T-Phase-1.2.6f-c-1 · Block E · Aged GIT Procure View (sibling pattern · SD-9)
// ─────────────────────────────────────────────────────────────────────────────

export function AgedGitProcurePanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const aged = useMemo(() => listAgedAwaitingStage2(entityCode), [entityCode]);

  const buckets = useMemo(() => ({
    fresh: aged.filter((g) => computeAgedGitDays(g) <= 3),
    p3_7: aged.filter((g) => { const d = computeAgedGitDays(g); return d > 3 && d <= 7; }),
    o8_14: aged.filter((g) => { const d = computeAgedGitDays(g); return d > 7 && d <= 14; }),
    c15: aged.filter((g) => computeAgedGitDays(g) > 14),
  }), [aged]);

  const handleNotify = (g: GitStage1Record): void => {
    // [JWT] POST /api/finecore/notify · Stage 2 reminder · Phase 1 stub
    toast.success(`Notification sent to FineCore for ${g.git_no}`);
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Aged Goods in Transit · Procure360 View</h1>
        <p className="text-sm text-muted-foreground">
          Stage 1 received at gate · awaiting Stage 2 inventory acceptance (FineCore Receipt Note)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-6">
          <div className="text-xs text-muted-foreground">Fresh (0-3 days)</div>
          <div className="text-2xl font-mono font-bold text-success">{buckets.fresh.length}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="text-xs text-muted-foreground">Pending (4-7 days)</div>
          <div className="text-2xl font-mono font-bold text-warning">{buckets.p3_7.length}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="text-xs text-muted-foreground">Overdue (8-14 days)</div>
          <div className="text-2xl font-mono font-bold text-warning">{buckets.o8_14.length}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="text-xs text-muted-foreground">Critical (15+ days)</div>
          <div className="text-2xl font-mono font-bold text-destructive">{buckets.c15.length}</div>
        </CardContent></Card>
      </div>

      <Card><CardContent className="pt-6">
        {aged.length === 0 ? (
          <p className="text-sm text-muted-foreground">No aged GIT records awaiting Stage 2.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GIT No</TableHead>
                <TableHead>PO No</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Days at Gate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aged.map((g) => {
                const d = computeAgedGitDays(g);
                const badge = d > 14
                  ? <Badge variant="destructive">{d}d</Badge>
                  : d > 7
                  ? <Badge variant="secondary">{d}d</Badge>
                  : <Badge variant="outline">{d}d</Badge>;
                return (
                  <TableRow key={g.id}>
                    <TableCell className="font-mono">{g.git_no}</TableCell>
                    <TableCell className="font-mono">{g.po_no}</TableCell>
                    <TableCell>{g.vendor_name}</TableCell>
                    <TableCell className="text-right">{badge}</TableCell>
                    <TableCell><Badge variant="outline">{g.status}</Badge></TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleNotify(g)}>
                        <Bell className="h-3 w-3 mr-1" />Notify FineCore
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  );
}
