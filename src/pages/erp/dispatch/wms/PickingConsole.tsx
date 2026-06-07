/**
 * PickingConsole.tsx — WMS1 · Picking Console (Sprint WMS1)
 *
 * Single-Door: open orders panel reads `ordersKey` via the engine ONLY.
 * Source chips show salesx/ecomx/webstorex counts.
 *
 * Honesty line (verbatim · AC8):
 *   "Picker identity is free-text until Wave-2 auth; barcode scanning
 *    arrives with Wave-2."
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Boxes, PackageSearch, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { PickBucketType, Picklist } from '@/types/wms-pick-pack';
import { picklistsKey } from '@/types/wms-pick-pack';
import {
  generatePicklists,
  getOpenPickableOrders,
  getPickPackSummary,
  confirmPick,
} from '@/lib/wms-pick-pack-engine';

function readPicklists(entityCode: string): Picklist[] {
  try {
    const raw = localStorage.getItem(picklistsKey(entityCode));
    return raw ? (JSON.parse(raw) as Picklist[]) : [];
  } catch {
    return [];
  }
}

export function WMS1PickingConsolePanel() {
  const { entityCode } = useCardEntitlement();
  const [bucket, setBucket] = useState<PickBucketType | 'all'>('all');
  const [version, setVersion] = useState(0);
  const [activePicklistId, setActivePicklistId] = useState<string | null>(null);

  const [summary, setSummary] = useState(() => getPickPackSummary(entityCode));
  const [pickable, setPickable] = useState(() => getOpenPickableOrders(entityCode));
  const [picklists, setPicklists] = useState<Picklist[]>(() => readPicklists(entityCode));

  useEffect(() => {
    setSummary(getPickPackSummary(entityCode));
    setPickable(getOpenPickableOrders(entityCode));
    setPicklists(readPicklists(entityCode));
  }, [entityCode, version]);

  useEffect(() => { setActivePicklistId(null); }, [entityCode]);

  const activePicklist = picklists.find((p) => p.id === activePicklistId) ?? null;

  function handleGenerate() {
    const opts = bucket === 'all' ? {} : { bucket };
    const created = generatePicklists(entityCode, opts);
    if (created.length === 0) {
      toast.info('No pickable orders matched the selected bucket.');
    } else {
      toast.success(`${created.length} picklist(s) generated.`);
    }
    setVersion((v) => v + 1);
  }

  function handleConfirm(lineId: string, value: string) {
    if (!activePicklist) return;
    const n = Number(value);
    if (Number.isNaN(n) || n < 0) {
      toast.error('Enter a non-negative quantity.');
      return;
    }
    confirmPick(entityCode, activePicklist.id, lineId, n);
    setVersion((v) => v + 1);
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Picking Console · WMS1</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Single-Door picking across SalesX, EcomX and WebStoreX. Picker identity is free-text until Wave-2 auth; barcode scanning arrives with Wave-2.
        </p>
      </div>

      {/* Source-chip summary · canon 4 visible on screen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Boxes className="h-3.5 w-3.5" /> Open Orders
            </div>
            <div className="text-2xl font-mono font-bold text-foreground mt-1">{summary.openOrders.total}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">SalesX</div>
            <div className="text-2xl font-mono font-bold text-foreground mt-1">{summary.openOrders.salesx}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">EcomX</div>
            <div className="text-2xl font-mono font-bold text-foreground mt-1">{summary.openOrders.ecomx}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">WebStoreX</div>
            <div className="text-2xl font-mono font-bold text-foreground mt-1">{summary.openOrders.webstorex}</div>
          </CardContent>
        </Card>
      </div>

      {/* Generate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PackageSearch className="h-4 w-4" /> Generate Picklists
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Bucket filter</label>
            <Select value={bucket} onValueChange={(v) => setBucket(v as typeof bucket)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All buckets</SelectItem>
                <SelectItem value="single_item">Single-item</SelectItem>
                <SelectItem value="multi_item">Multi-item</SelectItem>
                <SelectItem value="b2b_bulk">B2B bulk</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={pickable.length === 0}>
            Generate · {pickable.length} pickable order(s)
          </Button>
        </CardContent>
      </Card>

      {/* Picklists */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" /> Picklists
            <span className="ml-2 text-xs text-muted-foreground font-normal">
              Open: {summary.picklists.open} · In progress: {summary.picklists.in_progress} · Completed: {summary.picklists.completed}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {picklists.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No picklists yet. Click <strong>Generate</strong> above.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Picklist #</TableHead>
                  <TableHead>Bucket</TableHead>
                  <TableHead>Lines</TableHead>
                  <TableHead>Sources</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {picklists.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.picklist_no}</TableCell>
                    <TableCell><Badge variant="outline">{p.bucket}</Badge></TableCell>
                    <TableCell className="font-mono">{p.lines.length}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      S:{p.source_summary.salesx} · E:{p.source_summary.ecomx} · W:{p.source_summary.webstorex}
                    </TableCell>
                    <TableCell><Badge>{p.status}</Badge></TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => setActivePicklistId(p.id)}>Walk</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Walk view */}
      {activePicklist && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Walk · {activePicklist.picklist_no}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Bin Hint</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Picked</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activePicklist.lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.item_name}</TableCell>
                    <TableCell className="font-mono text-xs">{l.order_no}</TableCell>
                    <TableCell><Badge variant="outline">{l.source}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.bin_hint || '—'}</TableCell>
                    <TableCell className="text-right font-mono">{l.qty_ordered}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        defaultValue={l.qty_picked}
                        onBlur={(e) => handleConfirm(l.id, e.target.value)}
                        className="w-20 inline-block text-right font-mono"
                      />
                    </TableCell>
                    <TableCell><Badge variant={l.status === 'short' ? 'destructive' : 'outline'}>{l.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default WMS1PickingConsolePanel;
