/**
 * @file        src/pages/erp/eximx/export/ExportPOLineageBreadcrumb.tsx
 * @purpose     Cross-master drill breadcrumb · LUT → Foreign Customer → Export PO → Shipping Bill (forward EX-7b)
 * @sprint      T-Phase-1.EX-7a-ExportPO-ForeignCustomer-DocPack
 */
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { ExportPurchaseOrder } from '@/types/export-purchase-order';

export function ExportPOLineageBreadcrumb({ po }: { po: ExportPurchaseOrder }): JSX.Element {
  const navigate = useNavigate();
  return (
    <div className="text-sm text-muted-foreground flex items-center flex-wrap gap-1">
      <button className="hover:underline" onClick={() => navigate('/erp/eximx/export')}>EximX Export</button>
      <ChevronRight className="w-3 h-3" />
      <button className="hover:underline" onClick={() => navigate('/erp/eximx/export/foreign-customers')}>Foreign Customer</button>
      <ChevronRight className="w-3 h-3" />
      <button className="hover:underline" onClick={() => navigate('/erp/eximx/export/orders')}>Export POs</button>
      <ChevronRight className="w-3 h-3" />
      <span className="font-medium text-foreground font-mono">{po.export_po_no}</span>
      <ChevronRight className="w-3 h-3" />
      <span className="text-xs">{po.expected_shipping_bill_no ? `→ ${po.expected_shipping_bill_no} (EX-7b)` : 'Shipping Bill pending'}</span>
    </div>
  );
}
