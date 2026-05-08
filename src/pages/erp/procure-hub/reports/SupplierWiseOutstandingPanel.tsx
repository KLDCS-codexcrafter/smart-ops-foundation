/**
 * @file        SupplierWiseOutstandingPanel.tsx
 * @purpose     Supplier-Wise Outstanding report panel · A.3.b
 * @sprint      T-Phase-1.A.3.b-Procure360-Bill-Passing-Integration
 * @decisions   D-NEW-AK
 * @reuses      useEntityCode · UI primitives
 * @[JWT]       GET /api/procure360/reports/SupplierWiseOutstandingPanel — localStorage-backed in Phase 1
 */
import { useEntityCode } from '@/hooks/useEntityCode';
import { Card, CardContent } from '@/components/ui/card';

export function SupplierWiseOutstandingPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  void entityCode;
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Supplier-Wise Outstanding</h1>
        <p className="text-sm text-muted-foreground">Report scaffold · data wiring deferred (D-NEW-AK · α-b stub).</p>
      </div>
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          No data yet.
        </CardContent>
      </Card>
    </div>
  );
}
