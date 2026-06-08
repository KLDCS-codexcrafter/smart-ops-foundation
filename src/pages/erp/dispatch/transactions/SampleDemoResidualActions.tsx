/**
 * SampleDemoResidualActions.tsx — 005/006 · Book expense / Return to stock
 * Sprint A.4-Residual · CONSUMES sample-expense-voucher-engine via
 * dispatch-residual-engine wrappers. ADDITIVE surface; existing
 * SampleOutwardIssue / DemoOutwardIssue pages stay 0-DIFF.
 *
 * Lists eligible SOM/DOM rows and exposes the action button per row.
 * NEVER duplicates accounting logic.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Receipt, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { PageFloorShell } from '@/components/shared/PageFloorShell';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import {
  bookSampleExpense,
  returnRefundableSampleToStock,
} from '@/lib/dispatch-residual-engine';
import {
  sampleOutwardMemosKey, type SampleOutwardMemo,
} from '@/types/sample-outward-memo';
import {
  demoOutwardMemosKey, type DemoOutwardMemo,
} from '@/types/demo-outward-memo';

function ls<T>(k: string): T[] {
  try { return JSON.parse(localStorage.getItem(k) ?? '[]') as T[]; }
  catch { return []; }
}

export function SampleDemoResidualActionsPanel() {
  const { entityCode } = useCardEntitlement();
  const [bump, setBump] = useState(0);

  const soms = useMemo(
    () => ls<SampleOutwardMemo>(sampleOutwardMemosKey(entityCode)),
    [entityCode, bump],
  );
  const doms = useMemo(
    () => ls<DemoOutwardMemo>(demoOutwardMemosKey(entityCode)),
    [entityCode, bump],
  );

  const expenseEligibleSOMs = soms.filter(
    (m) => m.status === 'completed' && !m.is_refundable &&
           (m.total_value ?? 0) > 0,
  );
  const stockReturnEligibleSOMs = soms.filter(
    (m) => m.status === 'returned' && m.is_refundable,
  );
  const expenseEligibleDOMs = doms.filter(
    (m) => (m.status === 'lost' || m.status === 'converted') &&
           m.pending_expense_voucher,
  );

  const onBookSOM = (m: SampleOutwardMemo) => {
    const r = bookSampleExpense(m, entityCode);
    if (r.posted) toast.success(`Expense voucher ${r.voucher_no} booked`);
    else toast.error(`Cannot book · ${r.reason}`);
    setBump((n) => n + 1);
  };
  const onBookDOM = (m: DemoOutwardMemo) => {
    const r = bookSampleExpense(m, entityCode);
    if (r.posted) toast.success(`Marketing-expense voucher ${r.voucher_no} booked`);
    else toast.error(`Cannot book · ${r.reason}`);
    setBump((n) => n + 1);
  };
  const onReturnToStock = (m: SampleOutwardMemo) => {
    const r = returnRefundableSampleToStock(m, entityCode);
    if (r.posted) toast.success(`Stock-transfer voucher ${r.voucher_no} posted`);
    else toast.error(`Cannot return · ${r.reason}`);
    setBump((n) => n + 1);
  };

  const isEmpty =
    expenseEligibleSOMs.length === 0 &&
    stockReturnEligibleSOMs.length === 0 &&
    expenseEligibleDOMs.length === 0;

  return (
    <PageFloorShell
      title="Sample / Demo · Residual Actions"
      subtitle="005 Book expense (non-refundable) · 006 Return to stock (refundable) · consumes existing FinCore path"
      isEmpty={isEmpty}
      emptyMessage="No memos eligible for residual booking right now."
    >
      <div className="space-y-4">
        {expenseEligibleSOMs.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Receipt className="h-4 w-4" /> 005 · Sample Expense Booking (SOM · non-refundable)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Memo</TableHead>
                    <TableHead className="text-xs">Recipient</TableHead>
                    <TableHead className="text-xs text-right">Value (₹)</TableHead>
                    <TableHead className="text-xs w-32" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseEligibleSOMs.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs">{m.memo_no}</TableCell>
                      <TableCell className="text-xs">{m.recipient_name}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{m.total_value}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => onBookSOM(m)}>
                          Book expense
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {expenseEligibleDOMs.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Receipt className="h-4 w-4" /> 005 · Marketing Expense Booking (DOM · lost / converted)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Memo</TableHead>
                    <TableHead className="text-xs">Recipient</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs w-32" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseEligibleDOMs.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs">{m.memo_no}</TableCell>
                      <TableCell className="text-xs">{m.recipient_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{m.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => onBookDOM(m)}>
                          Book expense
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {stockReturnEligibleSOMs.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <RotateCcw className="h-4 w-4" /> 006 · Refundable Return to Stock (SOM)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Memo</TableHead>
                    <TableHead className="text-xs">Recipient</TableHead>
                    <TableHead className="text-xs">From Godown</TableHead>
                    <TableHead className="text-xs w-40" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockReturnEligibleSOMs.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs">{m.memo_no}</TableCell>
                      <TableCell className="text-xs">{m.recipient_name}</TableCell>
                      <TableCell className="text-xs">{m.outward_godown_name ?? '—'}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => onReturnToStock(m)}>
                          Post Stock-Transfer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </PageFloorShell>
  );
}

export default SampleDemoResidualActionsPanel;
