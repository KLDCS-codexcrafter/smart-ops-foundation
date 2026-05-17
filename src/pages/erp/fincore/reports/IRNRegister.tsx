/**
 * IRNRegister.tsx — UPRA-4 Phase B · Tier-2 V2 in-place migration
 *
 * Migrated to UniversalRegisterGrid<IRNRecord>. Workflow shell (retry/cancel)
 * extracted byte-identical to IRNActionsDialog (M12 canonical precedent).
 * Bulk Generate retained inline — operates on the full record set.
 *
 * Export name preserved: IRNRegisterPanel · Props { entityCode } unchanged.
 * Consumer (FinCorePage.tsx) is 0-diff.
 *
 * [JWT] GET /api/fincore/irn/list?entity={code}
 * [JWT] POST /api/fincore/irn/generate (bulk)
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import type { RegisterColumn, RegisterMeta, StatusOption, SummaryCard }
  from '@/components/registers/UniversalRegisterTypes';
import {
  type IRNRecord, irnRecordsKey, IRN_CANCELLATION_WINDOW_HOURS,
} from '@/types/irn';
import type { Voucher } from '@/types/voucher';
import { entityGstKey, DEFAULT_ENTITY_GST_CONFIG, type EntityGSTConfig } from '@/types/entity-gst';
import { vouchersKey } from '@/lib/fincore-engine';
import {
  buildIRNPayload, generateIRN, type IRPCredentials,
} from '@/lib/irn-engine';
import { IRNActionsDialog, type IRNAction } from './actions/IRNActionsDialog';

interface Props { entityCode: string }

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

const STATUS_LABELS: Record<IRNRecord['status'], string> = {
  pending: 'Pending',
  generated: 'Generated',
  failed: 'Failed',
  cancelled: 'Cancelled',
};
const STATUS_COLORS: Record<IRNRecord['status'], string> = {
  pending: 'bg-muted text-muted-foreground',
  generated: 'bg-success/15 text-success border-success/30',
  failed: 'bg-destructive/15 text-destructive border-destructive/30',
  cancelled: 'bg-secondary text-secondary-foreground',
};

export function IRNRegisterPanel({ entityCode }: Props): JSX.Element {
  const [records, setRecords] = useState<IRNRecord[]>([]);
  const [action, setAction] = useState<IRNAction | null>(null);
  const [target, setTarget] = useState<IRNRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    setRecords(loadList<IRNRecord>(irnRecordsKey(entityCode)));
  }, [entityCode]);

  useEffect(() => { refresh(); }, [refresh]);

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

  const isWithinCancelWindow = useCallback((rec: IRNRecord): boolean => {
    if (!rec.ack_date) return false;
    const ageMs = Date.now() - new Date(rec.ack_date).getTime();
    return ageMs < IRN_CANCELLATION_WINDOW_HOURS * 3600 * 1000;
  }, []);

  const handleBulk = useCallback(async () => {
    const targets = records.filter(r => r.status === 'pending' || r.status === 'failed');
    if (targets.length === 0) { toast.info('No pending or failed IRNs to generate'); return; }
    setBusy(true);
    try {
      const vouchers = loadList<Voucher>(vouchersKey(entityCode));
      const supplierGst = loadOne<EntityGSTConfig>(
        entityGstKey(entityCode),
        { ...DEFAULT_ENTITY_GST_CONFIG, entity_id: entityCode },
      );
      const updates = await Promise.all(targets.map(async rec => {
        const v = vouchers.find(x => x.id === rec.voucher_id);
        if (!v) { toast.error(`Voucher ${rec.voucher_no} not found`); return rec; }
        const payload = buildIRNPayload(
          v,
          supplierGst.gstin, supplierGst.legal_name, supplierGst.address_line_1,
          supplierGst.city, supplierGst.pincode, supplierGst.state_code,
          v.party_gstin ?? '', v.party_name ?? '', v.party_name ?? '',
          '', '', v.customer_state_code ?? v.party_state_code ?? '',
        );
        const out = await generateIRN(payload, credentials, v, entityCode);
        return { ...out, id: rec.id } as IRNRecord;
      }));
      const map = new Map(updates.map(u => [u.id, u]));
      const next = records.map(r => map.get(r.id) ?? r);
      // [JWT] PUT /api/fincore/irn/bulk
      localStorage.setItem(irnRecordsKey(entityCode), JSON.stringify(next));
      setRecords(next);
      const ok = updates.filter(u => u.status === 'generated').length;
      toast.success(`Bulk Generate: ${ok}/${updates.length} succeeded`);
    } finally { setBusy(false); }
  }, [records, entityCode, credentials]);

  const meta: RegisterMeta<IRNRecord> = {
    registerCode: 'irn_register',
    title: 'IRN Register',
    description: 'All Invoice Reference Numbers generated for this entity. Sandbox mode if Test Mode is on.',
    dateAccessor: r => r.voucher_date,
  };

  const columns: RegisterColumn<IRNRecord>[] = [
    { key: 'voucher_no', label: 'Voucher', render: r => r.voucher_no, exportKey: 'voucher_no' },
    { key: 'date', label: 'Date', render: r => r.voucher_date.slice(0, 10), exportKey: 'voucher_date' },
    { key: 'customer', label: 'Customer', render: r => r.customer_name, exportKey: 'customer_name' },
    { key: 'value', label: 'Value', align: 'right',
      render: r => `₹${r.total_invoice_value.toLocaleString('en-IN')}`,
      exportKey: r => r.total_invoice_value },
    { key: 'irn', label: 'IRN', render: r => r.irn ?? '—', exportKey: r => r.irn ?? '' },
    { key: 'status', label: 'Status',
      render: r => <Badge variant="outline" className={STATUS_COLORS[r.status]}>{STATUS_LABELS[r.status]}</Badge>,
      exportKey: 'status' },
    { key: 'actions', label: 'Actions', align: 'right',
      render: r => (
        <div className="flex justify-end gap-1">
          {(r.status === 'pending' || r.status === 'failed') && (
            <Button variant="outline" size="sm" className="h-7 text-[10px]"
              onClick={() => { setTarget(r); setAction('retry'); }}>
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </Button>
          )}
          {r.status === 'generated' && isWithinCancelWindow(r) && (
            <Button variant="outline" size="sm" className="h-7 text-[10px] text-destructive"
              onClick={() => { setTarget(r); setAction('cancel'); }}>
              <X className="h-3 w-3 mr-1" /> Cancel
            </Button>
          )}
        </div>
      ) },
  ];

  const statusOptions: StatusOption[] = (Object.keys(STATUS_LABELS) as IRNRecord['status'][])
    .map(s => ({ value: s, label: STATUS_LABELS[s] }));

  const summaryBuilder = (f: IRNRecord[]): SummaryCard[] => [
    { label: 'Total', value: String(f.length) },
    { label: 'Generated', value: String(f.filter(r => r.status === 'generated').length), tone: 'positive' },
    { label: 'Pending', value: String(f.filter(r => r.status === 'pending').length) },
    { label: 'Failed', value: String(f.filter(r => r.status === 'failed').length), tone: 'negative' },
    { label: 'Cancelled', value: String(f.filter(r => r.status === 'cancelled').length) },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-6">
      <UniversalRegisterGrid<IRNRecord>
        entityCode={entityCode}
        meta={meta}
        rows={records}
        columns={columns}
        statusOptions={statusOptions}
        statusKey="status"
        summaryBuilder={summaryBuilder}
        customFilters={
          <Button data-primary size="sm" onClick={handleBulk} disabled={busy}>
            <Play className="h-3.5 w-3.5 mr-1" /> Bulk Generate
          </Button>
        }
      />
      <IRNActionsDialog
        entityCode={entityCode}
        record={target}
        action={action}
        open={!!target && !!action}
        onClose={() => { setTarget(null); setAction(null); }}
        onActionComplete={refresh}
      />
    </div>
  );
}
