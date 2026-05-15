/**
 * @file        src/pages/erp/servicedesk/standby-loans/StandbyLoanList.tsx
 * @purpose     Standby loans register · OOB-18 · overdue alert · damage capture
 * @sprint      T-Phase-1.C.1c · Block F.1
 * @iso        Usability + Functional Suitability
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
// Precision Arc · Stage 3B · Block 4c — paise integer-domain conversion (rupees->paise).
import { roundTo, dMul } from '@/lib/decimal-helpers';
import {
  listStandbyLoans,
  listOverdueStandbyLoans,
  returnStandbyLoan,
} from '@/lib/servicedesk-engine';
import type { StandbyLoanStatus } from '@/types/standby-loan';

const ACTOR = 'desk_user';
const STATUSES: StandbyLoanStatus[] = ['out', 'returned', 'overdue', 'written_off'];

function daysOverdue(expected: string): number {
  const ms = Date.now() - new Date(expected).getTime();
  return Math.max(0, Math.floor(ms / (86400 * 1000)));
}

export function StandbyLoanList(): JSX.Element {
  const [statusFilter, setStatusFilter] = useState<StandbyLoanStatus | 'all'>('all');
  const [refresh, setRefresh] = useState(0);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnId, setReturnId] = useState<string | null>(null);
  const [damage, setDamage] = useState(false);
  const [damageCharge, setDamageCharge] = useState('0');

  const loans = useMemo(
    () => listStandbyLoans().filter((l) => statusFilter === 'all' || l.status === statusFilter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [statusFilter, refresh],
  );
  const overdueCount = useMemo(
    () => listOverdueStandbyLoans().length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refresh],
  );

  const handleReturn = (): void => {
    if (!returnId) return;
    returnStandbyLoan(returnId, ACTOR, damage, roundTo(dMul(Number(damageCharge), 100), 0));
    setReturnOpen(false); setReturnId(null); setDamage(false); setDamageCharge('0');
    toast.success('Loan returned'); setRefresh((r) => r + 1);
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Standby Loans</h1>
        <p className="text-sm text-muted-foreground">{loans.length} loan(s)</p>
      </div>

      {overdueCount > 0 && (
        <Card className="p-3 border-destructive bg-destructive/10 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">{overdueCount} loan(s) overdue</span>
        </Card>
      )}

      <Card className="p-4">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StandbyLoanStatus | 'all')}>
          <SelectTrigger className="max-w-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      <Card className="p-0 overflow-hidden">
        {loans.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No standby loans.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="p-3 font-medium">Ticket</th>
                <th className="p-3 font-medium">Customer</th>
                <th className="p-3 font-medium">Serial</th>
                <th className="p-3 font-medium">Model</th>
                <th className="p-3 font-medium">Out</th>
                <th className="p-3 font-medium">Expected</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Days Overdue</th>
                <th className="p-3 font-medium">Total ₹</th>
                <th className="p-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {loans.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="p-3 font-mono text-xs">{l.ticket_id}</td>
                  <td className="p-3">{l.customer_id}</td>
                  <td className="p-3 font-mono text-xs">{l.loaner_serial}</td>
                  <td className="p-3">{l.loaner_model}</td>
                  <td className="p-3 font-mono text-xs">{l.loaned_out_at.slice(0, 10)}</td>
                  <td className="p-3 font-mono text-xs">{l.expected_return_date.slice(0, 10)}</td>
                  <td className="p-3"><Badge variant={l.status === 'out' ? 'default' : 'outline'}>{l.status}</Badge></td>
                  <td className="p-3 font-mono text-xs">{l.status === 'out' ? daysOverdue(l.expected_return_date) : 0}</td>
                  <td className="p-3 font-mono">{(l.total_cost_paise / 100).toFixed(2)}</td>
                  <td className="p-3 text-right">
                    {l.status === 'out' && (
                      <Button size="sm" variant="ghost" onClick={() => { setReturnId(l.id); setReturnOpen(true); }}>Mark Returned</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark Returned</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="dmg" checked={damage} onChange={(e) => setDamage(e.target.checked)} />
              <Label htmlFor="dmg">Damage on return</Label>
            </div>
            {damage && (
              <div><Label>Damage Charge ₹</Label><Input type="number" value={damageCharge} onChange={(e) => setDamageCharge(e.target.value)} /></div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen(false)}>Cancel</Button>
            <Button onClick={handleReturn}>Confirm Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
