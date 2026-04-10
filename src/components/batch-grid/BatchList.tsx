import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pencil, Trash2, Package, Activity, ShieldAlert, Clock } from 'lucide-react';
import type { Batch } from '@/types/batch';

interface BatchListProps {
  batches: Batch[];
  onEdit: (batch: Batch) => void;
  onDelete: (id: string) => void;
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  expired: 'bg-red-500/15 text-red-700 dark:text-red-400',
  consumed: 'bg-slate-500/15 text-slate-700 dark:text-slate-400',
  quarantine: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
};

const BatchList: React.FC<BatchListProps> = ({ batches, onEdit, onDelete }) => {
  const today = new Date();
  const activeBatches = batches?.filter(b => b.status === 'active').length ?? 0;
  const qcHoldBatches = batches?.filter(b => b.qc_hold).length ?? 0;
  const expiringSoon = batches?.filter(b => {
    if (!b.expiry_date) return false;
    const d = Math.ceil((new Date(b.expiry_date).getTime() - today.getTime()) / 86400000);
    return d >= 0 && d <= 30;
  }).length ?? 0;

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{batches.length}</p>
              <p className="text-xs text-muted-foreground">Total Batches</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold">{activeBatches}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{qcHoldBatches}</p>
              <p className="text-xs text-muted-foreground">
                On QC Hold {qcHoldBatches > 0 && <Badge variant="outline" className="ml-1 text-[10px] border-amber-500/40 text-amber-600">Hold</Badge>}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{expiringSoon}</p>
              <p className="text-xs text-muted-foreground">
                Expiring Soon {expiringSoon > 0 && <Badge variant="destructive" className="ml-1 text-[10px]">≤30d</Badge>}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Batch #</TableHead>
            <TableHead>Stock Item</TableHead>
            <TableHead>Qty</TableHead>
            <TableHead>Mfg Date</TableHead>
            <TableHead>Expiry</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>QC Hold</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                No batches found. Create your first batch.
              </TableCell>
            </TableRow>
          ) : (
            batches.map(batch => (
              <TableRow key={batch.id}>
                <TableCell className="font-mono text-xs">{batch.batch_number}</TableCell>
                <TableCell className="font-medium">{batch.stock_item_name}</TableCell>
                <TableCell>{batch.quantity} {batch.unit}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{batch.manufacturing_date ?? '-'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{batch.expiry_date ?? '-'}</TableCell>
                <TableCell>
                  <Badge className={statusColors[batch.status] ?? ''} variant="secondary">
                    {batch.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {batch.godown_name || '—'}
                </TableCell>
                <TableCell>
                  {batch.qc_hold && (
                    <Badge variant="destructive" className="text-xs">Hold</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(batch)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(batch.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default BatchList;
