/**
 * @file        ATPCheckButton.tsx
 * @sprint      A.2 · T-A2-Production-ATP · Pillar-A CLOSE
 * @purpose     Advisory ATP / capacity check action for SalesX quote/order surfaces.
 *              Non-blocking · salesperson decides. SalesX save logic 0-DIFF.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Gauge, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { checkAvailableToPromise, type ATPInput, type ATPResult } from '@/lib/atp-engine';
import { cn } from '@/lib/utils';

interface Props {
  entityCode: string;
  lines: ATPInput['lines'];
  source?: ATPInput['source'];
  sourceDocNo?: string | null;
  size?: 'sm' | 'default';
}

const STATUS_TONE: Record<ATPResult['status'], string> = {
  available:     'bg-green-500/10 text-green-700 border-green-500/30',
  partial:       'bg-amber-500/10 text-amber-700 border-amber-500/30',
  over_capacity: 'bg-red-500/10 text-red-700 border-red-500/30',
};

const STATUS_ICON = {
  available: CheckCircle2,
  partial: AlertTriangle,
  over_capacity: AlertTriangle,
} as const;

export function ATPCheckButton({ entityCode, lines, source = 'quotation', sourceDocNo, size = 'sm' }: Props) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ATPResult | null>(null);

  const handleCheck = () => {
    const r = checkAvailableToPromise({ entityCode, lines, source, source_doc_no: sourceDocNo ?? null });
    setResult(r);
    setOpen(true);
  };

  const Icon = result ? STATUS_ICON[result.status] : Gauge;

  return (
    <>
      <Button
        size={size}
        variant="outline"
        type="button"
        onClick={handleCheck}
        className="border-blue-500/40 text-blue-700 hover:bg-blue-500/10"
      >
        <Gauge className="h-3.5 w-3.5 mr-1.5" />
        ATP / Capacity Check
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className="h-4 w-4" /> Available-to-Promise · Advisory
            </DialogTitle>
          </DialogHeader>
          {result ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={cn('uppercase tracking-wide', STATUS_TONE[result.status])}>
                  {result.status.replace('_', ' ')}
                </Badge>
                <div className="text-xs text-muted-foreground font-mono">
                  Promise date:{' '}
                  <span className="text-foreground">
                    {result.promise_date ?? '— unavailable —'}
                  </span>
                </div>
              </div>
              {!result.load_data_available && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-800">
                  <Info className="h-3.5 w-3.5 mt-0.5" />
                  <span>
                    Capacity data unavailable — honest null promise date (NEVER fabricated).
                    Wire up Production Plans to enable a real ATP forecast.
                  </span>
                </div>
              )}
              {result.warnings.length > 0 && (
                <ul className="text-xs space-y-1">
                  {result.warnings.map((w, i) => (
                    <li key={i} className="text-amber-700">• {w}</li>
                  ))}
                </ul>
              )}
              <div className="rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="text-[10px] text-muted-foreground bg-muted/30">
                    <tr>
                      <th className="text-left p-2">Item</th>
                      <th className="text-right p-2">Qty</th>
                      <th className="text-left p-2">Requested</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.per_line.map((l, i) => (
                      <tr key={`${l.item_id}-${i}`} className="border-t">
                        <td className="p-2">{l.item_name}</td>
                        <td className="p-2 text-right font-mono">{l.qty}</td>
                        <td className="p-2 font-mono">{l.requested_date}</td>
                        <td className="p-2">
                          <Badge variant="outline" className={cn('text-[10px]', l.status === 'available' ? STATUS_TONE.available : STATUS_TONE.over_capacity)}>
                            {l.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                Advisory only · salesperson decides · SalesX save logic unchanged.
                OEE live-sensor feed Wave-2.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Computing…</p>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ATPCheckButton;
