/**
 * PartnerIntimationQueue.tsx — FineCore queue for accountants to verify partner
 * payment intimations and convert to Receipt vouchers. Sprint 10.
 * [JWT] GET /api/finecore/intimations + POST /api/finecore/intimations/:id/convert
 */
import { useMemo, useState } from 'react';
import {
  IndianRupee, CheckCircle2, XCircle, Clock, Search, FileCheck, Loader2,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatINR } from '@/lib/india-validations';
import {
  partnerIntimationsKey,
  type IntimationStatus, type PartnerPaymentIntimation,
} from '@/types/partner-order';

const INDIGO = 'hsl(231 48% 58%)';
const INDIGO_BG = 'hsl(231 48% 48% / 0.12)';

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T[]) : []; } catch { return []; }
}
function setLs<T>(k: string, v: T[]): void { localStorage.setItem(k, JSON.stringify(v)); }

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const statusBadge: Record<IntimationStatus, { bg: string; fg: string; label: string }> = {
  submitted: { bg: 'hsl(231 48% 48% / 0.15)', fg: INDIGO, label: 'Submitted' },
  verifying: { bg: 'hsl(38 92% 50% / 0.15)', fg: 'hsl(38 92% 50%)', label: 'Verifying' },
  converted: { bg: 'hsl(142 71% 45% / 0.15)', fg: 'hsl(142 71% 45%)', label: 'Converted' },
  rejected:  { bg: 'hsl(0 72% 51% / 0.15)', fg: 'hsl(0 72% 51%)', label: 'Rejected' },
  duplicate: { bg: 'hsl(215 16% 47% / 0.15)', fg: 'hsl(215 16% 47%)', label: 'Duplicate' },
};

export function PartnerIntimationQueuePanel() { return <PartnerIntimationQueue />; }

export default function PartnerIntimationQueue() {
  // Auto-detect entity (FineCore is per-entity).
  const entityCode = useMemo(() => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('erp_partner_payment_intimations_'));
    return keys[0]?.replace('erp_partner_payment_intimations_', '') ?? 'SMRT';
  }, []);

  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<IntimationStatus | 'all'>('all');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const all = useMemo<PartnerPaymentIntimation[]>(
    () => ls<PartnerPaymentIntimation>(partnerIntimationsKey(entityCode))
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [entityCode, refresh],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter(i => {
      if (filter !== 'all' && i.status !== filter) return false;
      if (!q) return true;
      return (
        i.partner_name.toLowerCase().includes(q) ||
        i.partner_code.toLowerCase().includes(q) ||
        (i.utr_no?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [all, filter, search]);

  const counts = useMemo(() => {
    const map: Record<IntimationStatus, number> = {
      submitted: 0, verifying: 0, converted: 0, rejected: 0, duplicate: 0,
    };
    all.forEach(i => { map[i.status] += 1; });
    return map;
  }, [all]);

  const totalPending = all
    .filter(i => i.status === 'submitted' || i.status === 'verifying')
    .reduce((s, i) => s + i.amount_paise, 0);

  const updateStatus = (id: string, patch: Partial<PartnerPaymentIntimation>) => {
    const list = ls<PartnerPaymentIntimation>(partnerIntimationsKey(entityCode));
    const next = list.map(i => i.id === id
      ? { ...i, ...patch, updated_at: new Date().toISOString() }
      : i);
    setLs(partnerIntimationsKey(entityCode), next);
    setRefresh(x => x + 1);
  };

  const handleVerify = (id: string) => {
    setBusy(id);
    updateStatus(id, { status: 'verifying', reviewed_at: new Date().toISOString(), reviewed_by: 'accountant' });
    toast.success('Marked as verifying');
    setBusy(null);
  };

  const handleConvert = (id: string) => {
    setBusy(id);
    // [JWT] POST /api/finecore/intimations/:id/convert → creates a Receipt voucher.
    const receiptId = `rcp_${Date.now()}`;
    updateStatus(id, {
      status: 'converted',
      linked_receipt_id: receiptId,
      reviewed_at: new Date().toISOString(),
      reviewed_by: 'accountant',
    });
    toast.success('Receipt voucher created', { description: `Linked: ${receiptId.slice(-8)}` });
    setBusy(null);
  };

  const handleReject = () => {
    if (!rejectId) return;
    updateStatus(rejectId, {
      status: 'rejected',
      rejection_reason: rejectReason || 'Not found in bank statement',
      reviewed_at: new Date().toISOString(),
      reviewed_by: 'accountant',
    });
    toast.success('Intimation rejected');
    setRejectId(null);
    setRejectReason('');
  };

  return (
    <AppLayout
      title="Partner Payment Intimations"
      breadcrumbs={[{ label: 'FineCore', href: '/erp/finecore' }, { label: 'Intimations' }]}
    >
      <div className="space-y-4 animate-fade-in">
        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Pending Amount" value={formatINR(totalPending)} accent={INDIGO} />
          <Kpi label="Submitted" value={String(counts.submitted)} accent={INDIGO} />
          <Kpi label="Verifying" value={String(counts.verifying)} accent="hsl(38 92% 50%)" />
          <Kpi label="Converted" value={String(counts.converted)} accent="hsl(142 71% 45%)" />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search partner or UTR…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 rounded-lg"
            />
          </div>
          <div className="flex rounded-lg border border-border/50 p-0.5">
            {(['all', 'submitted', 'verifying', 'converted', 'rejected'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize"
                style={filter === f ? { background: INDIGO_BG, color: INDIGO } : { color: 'hsl(215 16% 47%)' }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Queue */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border/50 p-12 text-center">
            <IndianRupee className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No intimations match.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Partner</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  <th className="px-4 py-3 font-semibold">Mode / UTR</th>
                  <th className="px-4 py-3 font-semibold">Paid On</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filtered.map(i => {
                  const s = statusBadge[i.status];
                  return (
                    <tr key={i.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{i.partner_name}</p>
                        <p className="text-[11px] font-mono text-muted-foreground">{i.partner_code}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                        {formatINR(i.amount_paise)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs uppercase font-semibold text-foreground">{i.mode}</p>
                        {(i.utr_no || i.cheque_no) && (
                          <p className="text-[11px] font-mono text-muted-foreground">{i.utr_no ?? i.cheque_no}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(i.paid_on)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: s.bg, color: s.fg }}>
                          {i.status === 'converted' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {s.label}
                        </span>
                        {i.linked_receipt_id && (
                          <p className="text-[10px] font-mono text-muted-foreground mt-1">
                            → {i.linked_receipt_id.slice(-8)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {i.status === 'submitted' && (
                          <div className="inline-flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy === i.id}
                              onClick={() => handleVerify(i.id)}
                              className="h-7 px-2 text-xs rounded-md"
                            >
                              Verify
                            </Button>
                            <Button
                              size="sm"
                              disabled={busy === i.id}
                              onClick={() => handleConvert(i.id)}
                              className="h-7 px-2 text-xs rounded-md gap-1"
                              style={{ background: INDIGO, color: 'white' }}
                            >
                              {busy === i.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileCheck className="h-3 w-3" />}
                              Convert
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRejectId(i.id)}
                              className="h-7 w-7 p-0 rounded-md"
                            >
                              <XCircle className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        )}
                        {i.status === 'verifying' && (
                          <Button
                            size="sm"
                            disabled={busy === i.id}
                            onClick={() => handleConvert(i.id)}
                            className="h-7 px-2 text-xs rounded-md gap-1"
                            style={{ background: INDIGO, color: 'white' }}
                          >
                            <FileCheck className="h-3 w-3" /> Convert
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!rejectId} onOpenChange={open => { if (!open) { setRejectId(null); setRejectReason(''); } }}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Reject intimation</DialogTitle></DialogHeader>
          <Textarea
            rows={3}
            placeholder="Reason (e.g. UTR not found in bank statement)"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            className="rounded-lg"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      <p className="text-lg font-bold font-mono mt-1" style={{ color: accent }}>{value}</p>
    </div>
  );
}
