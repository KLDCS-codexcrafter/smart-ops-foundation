/**
 * DispatchExceptions.tsx — Damage / missing / refused queue. Sprint 15a.
 */

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download } from 'lucide-react';
import type { POD, PODExceptionType } from '@/types/pod';
import { podsKey } from '@/types/pod';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { toast } from 'sonner';

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) as T[] : []; }
  catch { return []; }
}

const TYPES: PODExceptionType[] = ['damage', 'short_qty', 'wrong_item', 'refused', 'other'];

export function DispatchExceptionsPanel() {
  const { entityCode } = useCardEntitlement();
  const [pods, setPods] = useState<POD[]>([]);

  useEffect(() => { setPods(ls<POD>(podsKey(entityCode))); }, [entityCode]);

  const exceptions = useMemo(
    () => pods.filter(p => p.is_exception || p.status === 'disputed'),
    [pods],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    TYPES.forEach(t => { c[t] = exceptions.filter(p => p.exception_type === t).length; });
    return c;
  }, [exceptions]);

  const updatePod = (id: string, patch: Partial<POD>) => {
    const all = ls<POD>(podsKey(entityCode));
    const next = all.map(p => p.id === id
      ? { ...p, ...patch, updated_at: new Date().toISOString() } : p);
    // [JWT] PUT /api/dispatch/pods/:id
    localStorage.setItem(podsKey(entityCode), JSON.stringify(next));
    setPods(next);
  };

  const exportCSV = () => {
    const rows = exceptions.map(p => [
      p.id, p.dln_voucher_no, p.exception_type ?? '', p.status, p.captured_at,
      (p.exception_notes ?? '').replace(/\n/g, ' '),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = ['POD,DLN,Exception,Status,Captured,Notes', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `dispatch-exceptions-${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Exported');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Dispatch Exceptions</h1>
        <Button size="sm" variant="outline" onClick={exportCSV}
          className="border-blue-500/30 text-blue-600 hover:bg-blue-500/10">
          <Download className="h-3.5 w-3.5 mr-1.5" />Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {TYPES.map(t => (
          <Card key={t}>
            <CardContent className="pt-4 pb-4">
              <p className="text-[10px] uppercase text-muted-foreground tracking-wider">{t.replace('_', ' ')}</p>
              <p className="text-2xl font-bold font-mono mt-1">{counts[t] ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-5">
          {exceptions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No exceptions on file.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground border-b">
                    <th className="py-2">POD</th><th>DLN</th><th>Type</th>
                    <th>Notes</th><th>Captured</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {exceptions.map(p => (
                    <tr key={p.id} className="border-b hover:bg-blue-500/5">
                      <td className="py-2 font-mono text-xs">{p.id.slice(-8)}</td>
                      <td className="font-mono text-xs">{p.dln_voucher_no}</td>
                      <td>
                        <Badge variant="outline" className="text-[10px]">
                          {p.exception_type ?? '—'}
                        </Badge>
                      </td>
                      <td className="text-xs max-w-xs truncate">{p.exception_notes ?? '—'}</td>
                      <td className="text-xs">{new Date(p.captured_at).toLocaleString('en-IN')}</td>
                      <td>
                        <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
                      </td>
                      <td className="text-right space-x-1">
                        <Button size="sm" variant="ghost" className="h-7 text-xs"
                          onClick={() => updatePod(p.id, { status: 'disputed' })}>
                          Mark Review
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-600"
                          onClick={() => toast.info('Debit-note workflow — Sprint 15c')}>
                          Raise DN
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-600"
                          onClick={() => updatePod(p.id, { status: 'verified', is_exception: false })}>
                          Close
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default DispatchExceptionsPanel;
