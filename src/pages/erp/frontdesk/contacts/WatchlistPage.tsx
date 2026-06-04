/**
 * @file        src/pages/erp/frontdesk/contacts/WatchlistPage.tsx
 * @sprint      Sprint 145 · T-FrontDesk-A6F.1 · Block 4
 */
import { useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { listWatchlist, addWatchlistEntry, removeWatchlistEntry } from '@/lib/frontdesk-engine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';

export function WatchlistPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const me = useCurrentUser();
  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');

  const rows = useMemo(() => listWatchlist(entityCode), [entityCode, tick]);

  function submit(): void {
    try {
      addWatchlistEntry(entityCode, {
        name, company: company || null, phone: phone || null,
        reason, flaggedByUserId: me?.id ?? 'demo-user',
      });
      toast.success('Added to watchlist');
      setName(''); setCompany(''); setPhone(''); setReason(''); setOpen(false);
      setTick((n) => n + 1);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function remove(id: string): void {
    try {
      removeWatchlistEntry(entityCode, id, me?.id ?? 'demo-user');
      toast.success('Removed');
      setTick((n) => n + 1);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Watchlist</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Add entry</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add to Watchlist</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div><Label>Company</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} /></div>
                <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={10} /></div>
                <div><Label>Reason * (mandatory · symmetric visibility)</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} /></div>
                <Button onClick={submit} disabled={!name.trim() || !reason.trim()}>Add</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground p-8 text-center">Watchlist is empty.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Flagged at</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((w) => (
                  <TableRow key={w.id} className={w.removedAt ? 'opacity-50' : ''}>
                    <TableCell>{w.name}</TableCell>
                    <TableCell>{w.company ?? '—'}</TableCell>
                    <TableCell className="font-mono">{w.phone ?? '—'}</TableCell>
                    <TableCell className="text-xs">{w.reason}</TableCell>
                    <TableCell className="font-mono text-xs">{new Date(w.flaggedAt).toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right">
                      {!w.removedAt && (
                        <Button size="sm" variant="outline" onClick={() => remove(w.id)}>
                          <X className="h-3 w-3 mr-1" /> Remove
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
