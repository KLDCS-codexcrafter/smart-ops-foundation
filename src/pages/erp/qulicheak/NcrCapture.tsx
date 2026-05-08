/**
 * @file src/pages/erp/qulicheak/NcrCapture.tsx
 * @purpose Manual NCR entry form · FR-29 carry-forward mounts (11 of 12 available)
 * @who Quality Inspector · QA Manager
 * @when 2026-05-08
 * @sprint T-Phase-1.A.5.a-bis-Qulicheak-NCR-Foundation
 * @iso 25010 Usability + Operability
 * @whom Quality Inspector
 * @decisions D-NEW-AV (NCR engine NEW)
 * @disciplines FR-29 (Carry-forward · 11/12 mounts; useSmartDefaults missing in tree) ·
 *              FR-50 (Multi-Entity 6-point) · FR-51 (Multi-Branch) ·
 *              FR-21 (no banned patterns)
 * @reuses ncr-engine.raiseNcr · decimal-helpers (dMul · round2) ·
 *         useEntityCode · useEntityChangeEffect · useCurrentUser
 * @[JWT] localStorage via raiseNcr · POST /api/qulicheak/ncrs
 */
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityChangeEffect } from '@/hooks/useEntityChangeEffect';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { round2 } from '@/lib/decimal-helpers';
import { raiseNcr } from '@/lib/ncr-engine';
import {
  NCR_SOURCE_LABELS,
  NCR_SEVERITY_LABELS,
  type NcrSource,
  type NcrSeverity,
} from '@/types/ncr';

interface Props {
  onSaved?: () => void;
  onCancel?: () => void;
}

const SOURCE_OPTIONS: NcrSource[] = ['iqc', 'inprocess', 'fg', 'customer_complaint', 'audit'];
const SEVERITY_OPTIONS: NcrSeverity[] = ['minor', 'major', 'critical'];

const initial = (): {
  source: NcrSource;
  severity: NcrSeverity;
  partyId: string;
  partyName: string;
  voucherKind: 'none' | 'grn' | 'production_confirmation' | 'sales_invoice';
  voucherId: string;
  itemId: string;
  itemName: string;
  qtyAffected: string;
  description: string;
  immediateAction: string;
  branchId: string;
} => ({
  source: 'iqc',
  severity: 'major',
  partyId: '',
  partyName: '',
  voucherKind: 'none',
  voucherId: '',
  itemId: '',
  itemName: '',
  qtyAffected: '',
  description: '',
  immediateAction: '',
  branchId: '',
});

export function NcrCapture({ onSaved, onCancel }: Props): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const user = useCurrentUser();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  // FR-50 6-point · reset on entity switch
  useEntityChangeEffect(() => setForm(initial()), []);

  const set = <K extends keyof ReturnType<typeof initial>>(
    key: K,
    val: ReturnType<typeof initial>[K],
  ): void => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = useCallback((): void => {
    if (!form.description.trim()) {
      toast.error('Description is required');
      return;
    }
    if (!user) {
      toast.error('User session not found');
      return;
    }
    setSaving(true);
    try {
      const qty = form.qtyAffected.trim()
        ? round2(Number(form.qtyAffected) || 0)
        : null;

      const ncr = raiseNcr(entityCode, user.id, {
        entity_id: entityId,
        branch_id: form.branchId.trim() || null,
        source: form.source,
        severity: form.severity,
        related_party_id: form.partyId.trim() || null,
        related_party_name: form.partyName.trim() || null,
        related_voucher_kind: form.voucherKind === 'none' ? null : form.voucherKind,
        related_voucher_id: form.voucherId.trim() || null,
        item_id: form.itemId.trim() || null,
        item_name: form.itemName.trim() || null,
        qty_affected: qty,
        description: form.description.trim(),
        immediate_action: form.immediateAction.trim() || null,
      });
      toast.success(`NCR ${ncr.id} raised`);
      setForm(initial());
      onSaved?.();
    } catch {
      toast.error('Failed to raise NCR');
    } finally {
      setSaving(false);
    }
  }, [form, user, entityCode, entityId, onSaved]);

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Raise NCR</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Capture a non-conformance · Entity {entityCode}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Classification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2 block">Source</Label>
            <RadioGroup
              value={form.source}
              onValueChange={(v) => set('source', v as NcrSource)}
              className="grid grid-cols-2 md:grid-cols-5 gap-2"
            >
              {SOURCE_OPTIONS.map((s) => (
                <Label
                  key={s}
                  htmlFor={`src-${s}`}
                  className="flex items-center gap-2 border rounded-lg p-2 cursor-pointer hover:bg-muted/50"
                >
                  <RadioGroupItem value={s} id={`src-${s}`} />
                  <span className="text-sm">{NCR_SOURCE_LABELS[s]}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label className="mb-2 block">Severity</Label>
            <RadioGroup
              value={form.severity}
              onValueChange={(v) => set('severity', v as NcrSeverity)}
              className="flex gap-2"
            >
              {SEVERITY_OPTIONS.map((s) => (
                <Label
                  key={s}
                  htmlFor={`sev-${s}`}
                  className="flex items-center gap-2 border rounded-lg p-2 cursor-pointer hover:bg-muted/50"
                >
                  <RadioGroupItem value={s} id={`sev-${s}`} />
                  <span className="text-sm">{NCR_SEVERITY_LABELS[s]}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">References (optional)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="party-id">Related Party ID</Label>
            <Input
              id="party-id"
              value={form.partyId}
              onChange={(e) => set('partyId', e.target.value)}
              placeholder="VEND-001 / CUST-001"
            />
          </div>
          <div>
            <Label htmlFor="party-name">Party Name</Label>
            <Input
              id="party-name"
              value={form.partyName}
              onChange={(e) => set('partyName', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="vk">Voucher Kind</Label>
            <Select value={form.voucherKind} onValueChange={(v) => set('voucherKind', v as typeof form.voucherKind)}>
              <SelectTrigger id="vk"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                <SelectItem value="grn">GRN</SelectItem>
                <SelectItem value="production_confirmation">Production Confirmation</SelectItem>
                <SelectItem value="sales_invoice">Sales Invoice</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="voucher-id">Voucher ID</Label>
            <Input
              id="voucher-id"
              value={form.voucherId}
              onChange={(e) => set('voucherId', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="item-id">Item ID</Label>
            <Input id="item-id" value={form.itemId} onChange={(e) => set('itemId', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="item-name">Item Name</Label>
            <Input id="item-name" value={form.itemName} onChange={(e) => set('itemName', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="qty">Qty Affected</Label>
            <Input
              id="qty"
              type="number"
              inputMode="decimal"
              value={form.qtyAffected}
              onChange={(e) => set('qtyAffected', e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="branch">Branch ID</Label>
            <Input
              id="branch"
              value={form.branchId}
              onChange={(e) => set('branchId', e.target.value)}
              placeholder="optional"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="desc">Description <span className="text-destructive">*</span></Label>
            <Textarea
              id="desc"
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Describe the non-conformance"
            />
          </div>
          <div>
            <Label htmlFor="action">Immediate Action</Label>
            <Textarea
              id="action"
              rows={2}
              value={form.immediateAction}
              onChange={(e) => set('immediateAction', e.target.value)}
              placeholder="Containment / segregation / quarantine"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Raising…' : 'Raise NCR'}
        </Button>
      </div>
    </div>
  );
}
