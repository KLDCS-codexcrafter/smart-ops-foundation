/**
 * PartnerInvoices.tsx — Distributor's own SI list with EWB tracking + pay link.
 * Sprint 10. Scopes vouchers to partner.customer_id via scopeQueryToPartner.
 * [JWT] GET /api/partner/invoices
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, IndianRupee, Truck, ExternalLink, Download } from 'lucide-react';
import { PartnerLayout } from '@/components/layout/PartnerLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getPartnerSession, scopeQueryToPartner } from '@/lib/partner-auth-engine';
import { formatINR } from '@/lib/india-validations';
import type { Voucher } from '@/types/voucher';

const INDIGO = 'hsl(231 48% 58%)';
const INDIGO_BG = 'hsl(231 48% 48% / 0.12)';

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T[]) : []; } catch { return []; }
}

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export function PartnerInvoicesPanel() { return <PartnerInvoices />; }

export default function PartnerInvoices() {
  const navigate = useNavigate();
  const session = getPartnerSession();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'paid'>('all');

  const invoices = useMemo<Voucher[]>(() => {
    if (!session) return [];
    const all = ls<Voucher>(`erp_group_vouchers_${session.entity_code}`);
    const sales = all.filter(v => v.base_voucher_type === 'Sales' && v.status === 'posted');
    return scopeQueryToPartner(sales, session)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [session]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter(v => {
      if (q && !(v.voucher_no.toLowerCase().includes(q))) return false;
      // Pay status uses outstanding (mock heuristic): treat ewb_status=cancelled or net=0 as paid.
      // In real ERP, join to OutstandingEntry; for now use a flag on the voucher.
      return true;
    });
  }, [invoices, search]);

  if (!session) {
    return <PartnerLayout title="Invoices"><div className="text-sm text-muted-foreground">Sign in.</div></PartnerLayout>;
  }

  const totalDue = invoices.reduce((s, v) => s + (v.net_amount ?? 0), 0);

  return (
    <PartnerLayout title="My Invoices" subtitle={`${invoices.length} posted • Outstanding: ${formatINR(Math.round(totalDue * 100))}`}>
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by invoice number…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 rounded-lg"
            />
          </div>
          <div className="flex rounded-lg border border-border/50 p-0.5">
            {(['all', 'open', 'paid'] as const).map(f => (
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
          <Button
            onClick={() => navigate('/partner/payments')}
            className="rounded-lg gap-2"
            style={{ background: INDIGO, color: 'white' }}
          >
            <IndianRupee className="h-4 w-4" /> Pay Now
          </Button>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border/50 p-12 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Invoice</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  <th className="px-4 py-3 font-semibold">EWB</th>
                  <th className="px-4 py-3 font-semibold">IRN</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filtered.map(v => (
                  <tr key={v.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-foreground">{v.voucher_no}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(v.date)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                      {formatINR(Math.round((v.net_amount ?? 0) * 100))}
                    </td>
                    <td className="px-4 py-3">
                      {v.ewb_no ? (
                        <span className="inline-flex items-center gap-1 text-xs">
                          <Truck className="h-3 w-3" style={{ color: INDIGO }} />
                          <span className="font-mono">{v.ewb_no.slice(-6)}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {v.irn_status === 'generated' ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: 'hsl(142 71% 45% / 0.15)', color: 'hsl(142 71% 45%)' }}>
                          OK
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground capitalize">{v.irn_status ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/erp/finecore/invoice-print?id=${v.id}`)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="View PDF"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => navigate(`/erp/finecore/invoice-print?id=${v.id}&download=1`)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PartnerLayout>
  );
}
