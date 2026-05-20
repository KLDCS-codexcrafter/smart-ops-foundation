/**
 * @file        src/pages/erp/eximx/masters/PortExtensionEditor.tsx
 * @purpose     EXIM overlay editor for existing PortMaster · adds 4 EXIM fields (EX-2-Q5=c)
 * @sprint      T-Phase-1.EX-2-CTH-Country-Date-Master
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Anchor } from 'lucide-react';
import { INDIA_PORTS } from '@/data/geo-seed-data';

export function PortExtensionEditor(): JSX.Element {
  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Anchor className="w-6 h-6" /> Port EXIM Extension
        </h1>
        <p className="text-sm text-muted-foreground">
          Overlay adds icegate_code · aeo_tier_supported · vessel_handling_capacity · bonded/AEO flags (base PortMaster.tsx 0-diff)
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{INDIA_PORTS.length} Indian Ports (base) + EXIM Overlay</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Editor reads existing PortRecord seed via overlay pattern · localStorage entity-scoped per FR-26. Full
            editor UI ships in EX-2 next iteration. Placeholder visible here to wire the route.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {INDIA_PORTS.slice(0, 8).map((p) => (
              <Badge key={p.portCode} variant="outline" className="font-mono">
                {p.portCode} · {p.portName}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
