/**
 * @file        src/pages/erp/maintainpro/transactions/AssetCapitalization.tsx
 * @purpose     Asset Capitalization read-only list · SiteX CAPEX bridge consumer (Q-LOCK-8)
 * @sprint      T-Phase-1.A.16b · Block G.1
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { listAssetCapitalizations } from '@/lib/maintainpro-engine';

interface Props { onNavigate: (m: string) => void }
const E = 'DEMO';

export function AssetCapitalization(_props: Props): JSX.Element {
  const list = listAssetCapitalizations(E);
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Asset Capitalization</h1>
      <p className="text-sm text-muted-foreground">SiteX CAPEX handoff → Equipment + Asset Cap voucher (FineCore stub)</p>
      <Card><CardContent className="p-4">
        <div className="space-y-2 text-xs font-mono">
          {list.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-2 border-b border-border">
              <span>{c.capitalization_no}</span>
              <span className="text-muted-foreground">{c.depreciation_method}</span>
              <span>₹{c.purchase_cost.toLocaleString('en-IN')}</span>
              <span>{c.useful_life_years}y</span>
              {c.triggered_by_handoff_id && <Badge variant="outline">SiteX</Badge>}
              {!c.fincore_voucher_id && <Badge variant="outline" className="text-muted-foreground">FineCore stub</Badge>}
            </div>
          ))}
          {list.length === 0 && <div className="text-muted-foreground">No capitalizations yet · trigger via SiteX handoff</div>}
        </div>
      </CardContent></Card>
    </div>
  );
}

export default AssetCapitalization;
