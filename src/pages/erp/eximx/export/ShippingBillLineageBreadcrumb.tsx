/**
 * @file        src/pages/erp/eximx/export/ShippingBillLineageBreadcrumb.tsx
 * @purpose     Cross-master drill breadcrumb
 * @sprint      T-Phase-1.EX-7b-ShippingBill-EGM-LEO-DispatchMirror
 */
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { ShippingBill } from '@/types/shipping-bill';

export function ShippingBillLineageBreadcrumb({ sb }: { sb: ShippingBill }): JSX.Element {
  const navigate = useNavigate();
  return (
    <div className="text-sm text-muted-foreground flex items-center flex-wrap gap-1">
      <a className="hover:underline cursor-pointer" onClick={() => navigate('/erp/eximx/export/lut-master')}>LUT {sb.related_lut_id}</a>
      <ChevronRight className="w-3 h-3" />
      <a className="hover:underline cursor-pointer" onClick={() => navigate(`/erp/eximx/export/orders/${sb.related_export_po_id}`)}>Export PO {sb.related_export_po_no}</a>
      <ChevronRight className="w-3 h-3" />
      <span className="font-medium text-foreground">SB {sb.sb_no}</span>
      <ChevronRight className="w-3 h-3" />
      <span className="text-xs">EGM {sb.related_egm_id ?? 'pending'}</span>
      <ChevronRight className="w-3 h-3" />
      <span className="text-xs">LEO {sb.related_leo_id ?? '—'}</span>
      <ChevronRight className="w-3 h-3" />
      <span className="text-xs">→ e-BRC (EX-7c)</span>
    </div>
  );
}
