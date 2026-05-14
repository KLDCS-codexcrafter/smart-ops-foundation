/**
 * @file        src/pages/erp/servicedesk/reports/VoiceOfCustomerAggregation.tsx
 * @purpose     S35 Voice of Customer · keyword-frequency aggregation across HappyCode channels
 * @sprint      T-Phase-1.C.1f · Block H.3
 * @iso         Functional Suitability + Usability
 */
import { Card } from '@/components/ui/card';
import { aggregateVoiceOfCustomerKeywords } from '@/lib/servicedesk-engine';

export function VoiceOfCustomerAggregation(): JSX.Element {
  const keywords = aggregateVoiceOfCustomerKeywords();
  const max = keywords[0]?.count ?? 1;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Voice of Customer</h1>
        <p className="text-sm text-muted-foreground">
          S35 Tier 2 OOB · Phase 1 keyword-frequency aggregation · {keywords.length} unique keyword(s)
        </p>
      </div>

      <Card className="p-6">
        {keywords.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            No customer feedback comments yet · capture via HappyCode channels 2 + 3.
          </p>
        ) : (
          <div className="flex flex-wrap gap-3 items-baseline">
            {keywords.map((k) => {
              const scale = 0.8 + (k.count / max) * 1.6;
              return (
                <span
                  key={k.keyword}
                  style={{ fontSize: `${scale}rem` }}
                  className="text-foreground"
                  title={`${k.count} mention(s)`}
                >
                  {k.keyword}
                </span>
              );
            })}
          </div>
        )}
      </Card>

      <p className="text-xs text-muted-foreground">{/* [JWT] FT-SDESK-005: NLP upgrade · sentiment + topic + trend */}NLP-powered sentiment + trends in Phase 2.</p>
    </div>
  );
}
