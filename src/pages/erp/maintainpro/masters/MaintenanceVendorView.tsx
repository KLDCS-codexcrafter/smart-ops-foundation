/**
 * @file        src/pages/erp/maintainpro/masters/MaintenanceVendorView.tsx
 * @purpose     Read-only filter view of CC VendorMaster where vendor_type='service_provider' · FR-13 replica · FR-54 SSOT
 * @sprint      T-Phase-1.A.16a · Block E.5 · Q-LOCK-6 (founder May 12 SSOT discipline)
 */
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, ExternalLink, Info } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listMaintenanceVendors } from '@/lib/maintainpro-engine';

interface Props {
  onNavigate: (m: string) => void;
}

export function MaintenanceVendorView({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const items = entityCode ? listMaintenanceVendors(entityCode) : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building className="h-6 w-6 text-cyan-600" />
          <div>
            <h2 className="text-xl font-bold">Maintenance Vendor</h2>
            <p className="text-xs text-muted-foreground">
              Read-only replica view · maintained in Command Center Vendor Master
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => onNavigate('welcome')}>
          Back
        </Button>
      </div>

      <Card className="p-4 bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-900">
        <div className="flex items-start gap-3">
          <Info className="h-4 w-4 text-cyan-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              SSOT: Command Center · Vendor Master · Sundry Creditor ledger group · filter: vendor type = Service Provider
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Maintenance vendors are categorized under vendor type "Service Provider" in
              Command Center. Edit there to keep all modules in sync (FR-13 · FR-54).
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="/erp/command-center">
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Open Command Center
            </a>
          </Button>
        </div>
      </Card>

      <Card>
        {items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No vendors with type "Service Provider" yet. Add them in Command Center Vendor Master.
          </div>
        ) : (
          <div className="divide-y">
            {items.map((v) => (
              <div key={v.vendor_id} className="p-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">{v.vendor_code}</span>
                  <span className="text-sm font-medium">{v.vendor_name}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {v.contact_person} · {v.phone} ·{' '}
                  <span className="font-mono">{v.on_time_completion_pct}%</span> on-time
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
