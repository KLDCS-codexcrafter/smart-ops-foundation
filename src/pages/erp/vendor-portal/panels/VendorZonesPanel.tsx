/**
 * @file        VendorZonesPanel.tsx
 * @sprint      T-VPG-VendorPortal-Gaps
 * @decisions   D-NEW-DN · honest-study: 'unrated' band shown when no source signal
 * @reuses      vendor-risk-compliance-engine (consume only)
 */
import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { listZones, recomputeAllZones } from '@/lib/vendor-risk-compliance-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import type { VendorZone, VendorZoneColor } from '@/types/vendor-zone';

const ZONE_STYLES: Record<VendorZoneColor, string> = {
  green: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  amber: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  red: 'bg-red-500/15 text-red-700 border-red-500/30',
  unrated: 'bg-muted text-muted-foreground border-border',
};

export function VendorZonesPanel(): JSX.Element {
  const entityCode = DEFAULT_ENTITY_SHORTCODE;
  const [zones, setZones] = useState<VendorZone[]>([]);

  useEffect(() => { setZones(listZones(entityCode)); }, [entityCode]);

  const counts = useMemo(() => {
    const c: Record<VendorZoneColor, number> = { green: 0, amber: 0, red: 0, unrated: 0 };
    zones.forEach((z) => { c[z.zone] += 1; });
    return c;
  }, [zones]);

  const handleRecompute = (): void => {
    const partyIds = Array.from(new Set(zones.map((z) => z.party_id)));
    setZones(recomputeAllZones(entityCode, partyIds));
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-6 h-6" /> Vendor Zones
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Green/Amber/Red bands derived from reliability + financial + risk signals. Honest study: vendors with no signal are shown as Unrated.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRecompute}>
          <RefreshCw className="w-4 h-4 mr-2" /> Recompute
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['green', 'amber', 'red', 'unrated'] as VendorZoneColor[]).map((band) => (
          <Card key={band}>
            <CardHeader className="pb-2">
              <CardDescription className="capitalize">{band}</CardDescription>
              <CardTitle className="font-mono text-3xl">{counts[band]}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Zone Roster</CardTitle>
        </CardHeader>
        <CardContent>
          {zones.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No zones computed yet. Run "Recompute" once vendor risk signals are present.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b text-muted-foreground">
                  <th className="py-2 pr-2">Vendor</th>
                  <th className="py-2 pr-2">Zone</th>
                  <th className="py-2 pr-2">Reason</th>
                  <th className="py-2 pr-2">Computed</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((z) => (
                  <tr key={z.id} className="border-b last:border-0">
                    <td className="py-2 pr-2 font-mono text-xs">{z.party_id}</td>
                    <td className="py-2 pr-2">
                      <Badge variant="outline" className={ZONE_STYLES[z.zone]}>{z.zone.toUpperCase()}</Badge>
                    </td>
                    <td className="py-2 pr-2 text-xs text-muted-foreground">{z.reason}</td>
                    <td className="py-2 pr-2 font-mono text-xs">{z.computed_at.slice(0, 10)}</td>
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
