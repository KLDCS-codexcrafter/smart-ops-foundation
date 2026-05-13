/**
 * @file        src/pages/erp/servicedesk/customer-hub/CustomerSLAEnquiry.tsx
 * @purpose     C.1e · D-NEW-CY 4th consumer · FR-77 promotion ⭐
 * @sprint      T-Phase-1.C.1e · Block E.2
 * @iso         Usability + Functional Suitability
 */
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  getActiveCustomerTier,
  applyTierToSLAHours,
} from '@/lib/servicedesk-engine';
import { getSLAMatrixSettings } from '@/lib/cc-compliance-settings';
import { TIER_BENEFITS } from '@/types/customer-service-tier';

const ENTITY = 'OPRX';

export function CustomerSLAEnquiry({ customerId }: { customerId?: string | null }): JSX.Element {
  const cid = customerId ?? 'C-1';
  // [JWT] D-NEW-CY 4th consumer · cc-compliance-settings READ-ONLY
  const matrix = getSLAMatrixSettings(ENTITY);
  const tier = getActiveCustomerTier(cid, ENTITY);
  const benefits = tier ? TIER_BENEFITS[tier.tier] : null;
  const fasterPct = benefits ? Math.round((1 - benefits.sla_multiplier) * 100) : 0;

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold">Your SLA Targets</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customer <span className="font-mono">{cid}</span>
        </p>
      </div>

      <Card className="glass-card p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Your service tier</p>
          <p className="text-2xl font-semibold mt-1">{benefits?.label ?? 'Standard'}</p>
        </div>
        {fasterPct > 0 && <Badge variant="default">{fasterPct}% faster SLA</Badge>}
      </Card>

      <Card className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr className="text-left">
              <th className="p-3 font-medium">Call Type</th>
              <th className="p-3 font-medium">Severity</th>
              <th className="p-3 font-medium">Response</th>
              <th className="p-3 font-medium">Resolution</th>
            </tr>
          </thead>
          <tbody>
            {matrix.matrix.map((cell, i) => {
              const adjResp = applyTierToSLAHours(cell.response_hours, cid, ENTITY);
              const adjRes = applyTierToSLAHours(cell.resolution_hours, cid, ENTITY);
              return (
                <tr key={`${cell.call_type_code}-${cell.severity}-${i}`} className="border-b border-border/50">
                  <td className="p-3 font-mono text-xs">{cell.call_type_code}</td>
                  <td className="p-3 text-xs">{cell.severity}</td>
                  <td className="p-3 font-mono text-xs">within {adjResp}h</td>
                  <td className="p-3 font-mono text-xs">within {adjRes}h</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-muted-foreground">
        Your service tier determines response/resolution multipliers. Contact support to upgrade tier.
      </p>
    </div>
  );
}
