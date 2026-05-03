/**
 * @file        RequestXVoucherTypesMaster.tsx
 * @sprint      T-Phase-1.2.6f-pre-2 · Block F
 * @purpose     Edit RequestX voucher types · reads from non-finecore registry · D-128 sibling.
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  getNonFineCoreVoucherTypes, saveNonFineCoreVoucherTypes,
  type NonFineCoreVoucherType,
} from '@/lib/non-finecore-voucher-type-registry';
import { inrFmt } from '@/lib/requestx-report-engine';

export function RequestXVoucherTypesMasterPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [types, setTypes] = useState<NonFineCoreVoucherType[]>([]);
  const [editing, setEditing] = useState<NonFineCoreVoucherType | null>(null);

  useEffect(() => {
    setTypes(getNonFineCoreVoucherTypes(entityCode));
  }, [entityCode]);

  const requestTypes = types.filter(t => t.family === 'request');

  const persist = (next: NonFineCoreVoucherType[]): void => {
    setTypes(next);
    saveNonFineCoreVoucherTypes(entityCode, next);
  };

  const saveEditing = (): void => {
    if (!editing) return;
    persist(types.map(t => t.id === editing.id ? editing : t));
    setEditing(null);
    toast.success('Voucher type updated');
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">RequestX Voucher Types</h1>
        <p className="text-xs text-muted-foreground">
          Material · Service · Capital indents · per-entity prefix and approval thresholds.
        </p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">RequestX types ({requestTypes.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Display Name</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead className="text-right">Approval Threshold</TableHead>
                <TableHead>Approval Role</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requestTypes.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="text-xs">{t.display_name}</TableCell>
                  <TableCell className="font-mono text-xs">{t.prefix}</TableCell>
                  <TableCell className="font-mono text-xs text-right">
                    {t.approval_threshold_value != null ? inrFmt(t.approval_threshold_value) : '—'}
                  </TableCell>
                  <TableCell className="text-xs">{t.approval_role ?? '—'}</TableCell>
                  <TableCell>{t.is_default && <Badge variant="outline" className="text-[10px]">Default</Badge>}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{t.is_active ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditing({ ...t })}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing && (
        <Card className="border-primary">
          <CardHeader><CardTitle className="text-base">Edit · {editing.display_name}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Display Name</Label>
                <Input value={editing.display_name} onChange={e => setEditing({ ...editing, display_name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Prefix</Label>
                <Input value={editing.prefix} onChange={e => setEditing({ ...editing, prefix: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <Label className="text-xs">Approval Threshold (₹)</Label>
                <Input
                  type="number"
                  value={editing.approval_threshold_value ?? ''}
                  onChange={e => setEditing({ ...editing, approval_threshold_value: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
              <div>
                <Label className="text-xs">Approval Role</Label>
                <Input value={editing.approval_role ?? ''} onChange={e => setEditing({ ...editing, approval_role: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} />
                <Label className="text-xs">Active</Label>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={saveEditing}><Save className="h-4 w-4 mr-2" /> Save</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
