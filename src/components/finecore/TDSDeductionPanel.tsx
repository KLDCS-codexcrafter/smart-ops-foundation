/**
 * TDSDeductionPanel.tsx — TDS computation display for Payment/Purchase Invoice
 */
import { computeTDS, type TDSComputeResult } from '@/lib/tds-engine';
import { Badge } from '@/components/ui/badge';

interface TDSDeductionPanelProps {
  sectionCode: string;
  deducteeType: 'individual' | 'company' | 'no_pan';
  grossAmount: number;
  vendorId: string;
  entityCode: string;
}

export function TDSDeductionPanel({ sectionCode, deducteeType, grossAmount, vendorId, entityCode }: TDSDeductionPanelProps) {
  if (!sectionCode || grossAmount <= 0) return null;

  const result: TDSComputeResult = computeTDS(grossAmount, sectionCode, deducteeType, vendorId, entityCode);

  if (!result.applicable) {
    return (
      <div className="border rounded-md p-3 bg-muted/30">
        <p className="text-xs text-muted-foreground">
          TDS u/s {sectionCode}: Threshold not crossed — no deduction required
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-md p-3 space-y-2 bg-amber-500/5 border-amber-500/20">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold">TDS Deduction</p>
        <Badge variant="outline" className="text-[10px]">u/s {result.section}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-muted-foreground">Section</span>
        <span className="font-medium">{result.sectionName}</span>
        <span className="text-muted-foreground">Rate</span>
        <span className="font-mono">{result.rate}%</span>
        <span className="text-muted-foreground">Gross Amount</span>
        <span className="font-mono">₹{result.grossAmount.toLocaleString('en-IN')}</span>
        <span className="text-muted-foreground">TDS Amount</span>
        <span className="font-mono font-bold text-amber-600 dark:text-amber-400">₹{result.tdsAmount.toLocaleString('en-IN')}</span>
        <span className="text-muted-foreground">Net Payment</span>
        <span className="font-mono">₹{result.netAmount.toLocaleString('en-IN')}</span>
      </div>
      {result.ledgerSuggestion && (
        <p className="text-[10px] text-muted-foreground">Auto-post to: {result.ledgerSuggestion}</p>
      )}
    </div>
  );
}
