/**
 * @file     FiscalYearMaster.tsx
 * @purpose  FY Calendar Master — list FYs with 12-period grid, lock/unlock, close.
 *           Panel export for Command Center embedding + page export for standalone route.
 * @sprint   T-H1.5-C-S3
 * @finding  CC-015
 */
import { useState, useMemo } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Calendar, Plus, Lock, Unlock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  buildFiscalYear, readFiscalYears, writeFiscalYears,
} from '@/lib/fiscal-year-engine';
import type { FiscalYear } from '@/types/fiscal-year';

const MONTH_OPTIONS = [
  { v: 1, l: 'January' }, { v: 2, l: 'February' }, { v: 3, l: 'March' },
  { v: 4, l: 'April' },   { v: 5, l: 'May' },      { v: 6, l: 'June' },
  { v: 7, l: 'July' },    { v: 8, l: 'August' },   { v: 9, l: 'September' },
  { v: 10, l: 'October' },{ v: 11, l: 'November' },{ v: 12, l: 'December' },
];

export function FiscalYearMasterPanel() {
  const { entityCode } = useEntityCode();
  const [years, setYears] = useState<FiscalYear[]>(() =>
    entityCode ? readFiscalYears(entityCode) : [],
  );
  const [activeId, setActiveId] = useState<string | null>(years[0]?.id ?? null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newStartYear, setNewStartYear] = useState(new Date().getFullYear());
  const [newStartMonth, setNewStartMonth] = useState(4);

  const activeFy = useMemo(
    () => years.find(y => y.id === activeId) ?? null,
    [years, activeId],
  );

  function persist(next: FiscalYear[]) {
    setYears(next);
    if (entityCode) writeFiscalYears(entityCode, next);
  }

  function handleCreate() {
    if (!entityCode) {
      toast.error('Select a company to continue');
      return;
    }
    const fy = buildFiscalYear(newStartYear, newStartMonth);
    if (years.some(y => y.id === fy.id)) {
      toast.error(`FY ${fy.label} already exists`);
      return;
    }
    const next = [...years, fy].sort((a, b) => a.startDate.localeCompare(b.startDate));
    persist(next);
    setActiveId(fy.id);
    setCreateOpen(false);
    toast.success(`FY ${fy.label} created with 12 periods`);
  }

  function handleLockPeriod(fyId: string, periodNumber: number) {
    const next = years.map(fy => {
      if (fy.id !== fyId || fy.closed) return fy;
      return {
        ...fy,
        periods: fy.periods.map(p => p.periodNumber === periodNumber
          ? { ...p, locked: true, lockedAt: new Date().toISOString(), lockedBy: 'current-user' }
          : p,
        ),
      };
    });
    persist(next);
    toast.success(`Period ${periodNumber} locked`);
  }

  function handleUnlockPeriod(fyId: string, periodNumber: number) {
    const fy = years.find(y => y.id === fyId);
    if (!fy) return;
    if (fy.closed) {
      toast.error('Cannot unlock period — FY is closed');
      return;
    }
    const next = years.map(y => y.id !== fyId ? y : {
      ...y,
      periods: y.periods.map(p => p.periodNumber === periodNumber
        ? { ...p, locked: false, lockedAt: null, lockedBy: null }
        : p,
      ),
    });
    persist(next);
    toast.success(`Period ${periodNumber} unlocked`);
  }

  function handleCloseFy(fyId: string) {
    const next = years.map(y => y.id !== fyId ? y : {
      ...y,
      closed: true,
      closedAt: new Date().toISOString(),
    });
    persist(next);
    toast.success('Fiscal Year closed');
  }

  if (!entityCode) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-8 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 mx-auto text-amber-500" />
          <h2 className="text-lg font-semibold text-foreground">Select a company to continue</h2>
          <p className="text-sm text-muted-foreground">
            Fiscal Year calendars are scoped per-entity. Choose a company in the header dropdown.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Fiscal Year Calendar</h1>
            <Badge className="text-[10px] bg-indigo-500/10 text-indigo-600 border-indigo-500/20">FineCore</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            12-period FY calendar with lock-period and close-FY governance for entity{' '}
            <span className="font-mono text-foreground">{entityCode}</span>.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create New FY
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Fiscal Year</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Start Year</Label>
                <Input
                  type="number"
                  value={newStartYear}
                  onChange={e => setNewStartYear(Number(e.target.value) || new Date().getFullYear())}
                  className="text-xs font-mono"
                  min={2000}
                  max={2100}
                />
              </div>
              <div>
                <Label className="text-xs">Start Month</Label>
                <select
                  value={newStartMonth}
                  onChange={e => setNewStartMonth(Number(e.target.value))}
                  className="w-full h-9 rounded-lg border border-border bg-background text-xs px-2"
                >
                  {MONTH_OPTIONS.map(m => (
                    <option key={m.v} value={m.v}>{m.l}</option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">India default: April</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Create FY</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* FY List */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Fiscal Years ({years.length})
        </h2>
        {years.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No fiscal years yet. Create one to begin.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {years.map(fy => {
              const lockedCount = fy.periods.filter(p => p.locked).length;
              return (
                <button
                  key={fy.id}
                  onClick={() => setActiveId(fy.id)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    activeId === fy.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card/60 hover:border-muted-foreground/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-semibold text-foreground">{fy.label}</span>
                    {fy.closed ? (
                      <Badge className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/20">Closed</Badge>
                    ) : lockedCount === 12 ? (
                      <Badge className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">All Locked</Badge>
                    ) : lockedCount > 0 ? (
                      <Badge className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">{lockedCount}/12 Locked</Badge>
                    ) : (
                      <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Open</Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {fy.startDate} → {fy.endDate}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Period Grid for active FY */}
      {activeFy && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Periods — FY {activeFy.label}
            </h2>
            {!activeFy.closed && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="text-rose-600 border-rose-500/30 hover:bg-rose-500/10">
                    <ShieldCheck className="h-4 w-4 mr-1" /> Close FY
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Close Fiscal Year {activeFy.label}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Closing an FY blocks all voucher creation across all 12 periods. Periods cannot
                      be unlocked individually after closure. This action cannot be undone here —
                      reopen requires governance approval (later sprint).
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleCloseFy(activeFy.id)}>
                      Close FY
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card/60 backdrop-blur-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] uppercase">#</TableHead>
                  <TableHead className="text-[10px] uppercase">Period</TableHead>
                  <TableHead className="text-[10px] uppercase">Start</TableHead>
                  <TableHead className="text-[10px] uppercase">End</TableHead>
                  <TableHead className="text-[10px] uppercase">Status</TableHead>
                  <TableHead className="text-[10px] uppercase">Locked At</TableHead>
                  <TableHead className="text-[10px] uppercase text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeFy.periods.map(p => (
                  <TableRow key={`${activeFy.id}-${p.periodNumber}`}>
                    <TableCell className="font-mono text-xs">{p.periodNumber}</TableCell>
                    <TableCell className="text-xs font-medium">{p.label}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{p.startDate}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{p.endDate}</TableCell>
                    <TableCell>
                      {activeFy.closed ? (
                        <Badge className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/20">Closed</Badge>
                      ) : p.locked ? (
                        <Badge className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">Locked</Badge>
                      ) : (
                        <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Open</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-[11px] font-mono text-muted-foreground">
                      {p.lockedAt ? p.lockedAt.slice(0, 10) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {activeFy.closed ? (
                        <span className="text-[10px] text-muted-foreground">FY closed</span>
                      ) : p.locked ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-7"
                          onClick={() => handleUnlockPeriod(activeFy.id, p.periodNumber)}
                        >
                          <Unlock className="h-3.5 w-3.5 mr-1" /> Unlock
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-7"
                          onClick={() => handleLockPeriod(activeFy.id, p.periodNumber)}
                        >
                          <Lock className="h-3.5 w-3.5 mr-1" /> Lock
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FiscalYearMaster() {
  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex flex-col">
        <ERPHeader />
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          <FiscalYearMasterPanel />
        </main>
      </div>
    </SidebarProvider>
  );
}
