/**
 * @file        src/pages/erp/servicedesk/quote-optimizer/ServiceQuoteOptimizer.tsx
 * @purpose     S32 Service Quote Optimizer · rule-based · upgrade FT-SDESK-004 to ML
 * @sprint      T-Phase-1.C.1f · Block G.3
 * @iso         Functional Suitability + Usability
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { suggestServiceQuote, type QuoteSuggestion } from '@/lib/servicedesk-engine';

type Severity = 'low' | 'medium' | 'high' | 'critical';

export function ServiceQuoteOptimizer(): JSX.Element {
  const [callType, setCallType] = useState('REPAIR');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [suggestion, setSuggestion] = useState<QuoteSuggestion | null>(null);

  const optimize = (): void => {
    setSuggestion(suggestServiceQuote(callType, severity));
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Service Quote Optimizer</h1>
        <p className="text-sm text-muted-foreground">S32 Tier 2 OOB · Rule-based Phase 1 · {/* [JWT] FT-SDESK-004 ML upgrade */}</p>
      </div>

      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Call Type</Label>
            <Input value={callType} onChange={(e) => setCallType(e.target.value)} placeholder="REPAIR" />
          </div>
          <div>
            <Label>Severity</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as Severity)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={optimize}>Optimize Quote</Button>
      </Card>

      {suggestion && (
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Suggested Quote</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Response time</div>
              <div className="font-mono text-lg">{suggestion.suggested_response_hours} hrs</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Resolution time</div>
              <div className="font-mono text-lg">{suggestion.suggested_resolution_hours} hrs</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Suggested charge</div>
              <div className="font-mono text-lg">₹ {(suggestion.suggested_charge_paise / 100).toFixed(0)}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Confidence</div>
              <Badge variant={suggestion.confidence === 'high' ? 'default' : suggestion.confidence === 'medium' ? 'secondary' : 'outline'}>
                {suggestion.confidence}
              </Badge>
            </div>
          </div>
          <Button variant="outline" size="sm">Apply to Ticket</Button>
        </Card>
      )}
    </div>
  );
}
