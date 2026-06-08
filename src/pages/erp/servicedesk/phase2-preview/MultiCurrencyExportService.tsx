/**
 * @file        src/pages/erp/servicedesk/phase2-preview/MultiCurrencyExportService.tsx
 * @purpose     S37 Multi-Currency Export Service · Tier-L FULL · promoted at A.3
 * @sprint      T-Phase-1.A.3 · T-A3-ServiceDesk-Capstone · Pass 3 of 3
 * @iso         Functional Suitability + Usability
 * @reuses      servicedesk-capstone-engine.computeExportQuote (pure)
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Globe } from 'lucide-react';
import {
  computeExportQuote,
  type ExportCurrency,
  type ExportQuoteResult,
} from '@/lib/servicedesk-capstone-engine';

const CURRENCIES: ExportCurrency[] = ['USD', 'EUR', 'GBP', 'AED', 'SGD'];

export function MultiCurrencyExportService(): JSX.Element {
  const [baseRupees, setBaseRupees] = useState<string>('100000');
  const [currency, setCurrency] = useState<ExportCurrency>('USD');
  const [rate, setRate] = useState<string>('83.20');
  const [withholding, setWithholding] = useState<string>('10');

  const basePaise = Math.max(0, Math.round(parseFloat(baseRupees || '0') * 100));
  const result: ExportQuoteResult = computeExportQuote({
    base_amount_paise: basePaise,
    target_currency: currency,
    fx_rate_inr_per_unit: parseFloat(rate || '0') || 1,
    withholding_pct: parseFloat(withholding || '0') || 0,
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Globe className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Multi-Currency Export Service</h1>
          <Badge variant="default">S37 · Tier-L LIVE</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Quote inputs</h2>
          <div className="space-y-2">
            <Label htmlFor="base">Base amount (₹)</Label>
            <Input id="base" inputMode="decimal" value={baseRupees} onChange={(e) => setBaseRupees(e.target.value)} className="font-mono" />
          </div>
          <div className="space-y-2">
            <Label>Target currency</Label>
            <div className="flex flex-wrap gap-2">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`rounded-lg border px-3 py-1 text-sm font-mono transition ${
                    currency === c ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/40'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate">FX rate (₹ per 1 {currency})</Label>
            <Input id="rate" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} className="font-mono" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wh">Withholding %</Label>
            <Input id="wh" inputMode="decimal" value={withholding} onChange={(e) => setWithholding(e.target.value)} className="font-mono" />
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Quote result</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Gross in {currency}</div>
            <div className="font-mono">{result.gross_in_target.toLocaleString('en-IN')}</div>
            <div className="text-muted-foreground">Withholding</div>
            <div className="font-mono text-destructive">{result.withholding_in_target.toLocaleString('en-IN')}</div>
            <div className="text-muted-foreground">Net to bank</div>
            <div className="font-mono text-success">{result.net_in_target.toLocaleString('en-IN')}</div>
            <div className="text-muted-foreground">Realised at quote</div>
            <div className="font-mono">₹{(result.realised_paise_at_quote / 100).toLocaleString('en-IN')}</div>
          </div>
          <p className="text-xs text-muted-foreground border-t border-border pt-3">{result.fema_note}</p>
        </Card>
      </div>
    </div>
  );
}
