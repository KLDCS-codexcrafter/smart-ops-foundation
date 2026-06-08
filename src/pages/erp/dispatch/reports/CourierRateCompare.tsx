/**
 * CourierRateCompare.tsx — 022 · Courier rate compare
 * Sprint A.4-Residual · CONSUMES TransporterRateCard via
 * dispatch-residual-engine.compareCourierRates. Honest empty when no cards.
 * Tier-L: rate-card driven only — no external APIs (Bucket-2 Wave-2).
 */
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PageFloorShell } from '@/components/shared/PageFloorShell';
import {
  compareCourierRates,
  type ShipmentSpec,
} from '@/lib/dispatch-residual-engine';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import {
  DEFAULT_ZONE_DEFINITIONS,
  type TransportMode,
  type ZoneCode,
} from '@/types/transporter-rate';

const MODES: TransportMode[] = ['surface', 'train', 'air'];

export function CourierRateComparePanel() {
  const { entityCode } = useCardEntitlement();
  const [zone, setZone] = useState<ZoneCode>('WEST_I');
  const [mode, setMode] = useState<TransportMode>('surface');
  const [weight, setWeight] = useState<number>(10);

  const shipment: ShipmentSpec = { zone, mode, weight_kg: weight };
  const rows = useMemo(
    () => compareCourierRates(entityCode, shipment),
    [entityCode, zone, mode, weight], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <PageFloorShell
      title="Courier Rate Compare"
      subtitle="Rate-card driven · ranked cheapest first · external courier APIs are Wave-2 (excluded)"
      isEmpty={rows.length === 0}
      emptyMessage="No matching rate cards. Add a transporter rate card in Logistic Profile."
      filterSlot={(
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Destination Zone</Label>
            <Select value={zone} onValueChange={(v) => setZone(v as ZoneCode)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEFAULT_ZONE_DEFINITIONS.map((z) => (
                  <SelectItem key={z.zone} value={z.zone}>{z.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as TransportMode)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODES.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Weight (kg)</Label>
            <Input
              type="number"
              min={0}
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value) || 0)}
              className="h-9 font-mono"
            />
          </div>
        </div>
      )}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Rate Card</TableHead>
            <TableHead className="text-xs text-right">Charge Wt</TableHead>
            <TableHead className="text-xs text-right">₹/kg</TableHead>
            <TableHead className="text-xs text-right">Freight (₹)</TableHead>
            <TableHead className="text-xs text-right">Transit (d)</TableHead>
            <TableHead className="text-xs">Pick</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={r.rate_card_id}>
              <TableCell className="text-xs">{r.label}</TableCell>
              <TableCell className="text-right font-mono text-xs">{r.chargeable_weight}</TableCell>
              <TableCell className="text-right font-mono text-xs">{r.rate_per_kg}</TableCell>
              <TableCell className="text-right font-mono text-xs">{r.freight_amount}</TableCell>
              <TableCell className="text-right font-mono text-xs">
                {r.transit_days_min}–{r.transit_days_max}
              </TableCell>
              <TableCell>
                {i === 0 && (<Badge className="text-[10px]">cheapest</Badge>)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PageFloorShell>
  );
}

export default CourierRateComparePanel;
