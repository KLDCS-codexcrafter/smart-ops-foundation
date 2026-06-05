/**
 * @file        src/pages/erp/webstorex/storefront/PreviewRibbon.tsx
 * @sprint      Sprint 151 · T-WebStoreX-A11.3 · DP-WS-22 storefront preview ribbon
 */
import { AlertTriangle } from 'lucide-react';

export function PreviewRibbon(): JSX.Element {
  return (
    <div className="bg-warning/10 border-b border-warning/30 px-4 py-2 flex items-center gap-2 text-xs">
      <AlertTriangle className="h-3.5 w-3.5 text-warning" />
      <span className="font-medium text-warning">Storefront Preview</span>
      <span className="text-muted-foreground">
        · This is the in-app preview. Customer auth + real payment capture land P2BB (DP-WS-20).
      </span>
    </div>
  );
}
