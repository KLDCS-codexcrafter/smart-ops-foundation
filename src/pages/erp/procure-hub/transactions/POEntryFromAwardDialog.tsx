/**
 * @file        src/pages/erp/procure-hub/transactions/POEntryFromAwardDialog.tsx
 * @purpose     Modal dialog · vendor admin selects an awarded quotation · captures delivery address +
 *              expected delivery days · calls createPOFromAward · navigates to new PO on success
 * @who         Internal procurement admin
 * @when        2026-05-19 (Sprint B.1)
 * @sprint      T-Phase-1.B-1-P2P-Workflow-Closure
 * @iso         ISO 25010 Functional Suitability · Usability
 * @whom        Audit Owner
 * @decisions   D-NEW-EJ Award → PO auto-creation pattern (B-Q2=B Award-PO-only) ·
 *              D-NEW-EK PO tier display from value via tierFor (B-Q3=B 3-tier shown · approval
 *              execution stays in PoListPanel which already has handleApprove wired)
 * @disciplines FR-30 · FR-50 · FR-58
 * @reuses      po-management-engine.createPOFromAward · approval-tier-helper.tierFor ·
 *              shadcn/ui Dialog + Form + Input + Button + Badge · CONSUME ONLY
 * @[JWT]       Phase 2: POST /api/po/from-award (currently consumes engine writing to localStorage)
 */
import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, FileCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { VendorQuotation } from '@/types/vendor-quotation';
import { createPOFromAward } from '@/lib/po-management-engine';
import { tierFor } from '@/lib/approval-tier-helper';
import { publishProcurementPulse } from '@/lib/procurement-pulse-stub';

interface POEntryFromAwardDialogProps {
  open: boolean;
  onClose: () => void;
  award: VendorQuotation | null;
  entityCode: string;
  onSuccess: (poNo: string) => void;
}

export function POEntryFromAwardDialog({
  open, onClose, award, entityCode, onSuccess,
}: POEntryFromAwardDialogProps): JSX.Element | null {
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [expectedDays, setExpectedDays] = useState<number>(30);
  const [busy, setBusy] = useState(false);

  if (!award) return null;

  const approvalTier = tierFor(award.total_after_tax, false);
  const tierLabel: Record<1 | 2 | 3, string> = {
    1: 'Tier 1 · Auto-approve up to ₹50k',
    2: 'Tier 2 · HOD approval ₹50k – ₹5L',
    3: 'Tier 3 · Director approval above ₹5L',
  };

  const handleCreate = async (): Promise<void> => {
    if (!deliveryAddress.trim()) {
      toast.error('Delivery address is required');
      return;
    }
    setBusy(true);
    try {
      const po = await createPOFromAward(award.id, entityCode, 'mock-user', {
        delivery_address: deliveryAddress.trim(),
        expected_delivery_days: expectedDays,
      });
      if (po) {
        toast.success(`PO ${po.po_no} created from award ${award.quotation_no}`);
        // Sprint B.2 · pulse publisher per B2-Q4=B (D-NEW-ET)
        publishProcurementPulse({
          severity: 'info',
          message: `PO ${po.po_no} created from award ${award.quotation_no} · awaiting approval`,
        });
        onSuccess(po.po_no);
        onClose();
      } else {
        toast.error('Could not create PO · quotation may not be awarded');
      }
    } catch (e) {
      toast.error(`Failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-emerald-600" />
            Create Purchase Order from Award
          </DialogTitle>
          <DialogDescription>
            Award · <span className="font-mono">{award.quotation_no}</span> · vendor{' '}
            <span className="font-medium">{award.vendor_name}</span> · value{' '}
            <span className="font-mono">
              ₹{new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(award.total_after_tax)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium">{tierLabel[approvalTier]}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  PO will be created in &lsquo;draft&rsquo; status. Open PO List to approve and send to vendor.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery-address">Delivery Address</Label>
            <Textarea
              id="delivery-address"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Full delivery address including pincode"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected-days">Expected Delivery Days</Label>
            <Input
              id="expected-days"
              type="number"
              value={expectedDays}
              min={1}
              max={365}
              onChange={(e) => setExpectedDays(Math.max(1, Math.min(365, Number(e.target.value) || 30)))}
            />
            <p className="text-[10px] text-muted-foreground">
              Days from PO date · default 30 · overrides quotation default if different
            </p>
          </div>

          <div className="rounded border border-blue-500/30 bg-blue-500/5 p-2">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-blue-600" />
              Saathi · Phase 2: auto-fill last-used address · multi-vendor split-PO flow
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={handleCreate} disabled={busy || !deliveryAddress.trim()}>
            {busy ? 'Creating PO...' : 'Create PO'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
