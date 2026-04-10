import { useState, useMemo } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Printer, Play, XCircle, RotateCw, Clock, CheckCircle2, Tags, AlertTriangle, Search, Info, BarChart3 } from 'lucide-react';
import type { PrintJob, PrintJobStatus } from '@/types/print-job';

const KEY = 'erp_print_jobs';
const ld = (): PrintJob[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const sv = (d: PrintJob[]) => { localStorage.setItem(KEY, JSON.stringify(d)); /* [JWT] CRUD /api/labels/print-jobs */ };

const REPRINT_REASONS = [
  'Label fell off',
  'Label damaged',
  'Wrong information printed',
  'Batch correction',
  'Additional quantity needed',
  'Quality issue',
];

const statusColor = (s: PrintJobStatus) => {
  switch (s) {
    case 'pending': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    case 'printing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'cancelled': return 'bg-muted text-muted-foreground';
  }
};

export function PrintQueuePanel() {
  const [jobs, setJobs] = useState<PrintJob[]>(ld());
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('pending');
  const [reprintOpen, setReprintOpen] = useState(false);
  const [reprintJob, setReprintJob] = useState<PrintJob | null>(null);
  const [reprintReason, setReprintReason] = useState('');
  const [reprintAuth, setReprintAuth] = useState('');

  const update = (u: PrintJob[]) => { setJobs(u); sv(u); };

  // Stats
  const pending = jobs.filter(j => j.status === 'pending' || j.status === 'printing');
  const completed = jobs.filter(j => j.status === 'completed');
  const totalPrinted = jobs.reduce((s, j) => s + j.printed_count, 0);
  const reprints = jobs.filter(j => j.is_reprint);

  // Play: pending → printing → completed (2s)
  const startPrint = (j: PrintJob) => {
    const u1 = jobs.map(x => x.id === j.id ? { ...x, status: 'printing' as PrintJobStatus, updated_at: new Date().toISOString() } : x);
    update(u1);
    toast.info(`Printing ${j.job_number}...`);
    // [JWT] POST /api/labels/print-jobs/:id/print
    setTimeout(() => {
      setJobs(prev => {
        const u2 = prev.map(x => x.id === j.id ? {
          ...x, status: 'completed' as PrintJobStatus,
          printed_count: x.quantity,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } : x);
        sv(u2);
        return u2;
      });
      toast.success(`${j.job_number} printed successfully`);
      // [JWT] PATCH /api/labels/print-jobs/:id {status:'completed'}
    }, 2000);
  };

  // Cancel
  const cancelJob = (j: PrintJob) => {
    const u = jobs.map(x => x.id === j.id ? { ...x, status: 'cancelled' as PrintJobStatus, updated_at: new Date().toISOString() } : x);
    update(u);
    toast.success(`${j.job_number} cancelled`);
    // [JWT] PATCH /api/labels/print-jobs/:id {status:'cancelled'}
  };

  // Reprint
  const openReprint = (j: PrintJob) => { setReprintJob(j); setReprintReason(''); setReprintAuth(''); setReprintOpen(true); };
  const submitReprint = () => {
    if (!reprintJob || !reprintReason || !reprintAuth) { toast.error('Fill all reprint fields'); return; }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const rp: PrintJob = {
      id,
      job_number: `RPR-${id.slice(0, 5).toUpperCase()}`,
      item_id: reprintJob.item_id,
      item_code: reprintJob.item_code,
      item_name: reprintJob.item_name,
      label_template_id: reprintJob.label_template_id,
      label_template_name: reprintJob.label_template_name,
      template_version: reprintJob.template_version,
      barcode_type: reprintJob.barcode_type,
      quantity: reprintJob.quantity,
      printed_count: 0,
      source: reprintJob.source,
      source_ref: reprintJob.source_ref,
      status: 'pending',
      is_reprint: true,
      reprint_reason: reprintReason,
      reprint_authorized_by: reprintAuth,
      original_job_id: reprintJob.id,
      created_by: reprintJob.created_by,
      notes: `Reprint of ${reprintJob.job_number}: ${reprintReason}`,
      created_at: now,
      updated_at: now,
      completed_at: null,
    };
    update([rp, ...jobs]);
    setReprintOpen(false);
    toast.success(`Reprint job ${rp.job_number} created`);
    // [JWT] POST /api/labels/print-jobs (reprint)
  };

  // Filtered lists
  const q = search.toLowerCase();
  const pendingJobs = jobs.filter(j => (j.status === 'pending' || j.status === 'printing') && (j.job_number.toLowerCase().includes(q) || (j.item_name || '').toLowerCase().includes(q)));
  const historyJobs = jobs.filter(j => j.status === 'completed' || j.status === 'cancelled' || j.status === 'failed').filter(j => j.job_number.toLowerCase().includes(q) || (j.item_name || '').toLowerCase().includes(q));

  // Analytics
  const byTemplate = useMemo(() => {
    const m: Record<string, number> = {};
    jobs.filter(j => j.status === 'completed').forEach(j => { m[j.label_template_name] = (m[j.label_template_name] || 0) + j.printed_count; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [jobs]);

  const reprintRate = useMemo(() => {
    const total = jobs.length || 1;
    const rate = ((reprints.length / total) * 100).toFixed(1);
    const reasons: Record<string, number> = {};
    reprints.forEach(r => { if (r.reprint_reason) reasons[r.reprint_reason] = (reasons[r.reprint_reason] || 0) + 1; });
    return { rate, reasons: Object.entries(reasons).sort((a, b) => b[1] - a[1]) };
  }, [jobs, reprints]);

  const bySource = useMemo(() => {
    const m: Record<string, number> = {};
    jobs.forEach(j => { m[j.source] = (m[j.source] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [jobs]);

  const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const srcLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const JobTable = ({ data, showActions }: { data: PrintJob[]; showActions: 'pending' | 'history' }) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Job No</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>Template</TableHead>
            <TableHead className="text-center">Qty</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 && (
            <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No jobs found</TableCell></TableRow>
          )}
          {data.map(j => (
            <TableRow key={j.id}>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="font-mono text-xs">{j.job_number}</Badge>
                  {j.is_reprint && <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] px-1.5">REPRINT</Badge>}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm font-medium">{j.item_name || '—'}</div>
                {j.item_code && <div className="text-xs text-muted-foreground">{j.item_code}</div>}
              </TableCell>
              <TableCell className="text-sm">{j.label_template_name}</TableCell>
              <TableCell className="text-center text-sm">{j.printed_count}/{j.quantity}</TableCell>
              <TableCell><Badge className={statusColor(j.status)}>{j.status}</Badge></TableCell>
              <TableCell className="text-xs text-muted-foreground">{fmtDate(j.created_at)}</TableCell>
              <TableCell className="text-right">
                {showActions === 'pending' && (
                  <div className="flex justify-end gap-1">
                    {j.status === 'pending' && (
                      <>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => startPrint(j)} title="Start Print"><Play className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => cancelJob(j)} title="Cancel"><XCircle className="h-4 w-4" /></Button>
                      </>
                    )}
                    {j.status === 'printing' && <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse">Printing...</Badge>}
                  </div>
                )}
                {showActions === 'history' && j.status === 'completed' && (
                  <Button size="sm" variant="outline" className="text-amber-600 border-amber-300" onClick={() => openReprint(j)}>
                    <RotateCw className="h-3.5 w-3.5 mr-1" />Reprint
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Printer className="h-6 w-6" />Print Queue</h1>
        <p className="text-sm text-muted-foreground">Monitor and manage label print jobs across all modules</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold">{pending.length}</p></div><Clock className="h-8 w-8 text-amber-500" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Completed</p><p className="text-2xl font-bold">{completed.length}</p></div><CheckCircle2 className="h-8 w-8 text-green-500" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Labels Printed</p><p className="text-2xl font-bold">{totalPrinted}</p></div><Tags className="h-8 w-8 text-primary" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Reprints</p><p className="text-2xl font-bold">{reprints.length}</p></div><AlertTriangle className="h-8 w-8 text-amber-500" /></div></CardContent></Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by job number or item name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending / Active</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <JobTable data={pendingJobs} showActions="pending" />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <JobTable data={historyJobs} showActions="history" />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* By Template */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" />By Template</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {byTemplate.length === 0 && <p className="text-sm text-muted-foreground">No data yet</p>}
                {byTemplate.map(([name, qty]) => (
                  <div key={name} className="flex justify-between text-sm"><span className="truncate">{name}</span><Badge variant="secondary">{qty}</Badge></div>
                ))}
              </CardContent>
            </Card>

            {/* Reprint Rate */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><RotateCw className="h-4 w-4" />Reprint Rate</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-2xl font-bold">{reprintRate.rate}%</p>
                {reprintRate.reasons.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Top Reasons</p>
                    {reprintRate.reasons.map(([reason, count]) => (
                      <div key={reason} className="flex justify-between text-sm"><span className="truncate">{reason}</span><Badge variant="outline">{count}</Badge></div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* By Source */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Tags className="h-4 w-4" />By Source</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {bySource.length === 0 && <p className="text-sm text-muted-foreground">No data yet</p>}
                {bySource.map(([src, count]) => (
                  <div key={src} className="flex justify-between text-sm"><span>{srcLabel(src)}</span><Badge variant="secondary">{count}</Badge></div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* GRN Integration Note */}
          <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">GRN Auto-Print Integration</p>
                  <p className="text-sm text-muted-foreground mt-1">When GRN (Goods Receipt Note) is processed, labels will be automatically queued for printing based on receipt rules.</p>
                  <p className="text-xs font-mono text-muted-foreground mt-2">// [JWT] POST /api/labels/print-jobs/grn-trigger &#123; grn_id, items[] &#125;</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reprint Dialog */}
      <Dialog open={reprintOpen} onOpenChange={setReprintOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprint Job — {reprintJob?.job_number}</DialogTitle>
            <DialogDescription>Create a reprint job for this label. Authorization is required.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reprint Reason</Label>
              <Select value={reprintReason} onValueChange={setReprintReason}>
                <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
                <SelectContent>
                  {REPRINT_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Authorized By</Label>
              <Input placeholder="Name of authorizing person" value={reprintAuth} onChange={e => setReprintAuth(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReprintOpen(false)}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={submitReprint}>
              <RotateCw className="h-4 w-4 mr-1" />Create Reprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PrintQueue() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader />
        <main className="flex-1"><PrintQueuePanel /></main>
      </div>
    </SidebarProvider>
  );
}
