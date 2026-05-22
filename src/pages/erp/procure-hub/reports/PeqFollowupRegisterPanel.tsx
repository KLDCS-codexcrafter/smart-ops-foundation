/**
 * @file        PeqFollowupRegisterPanel.tsx
 * @purpose     Read-only register · all open procurement enquiries with key timestamps.
 * @sprint      T-Phase-1.A.3.c-Procure360-OOB-Polish-PEQ-FU
 *              T-Phase-2.B-Procure360-Phase2-Polish-Part-B-ii-2 · Block A items 10 + 12
 * @decisions   D-NEW-AQ · D-NEW-GC remainder
 * @disciplines FR-19 · FR-30 · FR-50
 * @reuses      procurement-enquiry-engine · procure360-formatters (formatDateIN · debounce)
 * @[JWT]       n/a · register view
 */

import { useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { listEnquiries } from '@/lib/procurement-enquiry-engine';
import type { ProcurementEnquiry } from '@/types/procurement-enquiry';
import { formatDateIN, debounce } from '@/lib/procure360-formatters';

const fmtDate = (iso: string | null): string => formatDateIN(iso);

const ageDays = (iso: string): number => {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
};

const FINAL: ProcurementEnquiry['status'][] = ['cancelled', 'closed', 'rejected'];

export function PeqFollowupRegisterPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Item 10 · debounce search · 300ms
  const debouncedSetSearchTerm = useMemo(
    () => debounce((val: unknown) => setSearchTerm(String(val)), 300),
    [],
  );

  const items = useMemo<ProcurementEnquiry[]>(
    () => listEnquiries(entityCode).filter((e) => !FINAL.includes(e.status)),
    [entityCode],
  );

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const lower = searchTerm.toLowerCase();
    return items.filter((e) =>
      e.enquiry_no.toLowerCase().includes(lower) ||
      (e.department_id ?? '').toLowerCase().includes(lower) ||
      e.status.toLowerCase().includes(lower),
    );
  }, [items, searchTerm]);

  const kpis = useMemo(() => ({
    total: filteredItems.length,
    pendingQuotes: filteredItems.filter((e) => e.status === 'quotations_pending').length,
    pendingAward: filteredItems.filter((e) => e.status === 'award_pending').length,
    avgAge: filteredItems.length === 0
      ? 0
      : Math.round(filteredItems.reduce((s, e) => s + ageDays(e.created_at), 0) / filteredItems.length),
  }), [filteredItems]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">PEQ Followup Register</h1>
        <p className="text-sm text-muted-foreground">Open procurement enquiries · register view (read-only).</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Open</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-mono">{kpis.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending Quotations</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-mono">{kpis.pendingQuotes}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending Award</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-mono text-warning">{kpis.pendingAward}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg Days Open</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-mono">{kpis.avgAge}</div></CardContent>
        </Card>
      </div>

      <Input
        placeholder="Search by enquiry #, department, status..."
        value={searchInput}
        onChange={(e) => {
          setSearchInput(e.target.value);
          debouncedSetSearchTerm(e.target.value);
        }}
        className="max-w-sm"
      />

      <Card>
        <CardContent className="p-0">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No open enquiries.</div>
          ) : (
            <table className="w-full text-sm">
              {/* Item 12 · Institutional column order: ID → Date → Dept → Status → Days Open → Activity → Awarded At */}
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">Enquiry #</th>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Department</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-right p-2">Days Open</th>
                  <th className="text-right p-2">RFQs</th>
                  <th className="text-right p-2">Awarded</th>
                  <th className="text-left p-2">Awarded At</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="p-2 font-mono">{e.enquiry_no}</td>
                    <td className="p-2">{fmtDate(e.enquiry_date)}</td>
                    <td className="p-2 text-xs">{e.department_id ?? '—'}</td>
                    <td className="p-2"><Badge variant="secondary">{e.status}</Badge></td>
                    <td className="p-2 text-right font-mono">{ageDays(e.created_at)}</td>
                    <td className="p-2 text-right font-mono">{e.rfq_ids.length}</td>
                    <td className="p-2 text-right font-mono">{e.awarded_quotation_ids.length}</td>
                    <td className="p-2 text-xs">{fmtDate(e.awarded_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
