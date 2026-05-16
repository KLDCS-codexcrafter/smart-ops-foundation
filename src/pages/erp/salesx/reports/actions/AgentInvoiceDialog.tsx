/**
 * AgentInvoiceDialog.tsx — UPRA-1.1
 * Restores Agent GST Invoice reconciliation surface lost during UPRA-1 V2 extraction.
 * Lifted byte-identical from old CommissionRegister.tsx (HEAD 365dc19):
 *   - state hooks: lines 86-90
 *   - handleSaveAgentInvoice: lines 415-445 (7-field write path preserved)
 *   - input UI: lines 730-780 (5-field grid + 4 action buttons + variance block)
 *
 * [JWT] PATCH /api/salesx/commission-register
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  commissionRegisterKey,
  type CommissionEntry,
} from '@/types/commission-register';
import { dSub, round2 } from '@/lib/decimal-helpers';

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

export interface AgentInvoiceDialogProps {
  entry: CommissionEntry | null;
  open: boolean;
  onClose: () => void;
  entityCode: string;
  onSaved?: (updatedEntry: CommissionEntry) => void;
}

function loadRegister(entityCode: string): CommissionEntry[] {
  try {
    // [JWT] GET /api/salesx/commission-register?entityCode={entityCode}
    return JSON.parse(localStorage.getItem(commissionRegisterKey(entityCode)) || '[]');
  } catch { return []; }
}

function saveRegister(entityCode: string, list: CommissionEntry[]): void {
  // [JWT] PATCH /api/salesx/commission-register
  localStorage.setItem(commissionRegisterKey(entityCode), JSON.stringify(list));
}

export function AgentInvoiceDialog({
  entry, open, onClose, entityCode, onSaved,
}: AgentInvoiceDialogProps): JSX.Element | null {
  const [agentInvNo, setAgentInvNo] = useState('');
  const [agentInvDate, setAgentInvDate] = useState('');
  const [agentInvGross, setAgentInvGross] = useState('');
  const [agentInvGST, setAgentInvGST] = useState('');

  useEffect(() => {
    if (open && entry) {
      setAgentInvNo(entry.agent_invoice_no ?? '');
      setAgentInvDate(entry.agent_invoice_date ?? '');
      setAgentInvGross(entry.agent_invoice_gross_amount != null ? String(entry.agent_invoice_gross_amount) : '');
      setAgentInvGST(entry.agent_invoice_gst_amount != null ? String(entry.agent_invoice_gst_amount) : '');
    }
  }, [open, entry]);

  if (!entry) return null;

  const grossPreview = parseFloat(agentInvGross) || 0;
  const gstPreview = parseFloat(agentInvGST) || 0;
  const variancePreview = round2(dSub(dSub(grossPreview, gstPreview), entry.commission_earned_to_date));
  const variancePct = entry.commission_earned_to_date > 0
    ? round2((variancePreview / entry.commission_earned_to_date) * 100)
    : 0;
  const overThreshold = Math.abs(variancePct) > 5;

  const handleSaveAgentInvoice = (
    nextStatus: 'received' | 'reconciled' | 'disputed',
    reason?: string,
  ) => {
    const gross = Number(agentInvGross);
    const gst = Number(agentInvGST);
    if (!agentInvNo.trim()) { toast.error('Agent invoice number required'); return; }
    if (!gross || gross <= 0) { toast.error('Gross amount must be positive'); return; }
    const variance = round2(dSub(dSub(gross, gst), entry.commission_earned_to_date));
    const list = loadRegister(entityCode);
    const idx = list.findIndex(e => e.id === entry.id);
    if (idx < 0) return;
    list[idx] = {
      ...list[idx],
      agent_invoice_no: agentInvNo.trim(),
      agent_invoice_date: agentInvDate,
      agent_invoice_gross_amount: gross,
      agent_invoice_gst_amount: gst,
      agent_invoice_status: nextStatus,
      agent_invoice_variance: variance,
      agent_invoice_dispute_reason: reason ?? null,
      updated_at: new Date().toISOString(),
    };
    saveRegister(entityCode, list);
    setAgentInvNo('');
    setAgentInvGross('');
    setAgentInvGST('');
    toast.success(`Agent invoice ${nextStatus}`);
    onSaved?.(list[idx]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agent GST Invoice Reconciliation</DialogTitle>
          <DialogDescription>
            {entry.person_name} · Invoice {entry.voucher_no} · Commission earned ₹
            {inrFmt.format(entry.commission_earned_to_date)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Agent Invoice No</Label>
            <Input
              value={agentInvNo}
              onChange={e => setAgentInvNo(e.target.value)}
              placeholder="AGT/2025-26/0001"
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Agent Invoice Date</Label>
            <Input
              type="date"
              value={agentInvDate}
              onChange={e => setAgentInvDate(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Gross Amount ₹</Label>
            <Input
              type="number"
              step="0.01"
              value={agentInvGross}
              onChange={e => setAgentInvGross(e.target.value)}
              className="h-9 font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">GST Amount ₹</Label>
            <Input
              type="number"
              step="0.01"
              value={agentInvGST}
              onChange={e => setAgentInvGST(e.target.value)}
              className="h-9 font-mono"
            />
          </div>
        </div>

        <div className={cn(
          'rounded-md border px-3 py-2 text-xs',
          overThreshold
            ? 'bg-warning/10 border-warning/30 text-warning'
            : 'bg-muted/40 border-border text-muted-foreground',
        )}>
          <div className="flex justify-between font-mono">
            <span>Variance (Gross − GST − Earned):</span>
            <span>₹{inrFmt.format(variancePreview)} ({variancePct}%)</span>
          </div>
          {overThreshold && (
            <div className="mt-1">Variance exceeds 5% threshold — review or mark disputed.</div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSaveAgentInvoice('received')}
          >
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSaveAgentInvoice('reconciled')}
          >
            Reconcile
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleSaveAgentInvoice('disputed', 'Variance > 5%')}
          >
            Dispute
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
