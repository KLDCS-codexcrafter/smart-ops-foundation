/**
 * @file     AdvanceRegisterView.tsx
 * @purpose  Read-only dialog listing every open + partial advance for the
 *           active entity with age, amount, party, and source voucher
 *           reference. Opens from AdvanceRegisterWidget.
 *
 *           A "Run Notional Interest" CTA opens NotionalInterestRunModal
 *           when at least one advance has crossed the aging threshold.
 *
 * @sprint   T-H1.5-D-D5
 * @finding  CC-066
 */

import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Calculator } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useAdvanceRegister } from '../hooks/useAdvanceRegister';
import type { AgeBucket } from '../lib/advance-aging';
import { NOTIONAL_AGING_THRESHOLD_DAYS } from '../engines/notional-interest-engine';
import { NotionalInterestRunModal } from './NotionalInterestRunModal';

interface Props {
  open: boolean;
  onClose: () => void;
}

const fmt = (n: number) =>
  `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const fmtDate = (iso: string) => {
  try {
    return format(parseISO(iso), 'dd MMM yyyy');
  } catch {
    return iso;
  }
};

const BUCKET_TONE: Record<AgeBucket, string> = {
  '0-30d':   'bg-muted text-muted-foreground border-border',
  '31-60d':  'bg-muted text-muted-foreground border-border',
  '61-90d':  'bg-amber-500/10 text-amber-600 border-amber-500/30',
  '91-180d': 'bg-destructive/10 text-destructive border-destructive/30',
  '180+d':   'bg-destructive/20 text-destructive border-destructive/40',
};

export function AdvanceRegisterView({ open, onClose }: Props) {
  const { aging, entityCode, reload } = useAdvanceRegister();
  const [runOpen, setRunOpen] = useState(false);

  const hasAged = useMemo(
    () => aging.aged.some(a => a.daysOld >= NOTIONAL_AGING_THRESHOLD_DAYS),
    [aging.aged],
  );

  return (
    <>
      <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Advance Register — Open & Partial</DialogTitle>
            <DialogDescription>
              {aging.totalOpenCount} {aging.totalOpenCount === 1 ? 'advance' : 'advances'} ·
              {' '}{fmt(aging.totalOpenAmount)} unadjusted
            </DialogDescription>
          </DialogHeader>

          {aging.aged.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-xs text-muted-foreground">
              No open advances for this entity.
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-border overflow-hidden max-h-[480px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Ref No</TableHead>
                      <TableHead className="text-xs">Party</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs text-right">Original</TableHead>
                      <TableHead className="text-xs text-right">Adjusted</TableHead>
                      <TableHead className="text-xs text-right">Balance</TableHead>
                      <TableHead className="text-xs text-right">Days Old</TableHead>
                      <TableHead className="text-xs">Bucket</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aging.aged.map(a => {
                      const adjusted = a.advance.advance_amount - a.advance.balance_amount;
                      return (
                        <TableRow key={a.advance.id}>
                          <TableCell className="text-xs font-mono">{a.advance.advance_ref_no}</TableCell>
                          <TableCell className="text-xs">
                            <span className="text-foreground">{a.advance.party_name}</span>
                            <span className="ml-1 text-[10px] text-muted-foreground">({a.advance.party_type})</span>
                          </TableCell>
                          <TableCell className="text-xs font-mono">{fmtDate(a.advance.date)}</TableCell>
                          <TableCell className="text-xs font-mono text-right">{fmt(a.advance.advance_amount)}</TableCell>
                          <TableCell className="text-xs font-mono text-right">{fmt(adjusted)}</TableCell>
                          <TableCell className="text-xs font-mono text-right font-semibold">{fmt(a.advance.balance_amount)}</TableCell>
                          <TableCell className="text-xs font-mono text-right">{a.daysOld}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${BUCKET_TONE[a.bucket]}`}>
                              {a.bucket}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {a.advance.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {a.advance.source_voucher_no}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">
                  Adjustment is performed inside Sales Invoice / Payment / Purchase
                  Invoice using the existing Apply Advance flow.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!hasAged || !entityCode}
                  onClick={() => setRunOpen(true)}
                >
                  <Calculator className="h-3.5 w-3.5 mr-2" />
                  Run Notional Interest
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <NotionalInterestRunModal
        open={runOpen}
        onClose={() => setRunOpen(false)}
        onPosted={() => reload()}
      />
    </>
  );
}
