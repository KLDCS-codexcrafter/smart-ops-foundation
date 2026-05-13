/**
 * @file        src/pages/erp/servicedesk/amc-pipeline/AMCProposalList.tsx
 * @purpose     Q-LOCK-2 · 5-state proposal list with filter
 * @sprint      T-Phase-1.C.1b · Block D.2
 * @iso        Functional Suitability + Usability
 */
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { listAMCProposals } from '@/lib/servicedesk-engine';
import type { AMCProposal, AMCProposalStatus } from '@/types/servicedesk';

const STATUS_COLOR: Record<AMCProposalStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  negotiating: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  accepted: 'bg-success/15 text-success',
  rejected: 'bg-destructive/15 text-destructive',
};

interface Props {
  onOpen?: (id: string) => void;
}

export function AMCProposalList({ onOpen }: Props): JSX.Element {
  const [filter, setFilter] = useState<AMCProposalStatus | 'all'>('all');
  const [list, setList] = useState<AMCProposal[]>([]);

  useEffect(() => setList(listAMCProposals()), []);

  const filtered = useMemo(
    () =>
      [...list]
        .filter((p) => filter === 'all' || p.status === filter)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [list, filter],
  );

  const filters: (AMCProposalStatus | 'all')[] = ['all', 'draft', 'sent', 'negotiating', 'accepted', 'rejected'];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">AMC Proposals</h1>
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
            {f}
          </Button>
        ))}
      </div>
      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No proposals.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">OEM</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">{p.proposal_code}</td>
                  <td className="px-4 py-2">{p.customer_id}</td>
                  <td className="px-4 py-2">{p.oem_name}</td>
                  <td className="px-4 py-2">
                    <Badge className={STATUS_COLOR[p.status]}>{p.status}</Badge>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => onOpen?.(p.id)}>Open</Button>
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
