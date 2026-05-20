/**
 * @file        src/pages/erp/eximx/export/ExportRealisationLineageBreadcrumb.tsx
 * @purpose     Cross-master drill · ExportPO → SB → Realisation → e-BRC → FEMA → drawback
 * @sprint      T-Phase-1.EX-7c-ExportRealisation-eBRC-FEMA
 */
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { ExportRealisation } from '@/types/export-realisation';

export function ExportRealisationLineageBreadcrumb({ realisation: r }: { realisation: ExportRealisation }): JSX.Element {
  const navigate = useNavigate();
  return (
    <div className="text-sm text-muted-foreground flex items-center flex-wrap gap-1">
      <a className="hover:underline cursor-pointer" onClick={() => navigate(`/erp/eximx/export/orders/${r.related_export_po_id}`)}>Export PO {r.related_export_po_no}</a>
      <ChevronRight className="w-3 h-3" />
      <a className="hover:underline cursor-pointer" onClick={() => navigate(`/erp/eximx/export/shipping-bills/${r.related_shipping_bill_id}`)}>SB {r.related_shipping_bill_no}</a>
      <ChevronRight className="w-3 h-3" />
      <span className="font-medium text-foreground">Realisation {r.realisation_no}</span>
      <ChevronRight className="w-3 h-3" />
      <span className="text-xs">FEMA {r.fema_state} ({r.days_since_dispatch}d)</span>
      <ChevronRight className="w-3 h-3" />
      <span className="text-xs">→ EBRC → Drawback/RoDTEP (EX-10)</span>
    </div>
  );
}
