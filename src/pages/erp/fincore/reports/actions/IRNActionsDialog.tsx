/**
 * IRNActionsDialog.tsx — UPRA-4 Phase B · M12 canonical precedent
 *
 * Workflow shell extracted byte-identical from IRNRegister.tsx (357 LOC).
 *
 * BEHAVIOUR PARITY ATTESTATION (source: IRNRegister.tsx pre-V2):
 * - Retry: identical to source `handleRetry` · loads voucher · buildIRNPayload ·
 *   generateIRN · merges by id · persists via localStorage.setItem(irnRecordsKey) ·
 *   toast.success(`IRN generated for ${voucher_no}`) or toast.error(`IRN failed: ${message}`)
 * - Cancel: identical to source `submitCancel` · cancelIRN(irn, reason, remarks, credentials) ·
 *   merges patch into record · persists · toast.success('IRN cancelled') · validation
 *   toast.error('Remarks must be at least 10 characters') preserved verbatim
 * - Credentials sourcing identical · entityGstKey + DEFAULT_ENTITY_GST_CONFIG
 *
 * [JWT] POST /api/fincore/irn/generate
 * [JWT] POST /api/fincore/irn/cancel
 */

import { useCallback, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { RefreshCw, Shield, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  type IRNRecord, irnRecordsKey, IRN_CANCEL_REASONS, IRN_CANCELLATION_WINDOW_HOURS,
} from '@/types/irn';
import type { Voucher } from '@/types/voucher';
import { entityGstKey, DEFAULT_ENTITY_GST_CONFIG, type EntityGSTConfig } from '@/types/entity-gst';
import { vouchersKey } from '@/lib/fincore-engine';
import {
  buildIRNPayload, generateIRN, cancelIRN, type IRPCredentials,
} from '@/lib/irn-engine';

export type IRNAction = 'retry' | 'cancel';

export interface IRNActionsDialogProps {
  entityCode: string;
  record: IRNRecord | null;
  action: IRNAction | null;
  open: boolean;
  onClose: () => void;
  onActionComplete?: (updated: IRNRecord) => void;
}

function loadOne<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function loadList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}

export function IRNActionsDialog(props: IRNActionsDialogProps): JSX.Element | null {
  const { entityCode, record, action, open, onClose, onActionComplete } = props;
  const [cancelReason, setCancelReason] = useState('1');
  const [cancelRemarks, setCancelRemarks] = useState('');
  const [busy, setBusy] = useState(false);

  const credentials = useMemo<IRPCredentials>(() => {
    const gst = loadOne<EntityGSTConfig>(
      entityGstKey(entityCode),
      { ...DEFAULT_ENTITY_GST_CONFIG, entity_id: entityCode },
    );
    return {
      username: gst.irp_username,
      password: gst.irp_password,
      client_id: gst.irp_client_id,
      client_secret: gst.irp_client_secret,
      gsp_provider: gst.gsp_provider,
      test_mode: gst.irp_test_mode,
    };
  }, [entityCode]);

  const resetAndClose = useCallback(() => {
    setCancelReason('1');
    setCancelRemarks('');
    onClose();
  }, [onClose]);

  const handleRetry = useCallback(async () => {
    if (!record) return;
    setBusy(true);
    try {
      const vouchers = loadList<Voucher>(vouchersKey(entityCode));
      const v = vouchers.find(x => x.id === record.voucher_id);
      if (!v) { toast.error(`Voucher ${record.voucher_no} not found`); return; }
      const supplierGst = loadOne<EntityGSTConfig>(
        entityGstKey(entityCode),
        { ...DEFAULT_ENTITY_GST_CONFIG, entity_id: entityCode },
      );
      const payload = buildIRNPayload(
        v,
        supplierGst.gstin,
        supplierGst.legal_name,
        supplierGst.address_line_1,
        supplierGst.city,
        supplierGst.pincode,
        supplierGst.state_code,
        v.party_gstin ?? '',
        v.party_name ?? '',
        v.party_name ?? '',
        '',
        '',
        v.customer_state_code ?? v.party_state_code ?? '',
      );
      const out = await generateIRN(payload, credentials, v, entityCode);
      const updated: IRNRecord = { ...out, id: record.id };
      const all = loadList<IRNRecord>(irnRecordsKey(entityCode));
      const next = all.map(r => r.id === record.id ? updated : r);
      // [JWT] PUT /api/fincore/irn/bulk
      localStorage.setItem(irnRecordsKey(entityCode), JSON.stringify(next));
      if (updated.status === 'generated') toast.success(`IRN generated for ${record.voucher_no}`);
      else toast.error(`IRN failed: ${updated.error_message ?? 'unknown'}`);
      onActionComplete?.(updated);
      resetAndClose();
    } finally { setBusy(false); }
  }, [record, entityCode, credentials, onActionComplete, resetAndClose]);

  const handleCancel = useCallback(async () => {
    if (!record || !record.irn) return;
    if (cancelRemarks.trim().length < 10) {
      toast.error('Remarks must be at least 10 characters');
      return;
    }
    setBusy(true);
    try {
      const patch = await cancelIRN(record.irn, cancelReason, cancelRemarks.trim(), credentials);
      const all = loadList<IRNRecord>(irnRecordsKey(entityCode));
      const next = all.map(r => r.id === record.id ? { ...r, ...patch } as IRNRecord : r);
      // [JWT] PUT /api/fincore/irn/bulk
      localStorage.setItem(irnRecordsKey(entityCode), JSON.stringify(next));
      toast.success('IRN cancelled');
      const updated = next.find(r => r.id === record.id);
      if (updated) onActionComplete?.(updated);
      resetAndClose();
    } finally { setBusy(false); }
  }, [record, cancelReason, cancelRemarks, credentials, entityCode, onActionComplete, resetAndClose]);

  if (!record || !action) return null;

  if (action === 'retry') {
    return (
      <Dialog open={open} onOpenChange={o => !o && resetAndClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" /> Retry IRN Generation
            </DialogTitle>
            <DialogDescription>
              Re-submit voucher {record.voucher_no} to the IRP. Status will update to Generated on success.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={resetAndClose} disabled={busy}>Cancel</Button>
            <Button data-primary onClick={handleRetry} disabled={busy}>
              <RefreshCw className="h-4 w-4 mr-1" /> Retry Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // cancel
  return (
    <Dialog open={open} onOpenChange={o => !o && resetAndClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-destructive" /> Cancel IRN
          </DialogTitle>
          <DialogDescription>
            Cancellation can only be done within {IRN_CANCELLATION_WINDOW_HOURS} hours of generation.
            This is logged at the GSTN portal.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Reason</Label>
            <Select value={cancelReason} onValueChange={setCancelReason}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {IRN_CANCEL_REASONS.map(r => (
                  <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Remarks (min 10 chars)</Label>
            <Textarea
              value={cancelRemarks}
              onChange={e => setCancelRemarks(e.target.value)}
              rows={3}
              placeholder="Why is this IRN being cancelled?"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              {cancelRemarks.trim().length}/10 characters
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose} disabled={busy}>Close</Button>
          <Button data-primary variant="destructive" onClick={handleCancel}
            disabled={busy || cancelRemarks.trim().length < 10}>
            <X className="h-4 w-4 mr-1" /> Cancel IRN
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default IRNActionsDialog;
