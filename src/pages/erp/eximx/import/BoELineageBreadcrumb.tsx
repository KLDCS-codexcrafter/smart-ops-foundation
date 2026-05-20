/**
 * @file        src/pages/erp/eximx/import/BoELineageBreadcrumb.tsx
 * @purpose     Cross-master drill breadcrumb · ImportPO → MLGIT → CI → BoE → Voucher
 * @sprint      T-Phase-1.EX-6-BillOfEntry-CustomsDuty-Demurrage-AutoPostedVouchers
 */
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { BillOfEntry } from '@/types/bill-of-entry';

export function BoELineageBreadcrumb({ boe }: { boe: BillOfEntry }): JSX.Element {
  const navigate = useNavigate();
  return (
    <div className="text-sm text-muted-foreground flex items-center flex-wrap gap-1">
      <a className="hover:underline cursor-pointer" onClick={() => navigate('/erp/eximx/import')}>Import PO</a>
      <ChevronRight className="w-3 h-3" />
      <a className="hover:underline cursor-pointer font-mono" onClick={() => navigate(`/erp/eximx/import/shipments/${boe.related_mlgit_id}`)}>MLGIT {boe.related_mlgit_no}</a>
      <ChevronRight className="w-3 h-3" />
      <a className="hover:underline cursor-pointer font-mono" onClick={() => navigate(`/erp/eximx/import/commercial-invoices/${boe.related_ci_id}`)}>CI {boe.related_ci_no}</a>
      <ChevronRight className="w-3 h-3" />
      <span className="font-medium text-foreground font-mono">BoE {boe.boe_no}</span>
      <ChevronRight className="w-3 h-3" />
      <span className="text-xs">{boe.posted_voucher_ids.length} voucher(s)</span>
    </div>
  );
}
