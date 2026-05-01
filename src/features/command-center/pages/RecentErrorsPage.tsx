/**
 * RecentErrorsPage.tsx — Centralized ops error log viewer
 * Sprint T-Phase-1.2.5h-b2 · Card #2.5
 */
import { useEffect, useMemo, useState } from 'react';
import { Trash2, AlertTriangle, Info, AlertCircle, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { readErrorLog, clearErrorLog } from '@/lib/error-engine';
import type { ErrorCategory, ErrorSeverity, ErrorLogEntry } from '@/types/error-log';
import { toast } from 'sonner';

const CATEGORIES: ErrorCategory[] = [
  'voucher_post', 'stock_balance', 'validation', 'migration',
  'quota', 'audit_trail', 'network', 'unknown',
];
const SEVERITIES: ErrorSeverity[] = ['info', 'warn', 'error', 'critical'];

const SEVERITY_ICON: Record<ErrorSeverity, typeof Info> = {
  info: Info, warn: AlertTriangle, error: AlertCircle, critical: Bug,
};
const SEVERITY_CLASS: Record<ErrorSeverity, string> = {
  info:     'bg-primary/10 text-primary border-primary/30',
  warn:     'bg-warning/10 text-warning border-warning/30',
  error:    'bg-destructive/10 text-destructive border-destructive/30',
  critical: 'bg-destructive/20 text-destructive border-destructive/50',
};

function getActiveEntity(): string {
  try {
    const raw = localStorage.getItem('erp_selected_company');
    return raw && raw !== 'all' ? raw : 'system';
  } catch { return 'system'; }
}

export default function RecentErrorsPage() {
  const [entityCode] = useState<string>(() => getActiveEntity());
  const [severity, setSeverity] = useState<string>('all');
  const [category, setCategory] = useState<string>('all');
  const [window, setWindow] = useState<'24h' | 'all'>('all');
  const [refreshTick, setRefreshTick] = useState(0);

  // Re-poll every 10s so newly-logged errors surface
  useEffect(() => {
    const id = setInterval(() => setRefreshTick(t => t + 1), 10000);
    return () => clearInterval(id);
  }, []);

  const entries: ErrorLogEntry[] = useMemo(() => {
    const sinceIso = window === '24h'
      ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      : undefined;
    return readErrorLog(entityCode, {
      severity: severity === 'all' ? undefined : severity as ErrorSeverity,
      category: category === 'all' ? undefined : category as ErrorCategory,
      sinceIso,
      limit: 200,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, severity, category, window, refreshTick]);

  const handleClear = () => {
    clearErrorLog(entityCode);
    setRefreshTick(t => t + 1);
    toast.success('Error log cleared for this entity');
  };

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Recent Errors</h1>
          <p className="text-xs text-muted-foreground font-mono">
            Entity: {entityCode} · {entries.length} entries (cap 200)
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Trash2 className="h-4 w-4" /> Clear log
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear ops error log?</AlertDialogTitle>
              <AlertDialogDescription>
                This clears the operational error log for <span className="font-mono">{entityCode}</span> only.
                The audit trail (compliance log) is unaffected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClear}>Clear</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            {SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={window} onValueChange={(v) => setWindow(v as '24h' | 'all')}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24h</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Time</TableHead>
              <TableHead className="text-xs">Severity</TableHead>
              <TableHead className="text-xs">Category</TableHead>
              <TableHead className="text-xs">Message</TableHead>
              <TableHead className="text-xs">User</TableHead>
              <TableHead className="text-xs">Context</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">
                  No errors logged for the selected filters.
                </TableCell>
              </TableRow>
            ) : entries.map(e => {
              const Icon = SEVERITY_ICON[e.severity];
              return (
                <TableRow key={e.id}>
                  <TableCell className="text-[10px] font-mono whitespace-nowrap">
                    {new Date(e.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] gap-1 ${SEVERITY_CLASS[e.severity]}`}>
                      <Icon className="h-3 w-3" /> {e.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono">{e.category}</TableCell>
                  <TableCell className="text-xs max-w-md">{e.message}</TableCell>
                  <TableCell className="text-xs">{e.user_name}</TableCell>
                  <TableCell className="text-[10px] font-mono text-muted-foreground max-w-xs truncate">
                    {Object.keys(e.context).length > 0 ? JSON.stringify(e.context) : '—'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
