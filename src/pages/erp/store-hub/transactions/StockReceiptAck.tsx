/**
 * StockReceiptAck.tsx — Card #7 Block G · D-382
 * Sprint T-Phase-1.2.6f-d-2-card7-7-pre-1
 *
 * Two tabs: Awaiting (Card #6 IRs status='released' not yet acked) + History.
 * Quick Ack dialog with per-line qty_acknowledged + variance display.
 * On Confirm → createReceiptAck + postReceiptAck → Stock Journal voucher.
 */
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { ClipboardCheck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listReleasedReceiptsAwaitingStock,
  listReceiptAcks,
  createReceiptAck,
  postReceiptAck,
} from '@/lib/stock-receipt-ack-engine';
import type { InwardReceipt } from '@/types/inward-receipt';
import type { StockReceiptAck } from '@/types/stock-receipt-ack';
import { STOCK_ACK_STATUS_LABELS, STOCK_ACK_STATUS_COLORS } from '@/types/stock-receipt-ack';

interface AckDraftLine {
  inward_line_id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  uom: string;
  qty_inward: number;
  qty_acknowledged: number;
}

const STORES_GODOWN = { id: 'gd-stores', name: 'Main Stores' };

export function StockReceiptAckPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [awaiting, setAwaiting] = useState<InwardReceipt[]>([]);
  const [history, setHistory] = useState<StockReceiptAck[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogIr, setDialogIr] = useState<InwardReceipt | null>(null);
  const [draftLines, setDraftLines] = useState<AckDraftLine[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    setAwaiting(listReleasedReceiptsAwaitingStock(entityCode));
    setHistory(listReceiptAcks(entityCode));
    setLoading(false);
  }, [entityCode]);

  useEffect(() => { refresh(); }, [refresh]);

  function openAck(ir: InwardReceipt) {
    setDialogIr(ir);
    setDraftLines(ir.lines.map(l => ({
      inward_line_id: l.id,
      item_id: l.item_id, item_code: l.item_code, item_name: l.item_name,
      uom: l.uom,
      qty_inward: l.received_qty,
      qty_acknowledged: l.received_qty,
    })));
  }

  function updateAckQty(idx: number, qty: number) {
    setDraftLines(prev => prev.map((l, i) => (i === idx ? { ...l, qty_acknowledged: qty } : l)));
  }

  async function confirmAck() {
    if (!dialogIr) return;
    setBusy(true);
    try {
      const ack = await createReceiptAck({
        entity_id: entityCode,
        inward_receipt_id: dialogIr.id,
        inward_receipt_no: dialogIr.receipt_no,
        vendor_id: dialogIr.vendor_id,
        vendor_name: dialogIr.vendor_name,
        acknowledged_by_id: 'u-store-1',
        acknowledged_by_name: 'Stores Operator',
        lines: draftLines.map(l => ({
          inward_line_id: l.inward_line_id,
          item_id: l.item_id, item_code: l.item_code, item_name: l.item_name,
          uom: l.uom,
          qty_inward: l.qty_inward,
          qty_acknowledged: l.qty_acknowledged,
          source_godown_id: dialogIr.godown_id,
          source_godown_name: dialogIr.godown_name,
          dest_godown_id: STORES_GODOWN.id,
          dest_godown_name: STORES_GODOWN.name,
        })),
      }, entityCode, 'u-store-1');
      const posted = await postReceiptAck(ack.id, entityCode, 'u-store-1');
      toast.success(`Ack posted · ${posted?.ack_no}`);
      setDialogIr(null);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to ack');
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-indigo-600" /> Stock Receipt Acknowledgment
        </h1>
        <p className="text-sm text-muted-foreground">
          Confirm received Inward Receipts into Stores · posts Stock Journal (Receiving → Stores)
        </p>
      </div>

      <Tabs defaultValue="awaiting">
        <TabsList>
          <TabsTrigger value="awaiting">Awaiting ({awaiting.length})</TabsTrigger>
          <TabsTrigger value="history">History ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="awaiting">
          <Card>
            <CardHeader><CardTitle className="text-base">Released Receipts Awaiting Acknowledgment</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={`sk-${i}`} className="h-9 w-full" />)}
                </div>
              ) : awaiting.length === 0 ? (
                <p className="text-center py-10 text-sm text-muted-foreground">
                  No released receipts pending acknowledgment.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="text-[10px]">
                      <TableHead>IR No</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Receiving Godown</TableHead>
                      <TableHead className="text-right">Lines</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {awaiting.map(ir => (
                      <TableRow key={ir.id} className="text-xs">
                        <TableCell className="font-mono">{ir.receipt_no}</TableCell>
                        <TableCell>{ir.vendor_name}</TableCell>
                        <TableCell>{ir.godown_name}</TableCell>
                        <TableCell className="font-mono text-right">{ir.lines.length}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => openAck(ir)}
                            className="h-7 text-indigo-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Ack
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle className="text-base">Acknowledgment History</CardTitle></CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-center py-10 text-sm text-muted-foreground">
                  No acknowledgments yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="text-[10px]">
                      <TableHead>Ack No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>IR No</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map(a => (
                      <TableRow key={a.id} className="text-xs">
                        <TableCell className="font-mono">{a.ack_no}</TableCell>
                        <TableCell className="font-mono">{a.ack_date}</TableCell>
                        <TableCell className="font-mono">{a.inward_receipt_no}</TableCell>
                        <TableCell>{a.vendor_name}</TableCell>
                        <TableCell className={`font-mono text-right ${a.total_variance > 0 ? 'text-warning' : ''}`}>
                          {a.total_variance}
                        </TableCell>
                        <TableCell>
                          <Badge className={STOCK_ACK_STATUS_COLORS[a.status]}>
                            {STOCK_ACK_STATUS_LABELS[a.status]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!dialogIr} onOpenChange={open => !open && setDialogIr(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Acknowledge IR · {dialogIr?.receipt_no}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Vendor: {dialogIr?.vendor_name} · Receiving: {dialogIr?.godown_name} → Stores
            </p>
            <Table>
              <TableHeader>
                <TableRow className="text-[10px]">
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">IR Qty</TableHead>
                  <TableHead className="text-right">Ack Qty</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {draftLines.map((l, idx) => {
                  const variance = l.qty_acknowledged - l.qty_inward;
                  return (
                    <TableRow key={l.inward_line_id} className="text-xs">
                      <TableCell>{l.item_name}</TableCell>
                      <TableCell className="font-mono text-right">{l.qty_inward} {l.uom}</TableCell>
                      <TableCell className="text-right">
                        <Input type="number" value={l.qty_acknowledged || ''}
                          onChange={e => updateAckQty(idx, Number(e.target.value))}
                          className="h-7 w-24 text-xs ml-auto" />
                      </TableCell>
                      <TableCell className={`font-mono text-right ${variance !== 0 ? 'text-warning' : ''}`}>
                        {variance > 0 ? '+' : ''}{variance}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogIr(null)} disabled={busy}>Cancel</Button>
            <Button onClick={confirmAck} disabled={busy} className="bg-indigo-600 hover:bg-indigo-700">
              Confirm &amp; Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default StockReceiptAckPanel;
