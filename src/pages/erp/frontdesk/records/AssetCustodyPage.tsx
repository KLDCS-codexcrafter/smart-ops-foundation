/**
 * @file        src/pages/erp/frontdesk/records/AssetCustodyPage.tsx
 * @sprint      Sprint 147 · T-FrontDesk-A6F.3 · Block 4 · Asset Custody (DP-FD-4)
 */
import { useCallback, useEffect, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAssetMaster } from '@/hooks/useAssetMaster';
import { useEmployees } from '@/hooks/useEmployees';
import {
  issueAsset, returnAsset, loadCustody, getOverdueCustody, flagOverdueCustody,
} from '@/lib/frontdesk-records-engine';
import type { AssetCustodyRecord } from '@/types/frontdesk';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export function AssetCustodyPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const { assets } = useAssetMaster();
  const { employees } = useEmployees();
  const empOptions = employees.map((e) => ({ id: e.id, name: e.displayName, code: e.empCode }));

  const [openIssue, setOpenIssue] = useState(false);
  const [returnTarget, setReturnTarget] = useState<AssetCustodyRecord | null>(null);
  const [returnCondition, setReturnCondition] = useState('');

  const compute = useCallback((): AssetCustodyRecord[] => loadCustody(entityCode), [entityCode]);
  const [rows, setRows] = useState<AssetCustodyRecord[]>(() => compute());
  const reload = useCallback(() => setRows(compute()), [compute]);
  useEffect(() => { reload(); }, [reload]);

  const overdue = getOverdueCustody(entityCode);

  function isOverdue(r: AssetCustodyRecord): boolean {
    return !r.returnedAt && !!r.dueBackAt && r.dueBackAt < new Date().toISOString();
  }

  function handleReturn(): void {
    if (!returnTarget) return;
    try {
      returnAsset(entityCode, returnTarget.id, { conditionOnReturn: returnCondition || null });
      toast.success('Returned');
      setReturnTarget(null); setReturnCondition(''); reload();
    } catch (e) { toast.error((e as Error).message); }
  }

  function handleFlag(): void {
    try {
      const r = flagOverdueCustody(entityCode);
      toast.success(`${r.flagged.length} new task(s) · ${r.alreadyFlagged.length} already flagged`);
      reload();
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Asset Custody · {overdue.length} overdue</CardTitle>
          <div className="space-x-2">
            <Button variant="outline" onClick={handleFlag} disabled={overdue.length === 0}>
              Flag overdue → tasks
            </Button>
            <Button onClick={() => setOpenIssue(true)}>Issue asset</Button>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground p-8 text-center">No custody records.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead><TableHead>Holder</TableHead>
                  <TableHead>Issued</TableHead><TableHead>Due back</TableHead>
                  <TableHead>Status</TableHead><TableHead>Task</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{r.assetLabel}</TableCell>
                    <TableCell className="text-sm">{r.employeeName}</TableCell>
                    <TableCell className="font-mono text-xs">{new Date(r.issuedAt).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell className="font-mono text-xs">{r.dueBackAt ? new Date(r.dueBackAt).toLocaleDateString('en-IN') : '—'}</TableCell>
                    <TableCell>
                      {r.returnedAt ? <Badge variant="outline">returned</Badge>
                        : isOverdue(r) ? <Badge variant="destructive">overdue</Badge>
                        : <Badge variant="secondary">issued</Badge>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.overdueTaskId ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      {!r.returnedAt && (
                        <Button size="sm" variant="outline" onClick={() => setReturnTarget(r)}>Return</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <IssueDialog
        open={openIssue} onClose={() => { setOpenIssue(false); reload(); }}
        entityCode={entityCode} userId={user?.id ?? 'reception'}
        assets={assets.map((a) => ({ id: a.id, label: `${a.assetCode} · ${a.name}` }))}
        employees={empOptions}
      />

      <Dialog open={!!returnTarget} onOpenChange={(v) => { if (!v) setReturnTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Return asset</DialogTitle></DialogHeader>
          {returnTarget && (
            <div className="space-y-3">
              <div className="text-sm">{returnTarget.assetLabel}</div>
              <div>
                <Label>Condition on return</Label>
                <Input value={returnCondition} onChange={(e) => setReturnCondition(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReturnTarget(null)}>Cancel</Button>
            <Button onClick={handleReturn}>Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface IssueProps {
  open: boolean; onClose: () => void;
  entityCode: string; userId: string;
  assets: { id: string; label: string }[];
  employees: { id: string; name: string; code: string }[];
}
function IssueDialog({ open, onClose, entityCode, userId, assets, employees }: IssueProps): JSX.Element {
  const [assetId, setAssetId] = useState('');
  const [empId, setEmpId] = useState('');
  const [dueBack, setDueBack] = useState('');
  const [condition, setCondition] = useState('');

  function submit(): void {
    try {
      const emp = employees.find((e) => e.id === empId);
      if (!emp) { toast.error('Pick a holder'); return; }
      issueAsset(entityCode, {
        entityId: entityCode, createdByUserId: userId,
        assetRefId: assetId, employeeId: emp.id, employeeName: emp.name,
        dueBackAt: dueBack ? new Date(dueBack).toISOString() : null,
        conditionOnIssue: condition || null,
      });
      toast.success('Issued');
      setAssetId(''); setEmpId(''); setDueBack(''); setCondition('');
      onClose();
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Issue asset on custody</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Asset (from master · read-only)</Label>
            <Select value={assetId} onValueChange={setAssetId}>
              <SelectTrigger><SelectValue placeholder="Pick asset" /></SelectTrigger>
              <SelectContent>{assets.map((a) => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Holder (employee)</Label>
            <Select value={empId} onValueChange={setEmpId}>
              <SelectTrigger><SelectValue placeholder="Pick holder" /></SelectTrigger>
              <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name} · {e.code}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Due back</Label><Input type="date" value={dueBack} onChange={(e) => setDueBack(e.target.value)} /></div>
          <div><Label>Condition on issue</Label><Input value={condition} onChange={(e) => setCondition(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Issue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
