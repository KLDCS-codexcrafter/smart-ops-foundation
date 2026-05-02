/**
 * @file     CancellationAuditRegister.tsx — Q3-d UPGRADED forensic register
 * @sprint   T-Phase-2.7-c · Card #2.7 sub-sprint 3 of 5
 * @purpose  Register of every cancel action across 12 transaction forms with
 *           severity, impact, party, voucher type, and date filters. Backed by
 *           the UniversalRegisterGrid (sibling to FineCore RegisterGrid · D-127
 *           safe).
 */

import { useEffect, useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard } from '@/components/registers/UniversalRegisterTypes';
import { Badge } from '@/components/ui/badge';
import {
  cancellationAuditLogKey,
  type CancellationAuditEntry,
} from '@/types/cancellation-audit-log';

const inr = (n: number): string =>
  `₹ ${Math.round(n).toLocaleString('en-IN')}`;

const fmtDate = (iso: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

function severityBadge(s: 'high' | 'med' | 'low'): JSX.Element {
  if (s === 'high') return <Badge variant="destructive" className="text-[10px]">HIGH</Badge>;
  if (s === 'med')  return <Badge className="bg-warning/20 text-warning border-warning/40 text-[10px]">MED</Badge>;
  return <Badge variant="outline" className="text-[10px]">LOW</Badge>;
}

const IMPACT_LABEL: Record<string, string> = {
  'draft-only':            'Draft only',
  'posted-no-reversal':    'Posted · no reversal',
  'posted-gl-reversed':    'GL reversed',
  'posted-rcm-reversed':   'RCM reversed',
  'posted-stock-reversed': 'Stock reversed',
  'posted-multi-reversed': 'Multi reversed',
};

function daysBetween(a: string, b: string): number {
  const ta = Date.parse(a), tb = Date.parse(b);
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return 0;
  return Math.max(0, Math.round((tb - ta) / (1000 * 60 * 60 * 24)));
}

export default function CancellationAuditRegister(): JSX.Element {
  const entityCode = useEntityCode();
  const [rows, setRows] = useState<CancellationAuditEntry[]>([]);

  useEffect(() => {
    try {
      // [JWT] GET /api/cancellation-audit-log?entityCode=:entityCode
      const raw = localStorage.getItem(cancellationAuditLogKey(entityCode));
      setRows(raw ? (JSON.parse(raw) as CancellationAuditEntry[]) : []);
    } catch { setRows([]); }
  }, [entityCode]);

  const columns: RegisterColumn<CancellationAuditEntry>[] = useMemo(() => [
    { key: 'cancelled_at', label: 'Cancelled',     render: r => fmtDate(r.cancelled_at), exportKey: 'cancelled_at', width: 'w-28' },
    { key: 'voucher_no',   label: 'Voucher No',    render: r => <span className="font-mono">{r.voucher_no}</span>, exportKey: 'voucher_no', width: 'w-32' },
    { key: 'base_type',    label: 'Type',          render: r => r.base_voucher_type, exportKey: 'base_voucher_type', width: 'w-20' },
    { key: 'voucher_type', label: 'Voucher Class', render: r => r.voucher_type_name ?? '—', exportKey: 'voucher_type_name' },
    { key: 'party',        label: 'Party',         render: r => r.party_name ?? '—', exportKey: 'party_name' },
    { key: 'severity',     label: 'Severity',      render: r => severityBadge(r.severity), exportKey: 'severity', align: 'center', width: 'w-20' },
    { key: 'impact',       label: 'Impact',        render: r => IMPACT_LABEL[r.impact] ?? r.impact, exportKey: 'impact', width: 'w-32' },
    { key: 'amount',       label: 'Amount',        render: r => <span className="font-mono">{inr(r.total_amount)}</span>, exportKey: r => r.total_amount, align: 'right', width: 'w-32' },
    { key: 'reason',       label: 'Reason',        render: r => r.cancel_reason, exportKey: 'cancel_reason' },
    { key: 'cancelled_by', label: 'Cancelled By',  render: r => r.cancelled_by_name, exportKey: 'cancelled_by_name', width: 'w-32' },
  ], []);

  const meta: RegisterMeta<CancellationAuditEntry> = useMemo(() => ({
    registerCode: 'cancellation_audit_register',
    title: 'Cancellation Audit Register',
    description: 'Forensic log of every cancellation across transaction forms · severity-coded.',
    dateAccessor: r => (r.cancelled_at ?? '').slice(0, 10),
  }), []);

  const summaryBuilder = (filtered: CancellationAuditEntry[]): SummaryCard[] => {
    const high = filtered.filter(r => r.severity === 'high').length;
    const postedReversed = filtered.filter(r => r.was_posted_before_cancel).length;
    const avgDays = filtered.length === 0
      ? 0
      : Math.round(
          filtered.reduce((s, r) => s + daysBetween(r.voucher_date, r.cancelled_at), 0) /
          filtered.length,
        );
    return [
      { label: 'Total Cancellations',  value: String(filtered.length) },
      { label: 'High Severity',        value: String(high), tone: high > 0 ? 'negative' : 'neutral' },
      { label: 'Posted & Reversed',    value: String(postedReversed), tone: postedReversed > 0 ? 'warning' : 'neutral' },
      { label: 'Avg Days to Cancel',   value: `${avgDays}d` },
    ];
  };

  return (
    <div className="p-6 space-y-4">
      <UniversalRegisterGrid<CancellationAuditEntry>
        entityCode={entityCode}
        meta={meta}
        rows={rows}
        columns={columns}
        summaryBuilder={summaryBuilder}
        statusKey="severity"
        statusOptions={[
          { value: 'high', label: 'High severity' },
          { value: 'med',  label: 'Medium severity' },
          { value: 'low',  label: 'Low severity' },
        ]}
      />
    </div>
  );
}
