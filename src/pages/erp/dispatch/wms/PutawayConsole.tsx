/**
 * PutawayConsole.tsx — WMS2 · ASN + Putaway Console (Sprint WMS2)
 *
 * Honesty line (verbatim · AC9):
 *   "Bin occupancy reflects placements recorded since WMS2 — pre-existing
 *    stock is not auto-assigned to bins. Supplier ASN feeds arrive with
 *    Wave-2."
 *
 * Canon-5: "From Import PO" picker READS importPOKey — zero EximX writes.
 */

import { useEffect, useState } from 'react';
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
import { PackageOpen, Inbox, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { AsnRecord, AsnSource, BinSuggestion } from '@/types/wms-putaway';
import { ASN_SOURCE_LABELS, ASN_STATUS_LABELS, SUGGESTION_BASIS_LABELS } from '@/types/wms-putaway';
import {
  listAsns,
  createAsn,
  generateAsnFromImportPO,
  markAsnArrived,
  linkAsnToInwardReceipt,
  getPutawayQueue,
  getPutawaySummary,
  suggestBins,
  recordPlacement,
  type PutawayQueueItem,
} from '@/lib/wms-putaway-engine';
import { importPOKey } from '@/types/import-purchase-order';
import type { ImportPurchaseOrder } from '@/types/import-purchase-order';
import { inwardReceiptsKey } from '@/types/inward-receipt';
import type { InwardReceipt } from '@/types/inward-receipt';

const HONESTY_LINE =
  'Bin occupancy reflects placements recorded since WMS2 — pre-existing stock is not auto-assigned to bins. Supplier ASN feeds arrive with Wave-2.';

function readImportPOs(entityCode: string): ImportPurchaseOrder[] {
  try {
    const raw = localStorage.getItem(importPOKey(entityCode));
    return raw ? (JSON.parse(raw) as ImportPurchaseOrder[]) : [];
  } catch { return []; }
}

function readInwardReceipts(entityCode: string): InwardReceipt[] {
  try {
    const raw = localStorage.getItem(inwardReceiptsKey(entityCode));
    return raw ? (JSON.parse(raw) as InwardReceipt[]) : [];
  } catch { return []; }
}

export function WMS2PutawayConsolePanel() {
  const { entityCode } = useCardEntitlement();
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion((v) => v + 1);

  const [asns, setAsns] = useState<AsnRecord[]>(() => listAsns(entityCode));
  const [queue, setQueue] = useState<PutawayQueueItem[]>(() => getPutawayQueue(entityCode));
  const [summary, setSummary] = useState(() => getPutawaySummary(entityCode));

  useEffect(() => {
    setAsns(listAsns(entityCode));
    setQueue(getPutawayQueue(entityCode));
    setSummary(getPutawaySummary(entityCode));
  }, [entityCode, version]);

  // ── Manual ASN ──────────────────────────────────────────────────────────
  const [showManual, setShowManual] = useState(false);
  const [mRef, setMRef] = useState('');
  const [mDate, setMDate] = useState(new Date().toISOString().slice(0, 10));
  const [mLines, setMLines] = useState('');

  const submitManualAsn = () => {
    const lines = mLines.split('\n').map((row) => row.trim()).filter(Boolean).map((row) => {
      const [item_id, item_name, qty] = row.split('|').map((s) => s?.trim());
      return { item_id: item_id ?? '', item_name: item_name ?? '', qty_expected: Number(qty ?? 0) };
    }).filter((l) => l.item_id && l.qty_expected > 0);
    if (lines.length === 0) { toast.error('Add at least one line: item_id | item_name | qty'); return; }
    createAsn(entityCode, {
      source: 'manual', source_ref_no: mRef || undefined, expected_date: mDate, lines,
    });
    toast.success('Manual ASN created');
    setShowManual(false); setMRef(''); setMLines('');
    refresh();
  };

  // ── From Import PO ──────────────────────────────────────────────────────
  const [showImport, setShowImport] = useState(false);
  const importPOs = readImportPOs(entityCode);
  const [importPoId, setImportPoId] = useState<string>('');

  const submitImportAsn = () => {
    if (!importPoId) { toast.error('Pick an Import PO'); return; }
    const asn = generateAsnFromImportPO(entityCode, importPoId);
    if (!asn) { toast.error('Import PO not found'); return; }
    toast.success(`ASN ${asn.asn_no} generated from Import PO`);
    setShowImport(false); setImportPoId('');
    refresh();
  };

  // ── Link to inward ──────────────────────────────────────────────────────
  const [linkAsnId, setLinkAsnId] = useState<string | null>(null);
  const inwardReceipts = readInwardReceipts(entityCode);
  const [linkIrId, setLinkIrId] = useState('');

  const submitLink = () => {
    if (!linkAsnId || !linkIrId) return;
    const r = linkAsnToInwardReceipt(entityCode, linkAsnId, linkIrId);
    if (!r) { toast.error('Inward receipt not found'); return; }
    toast.success(`ASN linked to ${r.inward_receipt_no}`);
    setLinkAsnId(null); setLinkIrId(''); refresh();
  };

  // ── Placement dialog ────────────────────────────────────────────────────
  const [placeItem, setPlaceItem] = useState<PutawayQueueItem | null>(null);
  const [pQty, setPQty] = useState(0);
  const [pBinId, setPBinId] = useState<string | undefined>(undefined);
  const [pBinCode, setPBinCode] = useState<string>('');
  const [pBasis, setPBasis] = useState<BinSuggestion['basis']>('manual');
  const [suggestions, setSuggestions] = useState<BinSuggestion[]>([]);

  const openPlacement = (q: PutawayQueueItem) => {
    setPlaceItem(q);
    setPQty(q.qty_pending);
    const sg = suggestBins(entityCode, q.item_id, q.godown_id);
    setSuggestions(sg);
    const top = sg[0];
    if (top && top.basis !== 'none' && top.bin_label_id) {
      setPBinId(top.bin_label_id); setPBinCode(top.bin_location_code ?? ''); setPBasis(top.basis);
    } else {
      setPBinId(undefined); setPBinCode(''); setPBasis('manual');
    }
  };

  const submitPlacement = () => {
    if (!placeItem) return;
    if (pQty <= 0) { toast.error('Qty must be > 0'); return; }
    const r = recordPlacement(entityCode, {
      inward_receipt_id: placeItem.inward_receipt_id,
      item_id: placeItem.item_id,
      item_name: placeItem.item_name,
      qty_placed: pQty,
      godown_id: placeItem.godown_id,
      bin_label_id: pBinId,
      bin_location_code: pBinCode || undefined,
      suggestion_basis: pBasis,
    });
    if (!r) { toast.error('Placement failed (bin/godown mismatch?)'); return; }
    toast.success(`Placed (${SUGGESTION_BASIS_LABELS[pBasis]})`);
    setPlaceItem(null); refresh();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
        {HONESTY_LINE}
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">ASN · Expected</div><div className="text-2xl font-mono">{summary.asn.expected}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Arrived</div><div className="text-2xl font-mono">{summary.asn.arrived}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Received</div><div className="text-2xl font-mono">{summary.asn.received}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Putaway Pending</div><div className="text-2xl font-mono">{summary.putaway_pending_lines}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Placements</div><div className="text-2xl font-mono">{summary.placements_total}</div></CardContent></Card>
      </div>

      {/* ASN section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Inbox className="h-4 w-4" /> ASN Register</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowManual(true)}>+ Manual ASN</Button>
            <Button size="sm" onClick={() => setShowImport(true)}>From Import PO</Button>
          </div>
        </CardHeader>
        <CardContent>
          {asns.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No ASNs yet.</div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>ASN No</TableHead><TableHead>Source</TableHead><TableHead>Ref</TableHead>
                <TableHead>Expected</TableHead><TableHead>Lines</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {asns.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.asn_no}</TableCell>
                    <TableCell><Badge variant="outline">{ASN_SOURCE_LABELS[a.source]}</Badge></TableCell>
                    <TableCell className="text-xs">{a.source_ref_no ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{a.expected_date}</TableCell>
                    <TableCell className="font-mono">{a.lines.length}</TableCell>
                    <TableCell><Badge>{ASN_STATUS_LABELS[a.status]}</Badge></TableCell>
                    <TableCell className="space-x-2">
                      {a.status === 'expected' && (
                        <Button size="sm" variant="outline" onClick={() => { markAsnArrived(entityCode, a.id); refresh(); toast.success('Marked arrived'); }}>Arrived</Button>
                      )}
                      {a.status === 'arrived' && (
                        <Button size="sm" variant="outline" onClick={() => setLinkAsnId(a.id)}>Link Inward</Button>
                      )}
                      {a.inward_receipt_no && <span className="text-xs text-muted-foreground">→ {a.inward_receipt_no}</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Putaway queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ListChecks className="h-4 w-4" /> Putaway Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {queue.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No lines awaiting putaway.</div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Receipt</TableHead><TableHead>Godown</TableHead><TableHead>Item</TableHead>
                <TableHead>Received</TableHead><TableHead>Placed</TableHead><TableHead>Pending</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {queue.map((q) => (
                  <TableRow key={`${q.inward_receipt_id}-${q.item_id}`}>
                    <TableCell className="font-mono text-xs">{q.inward_receipt_no}</TableCell>
                    <TableCell>{q.godown_name}</TableCell>
                    <TableCell>{q.item_name}</TableCell>
                    <TableCell className="font-mono">{q.qty_received}</TableCell>
                    <TableCell className="font-mono">{q.qty_placed}</TableCell>
                    <TableCell className="font-mono">{q.qty_pending}</TableCell>
                    <TableCell><Button size="sm" onClick={() => openPlacement(q)}>Place</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Manual ASN dialog */}
      <Dialog open={showManual} onOpenChange={setShowManual}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Manual ASN</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Reference</Label><Input value={mRef} onChange={(e) => setMRef(e.target.value)} placeholder="optional" /></div>
            <div><Label>Expected Date</Label><Input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} /></div>
            <div><Label>Lines (one per row: <span className="font-mono">item_id | item_name | qty</span>)</Label>
              <Textarea rows={5} value={mLines} onChange={(e) => setMLines(e.target.value)} placeholder="ITM-001 | Steel Bolt M8 | 100" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManual(false)}>Cancel</Button>
            <Button onClick={submitManualAsn}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import PO dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent>
          <DialogHeader><DialogTitle>ASN from Import PO (Canon-5 · EximX read-only)</DialogTitle></DialogHeader>
          {importPOs.length === 0 ? (
            <div className="text-sm text-muted-foreground py-3">No Import POs found in EximX store.</div>
          ) : (
            <Select value={importPoId} onValueChange={setImportPoId}>
              <SelectTrigger><SelectValue placeholder="Pick an Import PO" /></SelectTrigger>
              <SelectContent>
                {importPOs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.po_number} · {p.lines.length} line(s)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImport(false)}>Cancel</Button>
            <Button onClick={submitImportAsn} disabled={!importPoId}>Generate ASN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link inward dialog */}
      <Dialog open={!!linkAsnId} onOpenChange={(o) => !o && setLinkAsnId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Link ASN to Inward Receipt</DialogTitle></DialogHeader>
          {inwardReceipts.length === 0 ? (
            <div className="text-sm text-muted-foreground py-3">No inward receipts found.</div>
          ) : (
            <Select value={linkIrId} onValueChange={setLinkIrId}>
              <SelectTrigger><SelectValue placeholder="Pick an inward receipt" /></SelectTrigger>
              <SelectContent>
                {inwardReceipts.map((ir) => (
                  <SelectItem key={ir.id} value={ir.id}>{ir.receipt_no} · {ir.vendor_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkAsnId(null)}>Cancel</Button>
            <Button onClick={submitLink} disabled={!linkIrId}>Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Placement dialog */}
      <Dialog open={!!placeItem} onOpenChange={(o) => !o && setPlaceItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle><PackageOpen className="inline h-4 w-4 mr-1" /> Record Placement</DialogTitle></DialogHeader>
          {placeItem && (
            <div className="space-y-3">
              <div className="text-sm">
                <div><span className="text-muted-foreground">Receipt:</span> <span className="font-mono">{placeItem.inward_receipt_no}</span></div>
                <div><span className="text-muted-foreground">Item:</span> {placeItem.item_name}</div>
                <div><span className="text-muted-foreground">Godown:</span> {placeItem.godown_name}</div>
              </div>
              <div>
                <Label>Suggestion ladder (basis recorded on placement)</Label>
                <div className="space-y-1 mt-1">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      className="w-full text-left rounded border px-2 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
                      disabled={s.basis === 'none'}
                      onClick={() => {
                        setPBinId(s.bin_label_id);
                        setPBinCode(s.bin_location_code ?? '');
                        setPBasis(s.basis);
                      }}
                    >
                      <Badge variant="outline" className="mr-2">{SUGGESTION_BASIS_LABELS[s.basis]}</Badge>
                      <span className="font-mono">{s.bin_location_code ?? '—'}</span>
                      <span className="text-muted-foreground ml-2">{s.reason}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Qty</Label><Input type="number" value={pQty} onChange={(e) => setPQty(Number(e.target.value))} /></div>
                <div><Label>Bin Code</Label><Input value={pBinCode} onChange={(e) => { setPBinCode(e.target.value); setPBasis('manual'); setPBinId(undefined); }} placeholder="manual override" /></div>
              </div>
              <div className="text-xs text-muted-foreground">Basis to be recorded: <Badge variant="outline">{SUGGESTION_BASIS_LABELS[pBasis]}</Badge></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlaceItem(null)}>Cancel</Button>
            <Button onClick={submitPlacement}>Place</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default WMS2PutawayConsolePanel;
