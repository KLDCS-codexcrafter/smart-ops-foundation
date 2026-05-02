/**
 * @file     MultiSourcePicker.tsx — Multi-source linking UI component
 * @sprint   T-Phase-1.2.6e-tally-1 · Q2-c
 * @purpose  Renders linked source vouchers as removable chips + "Add another source"
 *           button that opens SourceVoucherPickerDialog (Q4-d).
 *
 *   Forms own the multi_source_refs state · this component is controlled.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import type { MultiSourceRef } from '@/types/multi-source-ref';

interface Props {
  refs: MultiSourceRef[];
  onChange: (refs: MultiSourceRef[]) => void;
  onAddSource: () => void;
  primaryRefLabel?: string;
  primaryRefAmount?: number;
  title?: string;
  emptyState?: string;
}

const fmtINR = (n: number) =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

export function MultiSourcePicker({
  refs,
  onChange,
  onAddSource,
  primaryRefLabel,
  primaryRefAmount,
  title = 'Linked Sources',
  emptyState = 'No sources linked',
}: Props) {
  const remove = (i: number) => onChange(refs.filter((_, idx) => idx !== i));

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">{title}</CardTitle>
        <Button size="sm" variant="outline" type="button" onClick={onAddSource}>
          <Plus className="h-3 w-3 mr-1" /> Add Source
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {primaryRefLabel && (
          <div className="flex items-center justify-between bg-muted/30 px-3 py-2 rounded text-sm">
            <div>
              <Badge variant="secondary" className="mr-2">Primary</Badge>
              <span className="font-mono">{primaryRefLabel}</span>
            </div>
            {primaryRefAmount != null && (
              <span className="text-muted-foreground font-mono">{fmtINR(primaryRefAmount)}</span>
            )}
          </div>
        )}
        {refs.length === 0 && !primaryRefLabel && (
          <p className="text-xs text-muted-foreground py-1">{emptyState}</p>
        )}
        {refs.map((r, i) => (
          <div
            key={`${r.voucher_id}-${i}`}
            className="flex items-center justify-between bg-muted/20 px-3 py-2 rounded text-sm"
          >
            <div>
              <Badge variant="outline" className="mr-2">{r.type}</Badge>
              <span className="font-mono">{r.voucher_no}</span>
              {r.voucher_date && (
                <span className="text-muted-foreground ml-2 text-xs">{r.voucher_date}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-mono">{fmtINR(r.amount)}</span>
              <Button size="sm" variant="ghost" type="button" onClick={() => remove(i)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
