/**
 * @file     MaterialIssueEntry.tsx
 * @sprint   T-Phase-1.3-3a-pre-2-fix-1 (Card #2.7 12-item retrofit)
 * @purpose  Material Issue Note (MIN) entry panel — issue RM/components against a released PO.
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
import { PackageMinus, Save, Send, ExternalLink } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useProductionOrders } from '@/hooks/useProductionOrders';
import { useGodowns } from '@/hooks/useGodowns';
import { useSprint27d1Mount } from '@/hooks/useSprint27d1Mount';
import { useFormKeyboardShortcuts } from '@/hooks/useFormKeyboardShortcuts';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Sprint27d2Mount } from '@/components/uth/Sprint27d2Mount';
import { Sprint27eMount } from '@/components/uth/Sprint27eMount';
import { UseLastVoucherButton } from '@/components/uth/UseLastVoucherButton';
import { DraftRecoveryDialog } from '@/components/uth/DraftRecoveryDialog';
import { KeyboardShortcutOverlay } from '@/components/uth/KeyboardShortcutOverlay';
import { createMaterialIssue, issueMaterialIssue } from '@/lib/material-issue-engine';
import type { ProductionOrder } from '@/types/production-order';

export function MaterialIssueEntryPanel(): JSX.Element {
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

  const [poId, setPoId] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [departmentId, setDepartmentId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [lineQtys, setLineQtys] = useState<Record<string, number>>({});
  const [lineSourceGodown, setLineSourceGodown] = useState<Record<string, string>>({});

  const issuablePOs = useMemo<ProductionOrder[]>(
    () => orders.filter(o => o.status === 'released' || o.status === 'in_progress'),
    [orders],
  );
  const selectedPO = useMemo(() => issuablePOs.find(o => o.id === poId), [issuablePOs, poId]);

  const wipGodownId = selectedPO?.wip_godown_id ?? selectedPO?.output_godown_id ?? '';
  const wipGodownName = godowns.find(g => g.id === wipGodownId)?.name ?? 'WIP';

  const formStateForMount = useMemo(
    () => ({ poId, issueDate, departmentId, lineCount: Object.keys(lineQtys).length }),
    [poId, issueDate, departmentId, lineQtys],
  );
  const itemsForMount = useMemo(
    () => (selectedPO?.lines ?? []).map(l => ({ item_name: l.item_name, qty: lineQtys[l.id] ?? 0 })),
    [selectedPO, lineQtys],
  );
  const mount = useSprint27d1Mount({
    formKey: 'material-issue-note-entry',
    entityCode,
    formState: formStateForMount,
    items: itemsForMount,
    view: 'new',
    voucherType: 'vt-material-issue-note',
    userId: user?.id ?? undefined,
    partyId: undefined,
  });

  const handleSave = (issue: boolean) => {
    if (!selectedPO) { toast.error('Select a Production Order'); return; }
    if (!departmentId) { toast.error('Department required'); return; }

    const lines = selectedPO.lines
      .filter(l => (lineQtys[l.id] ?? 0) > 0)
      .map(l => {
        const srcId = lineSourceGodown[l.id] ?? selectedPO.source_godown_id ?? '';
        const srcName = godowns.find(g => g.id === srcId)?.name ?? 'Source';
        return {
          production_order_line_id: l.id,
          item_id: l.item_id,
          item_code: l.item_code,
          item_name: l.item_name,
          required_qty: l.required_qty,
          issued_qty: lineQtys[l.id],
          uom: l.uom,
          source_godown_id: srcId,
          source_godown_name: srcName,
          destination_godown_id: wipGodownId,
          destination_godown_name: wipGodownName,
          reservation_id: l.reservation_id,
          batch_no: l.batch_no,
          serial_nos: l.serial_nos,
          heat_no: l.heat_no,
          unit_rate: 0,
          remarks: '',
        };
      });

    if (lines.length === 0) { toast.error('Enter qty for at least one line'); return; }

    try {
      const min = createMaterialIssue({
        entity_id: entityCode,
        production_order: selectedPO,
        issue_date: issueDate,
        department_id: departmentId,
        department_name: selectedPO.department_name,
        issued_by_user_id: 'current-user',
        issued_by_name: 'Current User',
        lines,
        notes,
      });
      if (issue) {
        issueMaterialIssue(min, { id: 'current-user', name: 'Current User' });
        toast.success(`MIN ${min.doc_no} issued`);
      } else {
        toast.success(`MIN ${min.doc_no} saved as draft`);
      }
      setPoId('');
      setLineQtys({});
      setLineSourceGodown({});
      setNotes('');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <DraftRecoveryDialog
        formKey="material-issue-note-entry"
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
            <PackageMinus className="h-5 w-5 text-primary" />
            Material Issue Note
          </h1>
          <p className="text-sm text-muted-foreground">Issue RM/components against a released Production Order</p>
        </div>
        <UseLastVoucherButton
          entityCode={entityCode}
          recordType="material-issue-note"
          partyValue={null}
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
        formName="MaterialIssueEntry"
        entityCode={entityCode}
        items={itemsForMount as unknown as Array<Record<string, unknown>>}
        isLineItemForm={true}
      />

      <Card>
        <CardHeader><CardTitle className="text-base">Header</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Production Order</Label>
            <Select value={poId} onValueChange={setPoId}>
              <SelectTrigger><SelectValue placeholder="Select PO..." /></SelectTrigger>
              <SelectContent>
                {issuablePOs.map(o => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.doc_no} · {o.output_item_code} · {o.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Issue Date</Label>
            <Input type="date" className="font-mono" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Input value={departmentId} onChange={e => setDepartmentId(e.target.value)} placeholder="Department ID" />
          </div>
          <div className="space-y-2">
            <Label>Destination (WIP) Godown</Label>
            <Input readOnly value={wipGodownName} />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {selectedPO && (
        <Card>
          <CardHeader><CardTitle className="text-base">Components ({selectedPO.lines.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedPO.lines.map(l => {
                const remaining = Math.max(0, l.required_qty - l.issued_qty);
                return (
                  <div key={l.id} className="grid grid-cols-12 gap-2 items-end border rounded-md p-2">
                    <div className="col-span-4">
                      <div className="text-sm font-medium">{l.item_code}</div>
                      <div className="text-xs text-muted-foreground">{l.item_name}</div>
                    </div>
                    <div className="col-span-2 text-right font-mono text-sm">
                      <div className="text-xs text-muted-foreground">Req / Issued</div>
                      {l.required_qty.toFixed(2)} / {l.issued_qty.toFixed(2)} {l.uom}
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Source Godown</Label>
                      <Select
                        value={lineSourceGodown[l.id] ?? selectedPO.source_godown_id ?? ''}
                        onValueChange={v => setLineSourceGodown(s => ({ ...s, [l.id]: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Source..." /></SelectTrigger>
                        <SelectContent>
                          {godowns.map(g => (
                            <SelectItem key={g.id} value={g.id}>{g.code} · {g.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Issue Qty (max {remaining.toFixed(2)})</Label>
                      <Input
                        type="number"
                        min={0}
                        max={remaining}
                        className="font-mono"
                        value={lineQtys[l.id] ?? ''}
                        onChange={e => setLineQtys(s => ({ ...s, [l.id]: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="col-span-1 text-right text-xs text-muted-foreground">{l.uom}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => handleSave(false)}>
          <Save className="h-4 w-4 mr-2" /> Save Draft
        </Button>
        <Button onClick={() => handleSave(true)}>
          <Send className="h-4 w-4 mr-2" /> Save and Issue
        </Button>
      </div>
    </div>
  );
}

export default MaterialIssueEntryPanel;
