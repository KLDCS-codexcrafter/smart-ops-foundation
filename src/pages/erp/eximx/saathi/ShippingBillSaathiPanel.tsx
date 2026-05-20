/**
 * @file        src/pages/erp/eximx/saathi/ShippingBillSaathiPanel.tsx
 * @purpose     9th Saathi surface · SB companion
 * @sprint      T-Phase-1.EX-7b-ShippingBill-EGM-LEO-DispatchMirror
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import type { ShippingBill } from '@/types/shipping-bill';

export function ShippingBillSaathiPanel({ sb }: { sb: ShippingBill }): JSX.Element {
  return (
    <Card className="bg-muted/30">
      <CardHeader><CardTitle className="text-sm"><Sparkles className="w-4 h-4 inline mr-2 text-primary" />Saathi · SB Insights · 9th Surface · Superpowers 17/20 (85%)</CardTitle></CardHeader>
      <CardContent className="text-sm space-y-3">
        <div><strong>SB Type ({sb.sb_type.replace(/_/g, ' ')})</strong>: Free = standard export · Drawback = duty refund (Sec 75) · DFIA/AA = duty-free inputs scheme. Each has distinct GL impact (drawback voucher in EX-8 · D-NEW-FG).</div>
        <div><strong>EGM (Vessel Manifest)</strong>: Per-vessel listing of ALL exports. One EGM covers multiple SBs. Workflow: pending → requested → assigned (ICEGATE) → vessel_sailed → closed. Critical for EX-7c EDPMS reconciliation.</div>
        <div><strong>LEO ({sb.related_leo_id ? 'linked' : 'pending'})</strong>: Customs clearance order. 4-state: pending → examined → let_export → closed. Without LEO, goods cannot leave India. Self-sealing + AEO Tier-2/3 = examination skipped.</div>
        <div><strong>5-Leg Outbound Dispatch</strong>: Mirror of EX-4 import MLGIT · multi-leg-git.ts 0-diff (D-284 spirit). CustomerWarehouse → OriginPort → Vessel → DestinationPort → ForeignBuyerWarehouse.</div>
        <div><strong>CoO Legalization ({sb.coo_legalization_state.replace(/_/g, ' ')})</strong>: Moat #10 ADVANCED. 4-state workflow. UAE/CEPA require embassy legalization (~₹4,200 · 10-day TAT). Full embassy management EX-9.</div>
        {sb.is_self_sealing_facility && <div><strong>Self-Sealing (v7 Gap #10)</strong>: Authorization {sb.self_sealing_authorization_no} · CFS examination skipped · AEO benefit.</div>}
        <div className="pt-2 border-t text-xs text-muted-foreground">Compliance: RoDTEP scrip realization EX-10 · Drawback voucher runtime EX-8 (D-NEW-FG) · per-item valuation EX-10 (D-NEW-FF) · CoO full EX-9 · PDF SB EX-11.</div>
      </CardContent>
    </Card>
  );
}
