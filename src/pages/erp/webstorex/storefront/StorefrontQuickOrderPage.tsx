/**
 * @file        src/pages/erp/webstorex/storefront/StorefrontQuickOrderPage.tsx
 * @sprint      Sprint 151 · T-WebStoreX-A11.3 · DP-WS-19.1
 */
import { useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { parseQuickOrder } from '@/lib/webstorex-order-engine';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Zap } from 'lucide-react';
import { PreviewRibbon, useStorefrontCart } from './storefront-shared';
import type { WebStoreXModule } from '../WebStoreXSidebar.types';
import type { QuickOrderParseResult } from '@/types/webstorex';

interface Props { onNavigate: (m: WebStoreXModule) => void; }

export function StorefrontQuickOrderPage({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const [text, setText] = useState('');
  const [result, setResult] = useState<QuickOrderParseResult | null>(null);
  const cart = useStorefrontCart(entityCode);

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select a company to continue.</div>;

  const onParse = (): void => setResult(parseQuickOrder(entityCode, text));

  const onImport = (): void => {
    if (!result || result.lines.length === 0) { toast.error('Nothing to import'); return; }
    const merged = [...cart.lines];
    for (const l of result.lines) {
      const idx = merged.findIndex(x => x.storeItemId === l.storeItemId && (x.variantId ?? null) === (l.variantId ?? null));
      if (idx >= 0) merged[idx] = { ...merged[idx], qty: merged[idx].qty + l.qty };
      else merged.push(l);
    }
    cart.replaceAll(merged);
    toast.success(`${result.lines.length} line${result.lines.length === 1 ? '' : 's'} added to cart`);
    onNavigate('storefront-cart');
  };

  return (
    <div className="animate-fade-in">
      <PreviewRibbon />
      <div className="p-4 max-w-2xl mx-auto space-y-3">
        <h1 className="text-xl font-semibold flex items-center gap-2"><Zap className="h-5 w-5" />Quick order</h1>
        <p className="text-xs text-muted-foreground">
          Paste SKUs with quantities. Formats: <span className="font-mono">SKU qty</span> per line, or
          {' '}<span className="font-mono">sku,qty</span> CSV. Variant SKUs resolved first.
        </p>
        <Card className="glass-card"><CardContent className="p-4 space-y-2">
          <Textarea rows={8} value={text} onChange={e => setText(e.target.value)} placeholder={'SKU-001 10\nSKU-XL-RED,4\nSKU-002 25'} className="font-mono text-xs" />
          <div className="flex gap-2"><Button onClick={onParse} variant="outline">Parse</Button>{result && <Button onClick={onImport}>Import {result.lines.length} → cart</Button>}</div>
        </CardContent></Card>

        {result && (
          <Card className="glass-card"><CardContent className="p-4 space-y-2 text-sm">
            <div className="font-medium">Parsed</div>
            {result.lines.length === 0 && <div className="text-xs text-muted-foreground">No valid lines.</div>}
            {result.lines.map((l, i) => (
              <div key={`pl-${i}`} className="flex justify-between text-xs font-mono">
                <span>{l.storeItemId}{l.variantId ? ` · ${l.variantId}` : ''}</span><span>qty {l.qty}</span>
              </div>
            ))}
            {result.unknownSkus.length > 0 && (
              <div className="pt-2 flex flex-wrap gap-1">
                <span className="text-xs text-warning">Unknown SKUs:</span>
                {result.unknownSkus.map((s, i) => <Badge key={`u-${i}`} variant="outline">{s}</Badge>)}
              </div>
            )}
            {result.invalidRows.length > 0 && (
              <div className="pt-1 text-xs text-destructive">{result.invalidRows.length} invalid row{result.invalidRows.length === 1 ? '' : 's'} ignored.</div>
            )}
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}
