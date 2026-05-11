/**
 * @file        src/pages/erp/maintainpro/masters/SparePartsView.tsx
 * @purpose     Read-only filter view of Inventory Hub stockitems where stock_group='Maintenance Spares' · FR-13 replica · FR-54 SSOT
 * @sprint      T-Phase-1.A.16a · Block E.1 · Q-LOCK-3
 */
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, ExternalLink, Info } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listSpareParts } from '@/lib/maintainpro-engine';

interface Props {
  onNavigate: (m: string) => void;
}

export function SparePartsView({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const items = entityCode ? listSpareParts(entityCode) : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-cyan-600" />
          <div>
            <h2 className="text-xl font-bold">Spare Parts</h2>
            <p className="text-xs text-muted-foreground">
              Read-only replica view · maintained in Inventory Hub
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
              SSOT: Inventory Hub · stock group "Maintenance Spares"
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Edit spare parts in Inventory Hub to keep all consumer modules in sync.
              This view is read-only by design (FR-13 · FR-54).
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="/erp/inventory-hub">
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Open Inventory Hub
            </a>
          </Button>
        </div>
      </Card>

      <Card>
        {items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No spare parts in stock group "Maintenance Spares" yet. Add them in Inventory Hub.
          </div>
        ) : (
          <div className="divide-y">
            {items.map((s) => (
              <div key={s.stockitem_id} className="p-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">{s.stockitem_code}</span>
                  <span className="text-sm font-medium">{s.stockitem_name}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Stock <span className="font-mono">{s.current_stock}</span> {s.uom} ·
                  Reorder at {s.reorder_level} · Avg{' '}
                  <span className="font-mono">{s.avg_consumption_per_month}</span>/month
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
