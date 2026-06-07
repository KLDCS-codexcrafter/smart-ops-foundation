/**
 * ManifestConsole.tsx — WMS3 · Manifest Console (Dispatch · WMS-ARC CLOSE)
 *
 * Honesty line (verbatim · AC8):
 *   "Courier label generation, live tracking and e-way bill integration arrive with Wave-2."
 *
 * Operator workflow:
 *   1) Shipment builder · packed-not-shipped queue + From-Export-PO picker
 *   2) Manifest builder · transporter select + add shipments + package + weight totals
 *   3) Finalize → print-style handover sheet view
 *   4) Handover + billed-weight entry → tolerance check (auto-dispute on breach)
 */

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { ClipboardCheck, Truck, FileCheck2, PackagePlus, Scale, Printer, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import {
  listShipments,
  listManifests,
  createShipmentsFromPacked,
  createExportShipment,
  buildManifest,
  finalizeManifest,
  recordHandover,
  checkToleranceAndDispute,
  getManifestSummary,
  listAcksForManifest,
} from '@/lib/wms-manifest-engine';
import type { Manifest, Shipment } from '@/types/wms-manifest';
import { exportPOKey } from '@/types/export-purchase-order';
import type { ExportPurchaseOrder } from '@/types/export-purchase-order';
import { loadLogistics, type LogisticMasterLite } from '@/lib/logistic-auth-engine';

function readExportPOs(entityCode: string): ExportPurchaseOrder[] {
  try {
    const raw = localStorage.getItem(exportPOKey(entityCode));
    return raw ? (JSON.parse(raw) as ExportPurchaseOrder[]) : [];
  } catch { return []; }
}

function statusBadge(status: Manifest['status']) {
  const map: Record<Manifest['status'], string> = {
    draft: 'bg-muted/40 text-muted-foreground',
    finalized: 'bg-blue-500/15 text-blue-600',
    acknowledged: 'bg-green-500/15 text-green-600',
    discrepancy: 'bg-orange-500/15 text-orange-600',
  };
  return map[status];
}

export function WMS3ManifestConsolePanel() {
  const { entityCode } = useCardEntitlement();
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion((v) => v + 1);

  const shipments = useMemo(() => listShipments(entityCode), [entityCode, version]);
  const manifests = useMemo(() => listManifests(entityCode), [entityCode, version]);
  const summary = useMemo(() => getManifestSummary(entityCode), [entityCode, version]);
  const transporters: LogisticMasterLite[] = useMemo(() => loadLogistics(entityCode), [entityCode]);
  const exportPOs = useMemo(() => readExportPOs(entityCode), [entityCode]);

  const [transporterId, setTransporterId] = useState<string>('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [exportPoPick, setExportPoPick] = useState<string>('');
  const [activeManifestId, setActiveManifestId] = useState<string | null>(null);
  const [billedWeight, setBilledWeight] = useState<string>('');

  const transporter = transporters.find((t) => t.id === transporterId);
  const activeManifest = manifests.find((m) => m.id === activeManifestId) ?? null;

  const packedQueue = shipments.filter((s) => s.status === 'packed');

  const togglePick = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleScanPacked = () => {
    const created = createShipmentsFromPacked(entityCode);
    toast.success(`Created ${created.length} shipment(s) from packed groups`);
    refresh();
  };

  const handleCreateExportShipment = () => {
    if (!exportPoPick) { toast.error('Pick an export PO'); return; }
    const row = createExportShipment(entityCode, exportPoPick);
    if (!row) { toast.error('Export PO not found'); return; }
    toast.success(`Export shipment ${row.shipment_no} created`);
    setExportPoPick('');
    refresh();
  };

  const handleBuildManifest = () => {
    if (!transporter) { toast.error('Pick a transporter'); return; }
    if (picked.size === 0) { toast.error('Pick at least one shipment'); return; }
    const m = buildManifest(entityCode, transporter.id, transporter.party_name, Array.from(picked));
    toast.success(`Manifest ${m.manifest_no} draft built`);
    setPicked(new Set());
    setActiveManifestId(m.id);
    refresh();
  };

  const handleFinalize = (id: string) => {
    try {
      const m = finalizeManifest(entityCode, id);
      toast.success(`Manifest ${m.manifest_no} finalized`);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleHandover = (id: string) => {
    recordHandover(entityCode, id);
    toast.success('Handover recorded');
    refresh();
  };

  const handleToleranceCheck = (id: string) => {
    const billed = Number(billedWeight);
    if (!billed || isNaN(billed)) { toast.error('Enter billed weight (kg)'); return; }
    const res = checkToleranceAndDispute(entityCode, id, billed);
    if (res.status === 'breach_dispute_raised') {
      toast.error(`Tolerance breach · dispute ${res.dispute?.id} raised`);
    } else {
      toast.success(`Within tolerance · variance ${res.variance_kg.toFixed(2)}kg accepted`);
    }
    setBilledWeight('');
    refresh();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-blue-600" /> Manifest Console
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            WMS3 · Dispatch owns the physical handover truth · Logistics acks via portal.
          </p>
          <p className="text-xs text-muted-foreground mt-2 italic">
            Courier label generation, live tracking and e-way bill integration arrive with Wave-2.
          </p>
        </div>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {[
          { k: 'Manifests', v: summary.totalManifests },
          { k: 'Draft', v: summary.drafts },
          { k: 'Finalized', v: summary.finalized },
          { k: 'Acked', v: summary.acknowledged },
          { k: 'Discrepancy', v: summary.discrepancy },
          { k: 'Ship · Packed', v: summary.shipmentsPacked },
          { k: 'Ship · Manifested', v: summary.shipmentsManifested },
          { k: 'Ship · Handed', v: summary.shipmentsHandedOver },
        ].map((c) => (
          <Card key={c.k}>
            <CardContent className="p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{c.k}</p>
              <p className="text-xl font-mono font-bold mt-1">{c.v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Shipment builder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PackagePlus className="h-4 w-4" /> Shipment Builder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <Button onClick={handleScanPacked} variant="secondary">
              Scan packed groups → shipments
            </Button>
            <div className="flex items-end gap-2">
              <div>
                <Label className="text-xs">From Export PO</Label>
                <Select value={exportPoPick} onValueChange={setExportPoPick}>
                  <SelectTrigger className="w-64"><SelectValue placeholder="Pick export PO" /></SelectTrigger>
                  <SelectContent>
                    {exportPOs.length === 0 ? (
                      <SelectItem value="__none__" disabled>No export POs</SelectItem>
                    ) : exportPOs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateExportShipment} variant="outline">Create export shipment</Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Domestic shipments born from WMS1 packed groups · export shipments link by PO id ·
            EximX mirror store is never written (read-only Single-Door rider on EximX side).
          </p>
        </CardContent>
      </Card>

      {/* Manifest builder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" /> Manifest Builder · Pick shipments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end gap-3">
            <div>
              <Label className="text-xs">Transporter</Label>
              <Select value={transporterId} onValueChange={setTransporterId}>
                <SelectTrigger className="w-64"><SelectValue placeholder="Pick transporter" /></SelectTrigger>
                <SelectContent>
                  {transporters.length === 0 ? (
                    <SelectItem value="__none__" disabled>No logistic masters</SelectItem>
                  ) : transporters.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.party_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleBuildManifest} disabled={!transporterId || picked.size === 0}>
              Build manifest · {picked.size} shipment(s)
            </Button>
          </div>
          {packedQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground">No packed shipments awaiting manifest.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Shipment</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Declared kg</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packedQueue.map((s: Shipment) => (
                  <TableRow key={s.id}>
                    <TableCell><input type="checkbox" checked={picked.has(s.id)} onChange={() => togglePick(s.id)} /></TableCell>
                    <TableCell className="font-mono">{s.shipment_no}</TableCell>
                    <TableCell><Badge variant="outline">{s.source}</Badge></TableCell>
                    <TableCell className="font-mono text-right">{s.declared_weight_kg ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Manifest register */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileCheck2 className="h-4 w-4" /> Manifest Register
          </CardTitle>
        </CardHeader>
        <CardContent>
          {manifests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No manifests yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Manifest</TableHead>
                  <TableHead>Transporter</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Pkgs</TableHead>
                  <TableHead className="text-right">Declared kg</TableHead>
                  <TableHead>Export PO links</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manifests.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono">{m.manifest_no}</TableCell>
                    <TableCell>{m.transporter_name}</TableCell>
                    <TableCell><Badge className={statusBadge(m.status)}>{m.status}</Badge></TableCell>
                    <TableCell className="font-mono text-right">{m.total_packages}</TableCell>
                    <TableCell className="font-mono text-right">{m.total_declared_weight_kg.toFixed(2)}</TableCell>
                    <TableCell className="text-xs font-mono">{m.export_po_refs?.join(', ') ?? '—'}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {m.status === 'draft' && (
                        <Button size="sm" variant="outline" onClick={() => handleFinalize(m.id)}>Finalize</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setActiveManifestId(m.id)}>
                        <Printer className="h-3 w-3 mr-1" />View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Handover sheet dialog */}
      <Dialog open={!!activeManifest} onOpenChange={(o) => !o && setActiveManifestId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Handover Sheet · {activeManifest?.manifest_no}
            </DialogTitle>
          </DialogHeader>
          {activeManifest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Transporter:</span> {activeManifest.transporter_name}</div>
                <div><span className="text-muted-foreground">Date:</span> {activeManifest.manifest_date}</div>
                <div><span className="text-muted-foreground">Packages:</span> <span className="font-mono">{activeManifest.total_packages}</span></div>
                <div><span className="text-muted-foreground">Declared kg:</span> <span className="font-mono">{activeManifest.total_declared_weight_kg.toFixed(2)}</span></div>
              </div>

              {activeManifest.dispute_id && (
                <div className="border border-orange-500/40 bg-orange-500/5 rounded p-3 flex gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <div>
                    Tolerance breach on a prior check raised dispute <span className="font-mono">{activeManifest.dispute_id}</span>.
                  </div>
                </div>
              )}

              {activeManifest.accepted_variance && (
                <div className="border border-green-500/40 bg-green-500/5 rounded p-3 text-xs">
                  {activeManifest.accepted_variance.note}
                </div>
              )}

              {(activeManifest.status === 'finalized' || activeManifest.status === 'discrepancy' || activeManifest.status === 'acknowledged') && (
                <div className="space-y-3 border-t pt-3">
                  <Label className="text-xs">Handover · enter billed weight (kg) for tolerance check</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Billed kg"
                      value={billedWeight}
                      onChange={(e) => setBilledWeight(e.target.value)}
                    />
                    <Button onClick={() => handleToleranceCheck(activeManifest.id)} variant="outline">
                      <Scale className="h-3 w-3 mr-1" />Check
                    </Button>
                    <Button onClick={() => handleHandover(activeManifest.id)} variant="secondary">
                      Record handover
                    </Button>
                  </div>
                </div>
              )}

              <div className="border-t pt-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Ack ledger</p>
                {(() => {
                  const acks = listAcksForManifest(entityCode, activeManifest.id);
                  if (acks.length === 0) return <p className="text-xs text-muted-foreground">No acks yet.</p>;
                  return (
                    <ul className="space-y-1 text-xs">
                      {acks.map((a) => (
                        <li key={a.id} className="flex justify-between border-b border-border/40 pb-1">
                          <span>{a.acknowledged_by} · pkgs {a.packages_counted ?? '—'}</span>
                          <span className="text-muted-foreground font-mono">{a.ack_at.slice(0, 16).replace('T', ' ')}</span>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>

              <Textarea readOnly value={activeManifest.accepted_variance?.note ?? ''} className="hidden" />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActiveManifestId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
