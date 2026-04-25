import { useState } from 'react';
import { Search, Trash2, AlertTriangle, Edit2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBatches } from '@/hooks/useBatches';
import BatchFormDialog from './BatchFormDialog';
import type { Batch } from '@/types/batch';

export function BatchList() {
  const { batches, deleteBatch, createBatch, updateBatch } = useBatches();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBatch, setEditBatch] = useState<Batch | null>(null);

  const today = new Date();
  const active = batches.filter(b => b.status === 'active').length;
  const onHold = batches.filter(b => b.qc_hold).length;
  const expiring = batches.filter(b => {
    if (!b.expiry_date) return false;
    const d = Math.ceil((new Date(b.expiry_date).getTime() - today.getTime()) / 86400000);
    return d >= 0 && d <= 30;
  }).length;

  const filtered = batches.filter(b =>
    b.batch_number.toLowerCase().includes(search.toLowerCase()) ||
    (b.item_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div data-keyboard-form className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Batches</CardDescription>
            <CardTitle className="text-2xl">{batches.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">{active}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>On QC Hold</CardDescription>
            <CardTitle className="text-2xl text-amber-600">{onHold}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Expiring ≤30d</CardDescription>
            <CardTitle className="text-2xl text-red-600">{expiring}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-base">All Batches</CardTitle>
            <Button size="sm" className="gap-1.5" onClick={() => { setEditBatch(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4" /> Add Batch
            </Button>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8 h-9 w-56" placeholder="Search batches..."
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertTriangle className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {search ? 'No batches match your search' : 'No batches yet'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Batch No</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Item</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Qty</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Expiry</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Location</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">QC Hold</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(batch => (
                  <TableRow key={batch.id} className="group">
                    <TableCell className="font-mono text-xs font-medium">{batch.batch_number}</TableCell>
                    <TableCell className="text-sm">{batch.item_name || '—'}</TableCell>
                    <TableCell className="text-sm">{batch.quantity}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{batch.expiry_date || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{batch.godown_name || '—'}</TableCell>
                    <TableCell>
                      {batch.qc_hold && <Badge variant="destructive" className="text-xs">Hold</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={batch.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                        {batch.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => { setEditBatch(batch); setDialogOpen(true); }}>
                          <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => deleteBatch(batch.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <BatchFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editBatch={editBatch}
        onSubmit={data => {
          if (editBatch) {
            updateBatch(editBatch.id, data);
          } else {
            createBatch(data);
          }
          setDialogOpen(false);
          setEditBatch(null);
        }}
      />
    </div>
  );
}
