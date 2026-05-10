/**
 * @file        src/pages/erp/qualicheck/reports/WelderRegister.tsx
 * @purpose     Welder register · search · WPQ count per welder · qualification status badges
 * @who         QA Manager · Welding Engineer
 * @when        2026-05-09
 * @sprint      T-Phase-1.A.5.c-QualiCheck-Welder-Vendor-ISO-IQC · T-Phase-1.A.5.c-T3-AuditFix · header backfill
 * @iso         ASME IX · AWS D1.1 · ISO 9001:2015 · ISO 25010 Maintainability
 * @whom        Audit Owner
 * @decisions   D-NEW-BN · T3 header hygiene
 * @disciplines FR-30 (canonical header) · FR-50 (entity-scoped reads)
 * @reuses      welder-engine.filterWelders · listWpq · QUAL_STATUS_LABELS
 * @[JWT]       reads via filterWelders/listWpq · localStorage erp_welder_${entityCode} · erp_wpq_${entityCode}
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useEntityCode } from '@/hooks/useEntityCode';
import { filterWelders, listWpq } from '@/lib/welder-engine';
import { QUAL_STATUS_LABELS } from '@/types/welder';

export function WelderRegister(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [search, setSearch] = useState('');
  const welders = filterWelders(entityCode, { search });
  const wpqs = listWpq(entityCode);
  const wpqByWelder = new Map<string, number>();
  wpqs.forEach((w) => wpqByWelder.set(w.related_welder_id, (wpqByWelder.get(w.related_welder_id) ?? 0) + 1));

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welder Register</h1>
        <p className="text-sm text-muted-foreground mt-1">All qualified welders · Entity {entityCode}</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent>
          <Input placeholder="Search by name / party / employee code"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </CardContent>
      </Card>
      <div className="border rounded-lg divide-y">
        <div className="p-3 grid grid-cols-5 text-xs text-muted-foreground bg-muted/40">
          <span>ID</span><span>Name</span><span>Party</span><span>WPQs</span><span>Active</span>
        </div>
        {welders.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No welders match filter.</div>
        ) : welders.map((w) => (
          <div key={w.id} className="p-3 grid grid-cols-5 text-sm">
            <span className="font-mono">{w.id}</span>
            <span>{w.full_name}</span>
            <span className="font-mono">{w.party_id}</span>
            <span className="font-mono">{wpqByWelder.get(w.id) ?? 0}</span>
            <Badge variant={w.active ? 'default' : 'secondary'}>
              {w.active ? QUAL_STATUS_LABELS.qualified : 'Inactive'}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
