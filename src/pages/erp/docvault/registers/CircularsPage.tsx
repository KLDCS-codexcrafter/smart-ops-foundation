/**
 * @file        src/pages/erp/docvault/registers/CircularsPage.tsx
 * @purpose     S144 · TF-34 Read-and-Understood Circulars · publish · ack · status
 * @sprint      Sprint 144 · T-TaskFlow-A641.8 · Block 4
 */
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  listCirculars, publishCircular, acknowledgeCircular,
  getCircularStatus, closeCircular, listCircularAcks,
  type CircularStatus,
} from '@/lib/docvault-governance-engine';
import type { Circular } from '@/types/docvault';

export default function CircularsPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const byUserId = user?.id ?? 'demo-user';
  const [items, setItems] = useState<Circular[]>([]);
  const [docId, setDocId] = useState('');
  const [title, setTitle] = useState('');
  const [statusMap, setStatusMap] = useState<Record<string, CircularStatus>>({});

  const refresh = useCallback(() => {
    const list = listCirculars(entityCode);
    setItems(list);
    const m: Record<string, CircularStatus> = {};
    for (const c of list) m[c.id] = getCircularStatus(entityCode, c.id);
    setStatusMap(m);
  }, [entityCode]);
  useEffect(() => { refresh(); }, [refresh]);

  const onPublish = (): void => {
    if (!docId || !title) { toast.error('Document ID and title required'); return; }
    try {
      publishCircular(entityCode, {
        document_id: docId, title, target: 'all', published_by: byUserId,
      });
      toast.success('Circular published'); setDocId(''); setTitle(''); refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
  };
  const onAck = (id: string): void => {
    try { acknowledgeCircular(entityCode, id, byUserId); toast.success('Acknowledged'); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
  };
  const onClose = (id: string): void => {
    closeCircular(entityCode, id, byUserId); toast.success('Closed'); refresh();
  };
  const onExport = (id: string): void => {
    const acks = listCircularAcks(entityCode, id);
    const blob = new Blob([JSON.stringify(acks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `circular-${id}-acks.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader><CardTitle>Publish circular (TF-34)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Document ID (published)</Label><Input value={docId} onChange={(e) => setDocId(e.target.value)} /></div>
            <div className="col-span-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          </div>
          <Button onClick={onPublish}>Publish to all employees</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Circulars</CardTitle></CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No circulars yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground">
                <th className="py-2">Title</th><th>Target</th><th>Progress</th><th>Pending</th><th></th>
              </tr></thead>
              <tbody>
                {items.map((c) => {
                  const s = statusMap[c.id];
                  return (
                    <tr key={c.id} className="border-t border-border">
                      <td className="py-2">{c.title}</td>
                      <td><Badge variant="outline">{c.target}</Badge></td>
                      <td className="font-mono text-xs">{s ? `${s.acknowledged}/${s.targeted} (${s.pct}%)` : '—'}</td>
                      <td className="font-mono text-xs text-muted-foreground">{s ? s.pending.length : 0}</td>
                      <td className="text-right space-x-1">
                        <Button size="sm" variant="outline" onClick={() => onAck(c.id)}>Acknowledge</Button>
                        <Button size="sm" variant="outline" onClick={() => onExport(c.id)}>Export</Button>
                        {!c.closed_at && <Button size="sm" variant="ghost" onClick={() => onClose(c.id)}>Close</Button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
