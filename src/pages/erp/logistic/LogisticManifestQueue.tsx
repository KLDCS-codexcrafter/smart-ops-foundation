/**
 * LogisticManifestQueue.tsx — WMS3 · Logistics-side Manifest Queue
 *
 * Sprint WMS3 · T-WMS3-Manifest-Ship · WMS-ARC CLOSE
 *
 * Pattern: LR-acceptance verbatim. Dispatch writes manifests · this page writes
 * ONLY the ManifestAck ledger via `acknowledgeManifest`. Zero direct
 * `localStorage.setItem` calls on Dispatch-owned stores from this page
 * (AC6 greps it: this file's setItem count = 0).
 *
 * [JWT] Wave-2: auth-derived transporter identity replaces the
 *       free-text acknowledged_by field below.
 */

import { useMemo, useState } from 'react';
import { LogisticLayout } from '@/features/logistic/LogisticLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { getLogisticSession, recordLogisticActivity } from '@/lib/logistic-auth-engine';
import {
  listManifestsForTransporter,
  acknowledgeManifest,
} from '@/lib/wms-manifest-engine';
import type { Manifest } from '@/types/wms-manifest';

function statusColor(s: Manifest['status']): string {
  switch (s) {
    case 'finalized': return 'bg-blue-500/15 text-blue-600';
    case 'acknowledged': return 'bg-green-500/15 text-green-600';
    case 'discrepancy': return 'bg-orange-500/15 text-orange-600';
    default: return 'bg-muted/40 text-muted-foreground';
  }
}

export default function LogisticManifestQueue() {
  const session = getLogisticSession();
  const [version, setVersion] = useState(0);
  const [target, setTarget] = useState<Manifest | null>(null);
  const [ackBy, setAckBy] = useState('');
  const [pkgCount, setPkgCount] = useState('');
  const [discrepancy, setDiscrepancy] = useState('');

  const manifests = useMemo(() => {
    if (!session) return [];
    return listManifestsForTransporter(session.entity_code, session.logistic_id);
  }, [session, version]);

  if (!session) return <LogisticLayout title="Manifest Queue"><div /></LogisticLayout>;

  const queue = manifests.filter((m) => m.status === 'finalized' || m.status === 'discrepancy');

  const handleAck = () => {
    if (!target) return;
    if (!ackBy.trim()) { toast.error('Enter your name to acknowledge'); return; }
    try {
      acknowledgeManifest(session.entity_code, target.id, {
        acknowledged_by: ackBy.trim(),
        packages_counted: pkgCount ? Number(pkgCount) : undefined,
        discrepancy_note: discrepancy.trim() || undefined,
      });
      recordLogisticActivity(session.entity_code, {
        logistic_id: session.logistic_id,
        entity_code: session.entity_code,
        kind: 'lr_accept',
        ref_type: 'lr',
        ref_id: target.id,
        ref_label: target.manifest_no,
        notes: discrepancy.trim() ? `Discrepancy: ${discrepancy.trim()}` : 'Manifest acknowledged',
      });
      toast.success(`Manifest ${target.manifest_no} acknowledged`);
      setTarget(null); setAckBy(''); setPkgCount(''); setDiscrepancy('');
      setVersion((v) => v + 1);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <LogisticLayout title="Manifest Queue" subtitle={session.party_name}>
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" /> Manifests awaiting your acknowledgement
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Confirm receipt or report a discrepancy. Your ack updates the manifest status only —
              all other manifest data is owned by the dispatch team.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {queue.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No manifests in queue.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Manifest</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Pkgs</TableHead>
                    <TableHead className="text-right">Declared kg</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono">{m.manifest_no}</TableCell>
                      <TableCell className="font-mono text-xs">{m.manifest_date}</TableCell>
                      <TableCell><Badge className={statusColor(m.status)}>{m.status}</Badge></TableCell>
                      <TableCell className="font-mono text-right">{m.total_packages}</TableCell>
                      <TableCell className="font-mono text-right">{m.total_declared_weight_kg.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setTarget(m)}>Acknowledge</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Acknowledge {target?.manifest_no}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Your name</Label>
              <Input value={ackBy} onChange={(e) => setAckBy(e.target.value)} placeholder="Driver / dispatcher name" />
            </div>
            <div>
              <Label className="text-xs">Packages counted (optional)</Label>
              <Input type="number" value={pkgCount} onChange={(e) => setPkgCount(e.target.value)} placeholder={String(target?.total_packages ?? '')} />
            </div>
            <div>
              <Label className="text-xs">Discrepancy note (optional · presence flips status to discrepancy)</Label>
              <Textarea value={discrepancy} onChange={(e) => setDiscrepancy(e.target.value)} placeholder="e.g. 2 cartons short, seal broken on package PKG-04" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)}>Cancel</Button>
            <Button onClick={handleAck}>Submit ack</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LogisticLayout>
  );
}
