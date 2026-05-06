/**
 * @file     JobWorkOutEntry.tsx
 * @sprint   T-Phase-1.3-3a-pre-2-fix-1 (Card #2.7 12-item retrofit)
 * @purpose  Job Work Out Order — send RM/components to a sub-contractor.
 *           Card #2.7 12-item carry-forward + clickable CC banner.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, Save, Send, Plus, Trash2, ExternalLink } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useProductionOrders } from '@/hooks/useProductionOrders';
import { useGodowns } from '@/hooks/useGodowns';
import { useInventoryItems } from '@/hooks/useInventoryItems';
import { useSprint27d1Mount } from '@/hooks/useSprint27d1Mount';
import { useFormKeyboardShortcuts } from '@/hooks/useFormKeyboardShortcuts';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Sprint27d2Mount } from '@/components/uth/Sprint27d2Mount';
import { Sprint27eMount } from '@/components/uth/Sprint27eMount';
import { UseLastVoucherButton } from '@/components/uth/UseLastVoucherButton';
import { DraftRecoveryDialog } from '@/components/uth/DraftRecoveryDialog';
import { KeyboardShortcutOverlay } from '@/components/uth/KeyboardShortcutOverlay';
import { DEMO_VENDORS } from '@/data/demo-customers-vendors';
import { createJobWorkOutOrder, sendJobWorkOutOrder } from '@/lib/job-work-out-engine';
import type { JobWorkOutOrderLine } from '@/types/job-work-out-order';

type LineDraft = Omit<JobWorkOutOrderLine, 'id' | 'line_no' | 'received_qty' | 'job_work_value'>;

const emptyLine = (): LineDraft => ({
  item_id: '', item_code: '', item_name: '', uom: 'NOS',
  sent_qty: 0,
  source_godown_id: '', source_godown_name: '',
  job_work_godown_id: '', job_work_godown_name: '',
  expected_output_item_id: '', expected_output_item_code: '', expected_output_item_name: '',
  expected_output_qty: 0, expected_output_uom: 'NOS',
  job_work_rate: 0,
  remarks: '',
});

export function JobWorkOutEntryPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const [helpOpen, setHelpOpen] = useState(false);
  useFormKeyboardShortcuts({
    onHelp: () => setHelpOpen(true),
    onCancelOrClose: () => setHelpOpen(false),
  });
  const { orders } = useProductionOrders();
  const { godowns } = useGodowns();
  const { items } = useInventoryItems();
  const vendors = DEMO_VENDORS;

  const [vendorId, setVendorId] = useState<string>('');
  const [poId, setPoId] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [jwoDate, setJwoDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [returnDate, setReturnDate] = useState<string>(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState<string>('');
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);

  const linkedPO = useMemo(() => orders.find(o => o.id === poId), [orders, poId]);
  const vendor = useMemo(() => vendors.find(v => v.partyCode === vendorId), [vendors, vendorId]);

  const formStateForMount = useMemo(
    () => ({ poId, vendorId, jwoDate, returnDate, lineCount: lines.length }),
    [poId, vendorId, jwoDate, returnDate, lines.length],
  );
  const itemsForMount = useMemo(
    () => lines.map(l => ({ item_name: l.item_name, qty: l.sent_qty })),
    [lines],
  );
  const mount = useSprint27d1Mount({
    formKey: 'job-work-out-order-entry',
    entityCode,
    formState: formStateForMount,
    items: itemsForMount,
    view: 'new',
    voucherType: 'vt-job-work-out-order',
    userId: user?.id ?? undefined,
    partyId: vendorId || undefined,
  });

  const updateLine = (i: number, patch: Partial<LineDraft>) =>
    setLines(s => s.map((l, idx) => idx === i ? { ...l, ...patch } : l));

  const handleSave = (send: boolean) => {
    if (!vendor) { toast.error('Vendor required'); return; }
    if (!departmentId) { toast.error('Department required'); return; }
    const cleanLines = lines.filter(l => l.item_id && l.sent_qty > 0 && l.expected_output_qty > 0);
    if (cleanLines.length === 0) { toast.error('Add at least one valid line'); return; }
    try {
      const jwo = createJobWorkOutOrder({
        entity_id: entityCode,
        jwo_date: jwoDate,
        expected_return_date: returnDate,
        vendor_id: vendor.partyCode,
        vendor_name: vendor.partyName,
        vendor_gstin: vendor.gstin,
        production_order_id: linkedPO?.id ?? null,
        production_order_no: linkedPO?.doc_no ?? null,
        department_id: departmentId,
        department_name: linkedPO?.department_name ?? departmentId,
        raised_by_user_id: 'current-user',
        raised_by_name: 'Current User',
        lines: cleanLines,
        notes,
      });
      if (send) {
        sendJobWorkOutOrder(jwo, { id: 'current-user', name: 'Current User' });
        toast.success(`JWO ${jwo.doc_no} sent`);
      } else {
        toast.success(`JWO ${jwo.doc_no} saved as draft`);
      }
      setLines([emptyLine()]);
      setNotes('');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <DraftRecoveryDialog
        formKey="job-work-out-order-entry"
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
            <Truck className="h-5 w-5 text-primary" />
            Job Work Out Order
          </h1>
          <p className="text-sm text-muted-foreground">Send components to sub-contractor for processing</p>
        </div>
        <UseLastVoucherButton
          entityCode={entityCode}
          recordType="job-work-out-order"
          partyValue={vendorId || null}
          onUse={() => toast.info('Last voucher loaded')}
        />
      </div>

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

      <Sprint27d2Mount
        formName="JobWorkOutEntry"
        entityCode={entityCode}
        items={itemsForMount as unknown as Array<Record<string, unknown>>}
        isLineItemForm={true}
      />

      <Card>
        <CardHeader><CardTitle className="text-base">Header</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Vendor (Sub-contractor)</Label>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger><SelectValue placeholder="Select vendor..." /></SelectTrigger>
              <SelectContent>
                {vendors.map(v => (
                  <SelectItem key={v.partyCode} value={v.partyCode}>{v.partyCode} · {v.partyName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Linked PO (optional)</Label>
            <Select value={poId} onValueChange={setPoId}>
              <SelectTrigger><SelectValue placeholder="Standalone JWO" /></SelectTrigger>
              <SelectContent>
                {orders.map(o => (
                  <SelectItem key={o.id} value={o.id}>{o.doc_no} · {o.output_item_code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Input value={departmentId} onChange={e => setDepartmentId(e.target.value)} placeholder="Department ID" />
          </div>
          <div className="space-y-2">
            <Label>JWO Date</Label>
            <Input type="date" className="font-mono" value={jwoDate} onChange={e => setJwoDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Expected Return Date</Label>
            <Input type="date" className="font-mono" value={returnDate} onChange={e => setReturnDate(e.target.value)} />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Lines ({lines.length})</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setLines(s => [...s, emptyLine()])}>
              <Plus className="h-3 w-3 mr-1" /> Add Line
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.map((l, idx) => (
            <div key={idx} className="border rounded-md p-2 space-y-2">
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-3 space-y-1">
                  <Label className="text-xs">Sent Item</Label>
                  <Select
                    value={l.item_id}
                    onValueChange={v => {
                      const it = items.find(i => i.id === v);
                      updateLine(idx, {
                        item_id: v,
                        item_code: it?.code ?? '',
                        item_name: it?.name ?? '',
                        uom: it?.primary_uom_symbol ?? 'NOS',
                      });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Item..." /></SelectTrigger>
                    <SelectContent>
                      {items.map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.code} · {i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Sent Qty</Label>
                  <Input type="number" className="font-mono" value={l.sent_qty || ''} onChange={e => updateLine(idx, { sent_qty: Number(e.target.value) })} />
                </div>
                <div className="col-span-3 space-y-1">
                  <Label className="text-xs">Source Godown</Label>
                  <Select
                    value={l.source_godown_id}
                    onValueChange={v => {
                      const g = godowns.find(g => g.id === v);
                      updateLine(idx, { source_godown_id: v, source_godown_name: g?.name ?? '' });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Source..." /></SelectTrigger>
                    <SelectContent>
                      {godowns.map(g => <SelectItem key={g.id} value={g.id}>{g.code} · {g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3 space-y-1">
                  <Label className="text-xs">Job-Work Godown</Label>
                  <Select
                    value={l.job_work_godown_id}
                    onValueChange={v => {
                      const g = godowns.find(g => g.id === v);
                      updateLine(idx, { job_work_godown_id: v, job_work_godown_name: g?.name ?? '' });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="JW Godown..." /></SelectTrigger>
                    <SelectContent>
                      {godowns.map(g => <SelectItem key={g.id} value={g.id}>{g.code} · {g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1">
                  <Button size="sm" variant="ghost" onClick={() => setLines(s => s.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4 space-y-1">
                  <Label className="text-xs">Expected Output Item</Label>
                  <Select
                    value={l.expected_output_item_id}
                    onValueChange={v => {
                      const it = items.find(i => i.id === v);
                      updateLine(idx, {
                        expected_output_item_id: v,
                        expected_output_item_code: it?.code ?? '',
                        expected_output_item_name: it?.name ?? '',
                        expected_output_uom: it?.primary_uom_symbol ?? 'NOS',
                      });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Output item..." /></SelectTrigger>
                    <SelectContent>
                      {items.map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.code} · {i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Output Qty</Label>
                  <Input type="number" className="font-mono" value={l.expected_output_qty || ''} onChange={e => updateLine(idx, { expected_output_qty: Number(e.target.value) })} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">JW Rate (₹)</Label>
                  <Input type="number" className="font-mono" value={l.job_work_rate || ''} onChange={e => updateLine(idx, { job_work_rate: Number(e.target.value) })} />
                </div>
                <div className="col-span-4 space-y-1">
                  <Label className="text-xs">Remarks</Label>
                  <Input value={l.remarks} onChange={e => updateLine(idx, { remarks: e.target.value })} />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => handleSave(false)}>
          <Save className="h-4 w-4 mr-2" /> Save Draft
        </Button>
        <Button onClick={() => handleSave(true)}>
          <Send className="h-4 w-4 mr-2" /> Save and Send
        </Button>
      </div>

      <Sprint27eMount
        entityCode={entityCode}
        voucherTypeId="vt-job-work-out-order"
        voucherTypeName="Job Work Out Order"
        defaultPartyType="vendor"
        partyId={vendorId || null}
        partyName={vendor?.partyName ?? null}
        lineItems={[]}
        onPartyCreated={() => { /* no-op */ }}
        onCloneTemplate={() => { /* no-op */ }}
      />
    </div>
  );
}

export default JobWorkOutEntryPanel;
