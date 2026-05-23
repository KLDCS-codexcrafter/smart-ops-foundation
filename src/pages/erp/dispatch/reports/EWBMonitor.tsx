/**
 * @file        EWBMonitor.tsx
 * @purpose     Sprint 46 Pass 1 · Theme A §1.4 · Inward EWB Monitor
 *              Lists InwardReceipts with EWB validity, sorted ascending by hours-left.
 *              Scope re-routed to inward EWB (Q1=A1 · 12th ratified spec deviation).
 * @module      dh-r-ewb-monitor
 * @reuses      listInwardReceipts (engine 0-DIFF)
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert } from 'lucide-react';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { listInwardReceipts } from '@/lib/inward-receipt-engine';
import { INWARD_STATUS_LABELS, type InwardReceipt } from '@/types/inward-receipt';

function hoursLeft(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 3_600_000;
}

function tone(hrs: number): { variant: 'outline' | 'destructive'; className: string; label: string } {
  if (hrs <= 0) return { variant: 'destructive', className: 'bg-destructive/15 text-destructive border-destructive/30', label: 'EXPIRED' };
  if (hrs < 4)  return { variant: 'outline',     className: 'bg-warning/15 text-warning border-warning/30',           label: `${hrs.toFixed(1)}h` };
  if (hrs < 24) return { variant: 'outline',     className: 'bg-muted text-muted-foreground border-muted-foreground/20', label: `${hrs.toFixed(1)}h` };
  return            { variant: 'outline',     className: '',                                                          label: `${Math.round(hrs)}h` };
}

export function EWBMonitorPanel(): JSX.Element {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const [rows, setRows] = useState<InwardReceipt[]>([]);

  useEffect(() => {
    const all = listInwardReceipts(safeEntity);
    const filtered = all.filter(r =>
      r.ewb_valid_till &&
      r.status !== 'released' &&
      r.status !== 'rejected' &&
      r.status !== 'cancelled',
    );
    filtered.sort((a, b) => hoursLeft(a.ewb_valid_till as string) - hoursLeft(b.ewb_valid_till as string));
    setRows(filtered);
  }, [safeEntity]);

  const kpis = useMemo(() => {
    let expired = 0, lt4 = 0, lt24 = 0;
    for (const r of rows) {
      const h = hoursLeft(r.ewb_valid_till as string);
      if (h <= 0) expired += 1;
      else if (h < 4) lt4 += 1;
      else if (h < 24) lt24 += 1;
    }
    return { expired, lt4, lt24 };
  }, [rows]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
          <ShieldAlert className="h-5 w-5 text-warning" />
        </div>
        <div>
          <h1 className="text-xl font-bold">EWB Monitor</h1>
          <p className="text-xs text-muted-foreground">Inward E-Way Bills · sorted by validity remaining</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card><CardContent className="pt-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Expired</p>
          <p className="text-2xl font-bold font-mono mt-1 text-destructive">{kpis.expired}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{'< 4 hours'}</p>
          <p className="text-2xl font-bold font-mono mt-1 text-warning">{kpis.lt4}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{'< 24 hours'}</p>
          <p className="text-2xl font-bold font-mono mt-1">{kpis.lt24}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-5">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No active inward EWBs.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground border-b">
                    <th className="py-2">Receipt No</th>
                    <th>Arrival</th>
                    <th>Vendor</th>
                    <th>EWB No</th>
                    <th>Valid Till</th>
                    <th>Time Left</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const hrs = hoursLeft(r.ewb_valid_till as string);
                    const t = tone(hrs);
                    return (
                      <tr key={r.id} className="border-b hover:bg-muted/30">
                        <td className="py-2 font-mono text-xs">{r.receipt_no}</td>
                        <td className="font-mono text-xs">{r.arrival_date}</td>
                        <td className="text-sm">{r.vendor_name}</td>
                        <td className="font-mono text-xs">{r.ewb_number}</td>
                        <td className="font-mono text-xs">{(r.ewb_valid_till as string).replace('T', ' ').slice(0, 16)}</td>
                        <td>
                          <Badge variant={t.variant} className={`text-[10px] ${t.className}`}>{t.label}</Badge>
                        </td>
                        <td className="text-xs text-muted-foreground">{INWARD_STATUS_LABELS[r.status]}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default EWBMonitorPanel;
