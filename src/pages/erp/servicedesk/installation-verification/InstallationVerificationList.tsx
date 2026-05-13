/**
 * @file        src/pages/erp/servicedesk/installation-verification/InstallationVerificationList.tsx
 * @purpose     Q-LOCK-4 · Installation Verification list (NEW canonical type)
 * @sprint      T-Phase-1.C.1b · Block E.1
 * @iso        Functional Suitability + Usability
 */
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { listInstallationVerifications } from '@/lib/servicedesk-engine';
import type { InstallationVerification, InstallationVerificationStatus } from '@/types/servicedesk';

const checklistProgress = (v: InstallationVerification): string => {
  const flags = [
    v.functional_check_passed,
    v.spare_inventory_verified,
    v.service_tier_config_verified,
    v.customer_briefing_done,
    v.emergency_contact_shared,
    v.documentation_handed_over,
    v.customer_acknowledgement,
  ];
  return `${flags.filter(Boolean).length}/7`;
};

interface Props {
  onOpen?: (id: string) => void;
}

export function InstallationVerificationList({ onOpen }: Props): JSX.Element {
  const [filter, setFilter] = useState<InstallationVerificationStatus | 'all'>('all');
  const [list, setList] = useState<InstallationVerification[]>([]);
  useEffect(() => setList(listInstallationVerifications()), []);

  const filtered = useMemo(
    () => list.filter((v) => filter === 'all' || v.status === filter),
    [list, filter],
  );

  const filters: (InstallationVerificationStatus | 'all')[] = ['all', 'pending', 'in_progress', 'verified', 'failed'];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Installation Verifications</h1>
      <p className="text-sm text-muted-foreground">
        7-point checklist · proves AMC contract terms observable at customer site. AMC kickoff blocked until verified.
      </p>
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
            {f}
          </Button>
        ))}
      </div>
      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No verifications.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-4 py-2">AMC</th>
                <th className="px-4 py-2">Site Visit</th>
                <th className="px-4 py-2">Checklist</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Verified</th>
                <th className="px-4 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">{v.amc_record_id.slice(0, 14)}</td>
                  <td className="px-4 py-2 font-mono text-xs">{v.site_visit_date}</td>
                  <td className="px-4 py-2 font-mono">{checklistProgress(v)}</td>
                  <td className="px-4 py-2"><Badge variant="outline">{v.status}</Badge></td>
                  <td className="px-4 py-2 font-mono text-xs">{v.verified_at?.slice(0, 10) ?? '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => onOpen?.(v.id)}>Open</Button>
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
