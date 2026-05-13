/**
 * @file        src/pages/erp/servicedesk/oem-claims/OEMClaimList.tsx
 * @purpose     C.1d · OEM Claim List · 5-state lifecycle · v7 OOB-26 Money Left On Table tracker
 * @sprint      T-Phase-1.C.1d · Block D.6
 * @decisions   D-NEW-DJ FR-75 5th consumer (Procure360 OEM Claim Recovery)
 * @iso         Functional Suitability + Usability
 */
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { listOEMClaims } from '@/lib/servicedesk-oem-engine';
import type { OEMClaimPacket, OEMClaimStatus } from '@/types/oem-claim';

const STATUS_VARIANT: Record<OEMClaimStatus, string> = {
  pending: 'border-muted text-muted-foreground',
  submitted: 'border-primary text-primary',
  approved: 'border-warning text-warning',
  paid: 'border-success text-success',
  rejected: 'border-destructive text-destructive',
};

function fmtParise(p: number): string {
  return `₹${(p / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

interface Props {
  onOpen: (id: string) => void;
}

export function OEMClaimList({ onOpen }: Props): JSX.Element {
  const [claims, setClaims] = useState<OEMClaimPacket[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OEMClaimStatus | 'all'>('all');

  useEffect(() => setClaims(listOEMClaims()), []);

  const filtered = useMemo(() => claims.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.claim_no.toLowerCase().includes(q) ||
      c.oem_name.toLowerCase().includes(q) ||
      c.spare_name.toLowerCase().includes(q)
    );
  }), [claims, search, statusFilter]);

  const totals = useMemo(() => {
    const claimed = claims.reduce((s, c) => s + c.total_claim_value_paise, 0);
    const recovered = claims
      .filter((c) => c.status === 'paid')
      .reduce((s, c) => s + c.paid_amount_paise, 0);
    const pending = claims
      .filter((c) => c.status === 'pending' || c.status === 'submitted' || c.status === 'approved')
      .reduce((s, c) => s + c.total_claim_value_paise, 0);
    const left_on_table = claims
      .filter((c) => c.status === 'rejected')
      .reduce((s, c) => s + c.total_claim_value_paise, 0);
    return { claimed, recovered, pending, left_on_table };
  }, [claims]);

  const statuses: (OEMClaimStatus | 'all')[] = ['all', 'pending', 'submitted', 'approved', 'paid', 'rejected'];

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold">OEM Claims · Warranty Recovery</h1>
        <p className="text-sm text-muted-foreground mt-1">
          v7 OOB-26 · tracks Money Left On Table · D-NEW-DJ 5th consumer (Procure360)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card p-4">
          <div className="text-xs text-muted-foreground">Total Claimed</div>
          <div className="text-xl font-mono mt-1">{fmtParise(totals.claimed)}</div>
        </Card>
        <Card className="glass-card p-4">
          <div className="text-xs text-muted-foreground">Recovered (paid)</div>
          <div className="text-xl font-mono mt-1 text-success">{fmtParise(totals.recovered)}</div>
        </Card>
        <Card className="glass-card p-4">
          <div className="text-xs text-muted-foreground">In-Flight</div>
          <div className="text-xl font-mono mt-1 text-primary">{fmtParise(totals.pending)}</div>
        </Card>
        <Card className="glass-card p-4">
          <div className="text-xs text-muted-foreground">Left on Table</div>
          <div className="text-xl font-mono mt-1 text-destructive">{fmtParise(totals.left_on_table)}</div>
        </Card>
      </div>

      <Card className="glass-card p-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            placeholder="Search by claim no, OEM, or spare…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <div className="flex gap-1">
            {statuses.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={statusFilter === s ? 'default' : 'outline'}
                onClick={() => setStatusFilter(s)}
                className="capitalize"
              >
                {s}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="glass-card overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {claims.length === 0 ? 'No OEM claims raised yet.' : 'No claims match the filters.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left p-3 font-medium">Claim No</th>
                <th className="text-left p-3 font-medium">OEM</th>
                <th className="text-left p-3 font-medium">Spare</th>
                <th className="text-right p-3 font-medium">Qty</th>
                <th className="text-right p-3 font-medium">Claim Value</th>
                <th className="text-center p-3 font-medium">Warranty</th>
                <th className="text-center p-3 font-medium">Status</th>
                <th className="text-right p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{c.claim_no}</td>
                  <td className="p-3">{c.oem_name}</td>
                  <td className="p-3">{c.spare_name}</td>
                  <td className="p-3 text-right font-mono">{c.qty}</td>
                  <td className="p-3 text-right font-mono">{fmtParise(c.total_claim_value_paise)}</td>
                  <td className="p-3 text-center text-xs">{c.warranty_period_status}</td>
                  <td className="p-3 text-center">
                    <Badge variant="outline" className={STATUS_VARIANT[c.status]}>
                      {c.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => onOpen(c.id)}>
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
