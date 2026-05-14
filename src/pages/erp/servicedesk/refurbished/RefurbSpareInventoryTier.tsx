/**
 * @file        src/pages/erp/servicedesk/refurbished/RefurbSpareInventoryTier.tsx
 * @purpose     S30 Refurb Spare Tier · Tier A/B/C filter · Phase 1 notes-based · FT-SDESK-001 upgrades
 * @sprint      T-Phase-1.C.1f · Block G.1
 * @iso         Functional Suitability
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { listSparesByTier } from '@/lib/servicedesk-engine';

const ENTITY = 'OPRX';

export function RefurbSpareInventoryTier(): JSX.Element {
  const [tier, setTier] = useState<'A' | 'B' | 'C'>('A');
  const spares = listSparesByTier(tier, ENTITY);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Refurb Spare Inventory · Tier</h1>
        <p className="text-sm text-muted-foreground">
          S30 Tier 2 OOB · Phase 1 notes-based filter (FT-SDESK-001 wires real tier_grade)
        </p>
      </div>

      <Tabs value={tier} onValueChange={(v) => setTier(v as 'A' | 'B' | 'C')}>
        <TabsList>
          <TabsTrigger value="A">Tier A</TabsTrigger>
          <TabsTrigger value="B">Tier B</TabsTrigger>
          <TabsTrigger value="C">Tier C</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="p-0 overflow-hidden">
        {spares.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No Tier {tier} spares yet · add <code className="font-mono">[TIER:{tier}]</code> to spare notes to mark.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="p-3 font-medium">Spare</th>
                <th className="p-3 font-medium">Qty</th>
                <th className="p-3 font-medium">Cost ₹</th>
                <th className="p-3 font-medium">Tier</th>
              </tr>
            </thead>
            <tbody>
              {spares.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3">{s.spare_name}</td>
                  <td className="p-3 font-mono">{s.qty}</td>
                  <td className="p-3 font-mono">{(s.total_cost_paise / 100).toFixed(2)}</td>
                  <td className="p-3"><Badge variant="outline">Tier {tier}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
