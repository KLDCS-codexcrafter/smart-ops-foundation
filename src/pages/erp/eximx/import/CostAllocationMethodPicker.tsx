/**
 * @file        src/pages/erp/eximx/import/CostAllocationMethodPicker.tsx
 * @purpose     4-method picker · used in MLGITDetail
 * @sprint      T-Phase-1.EX-4-MultiLeg-GIT-3Bucket-4Method
 */
import { Badge } from '@/components/ui/badge';
import type { CostAllocationMethod } from '@/types/cost-allocation';
import { COST_ALLOCATION_DESCRIPTIONS } from '@/types/cost-allocation';

const METHODS: CostAllocationMethod[] = ['by_value', 'by_weight', 'by_quantity', 'equal'];

export function CostAllocationMethodPicker({ currentMethod }: { currentMethod: CostAllocationMethod }): JSX.Element {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {METHODS.map((m) => (
        <div key={m} className={`p-2 rounded text-xs border ${m === currentMethod ? 'border-primary bg-primary/10' : 'border-border bg-muted/20'}`}>
          <Badge variant={m === currentMethod ? 'default' : 'outline'} className="mb-1">{m}</Badge>
          <p className="text-xs text-muted-foreground">{COST_ALLOCATION_DESCRIPTIONS[m]}</p>
        </div>
      ))}
    </div>
  );
}
