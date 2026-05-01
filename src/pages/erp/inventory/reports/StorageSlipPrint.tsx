/**
 * StorageSlipPrint.tsx — Storage Slip print panel
 * Sprint T-Phase-1.2.3 · Traceability + Storage Discipline
 *
 * Prints a per-GRN put-away slip with: GRN no, vendor, godown, item lines,
 * batch / serial / heat / bin assignments. Used by store team during put-away.
 *
 * [JWT] GET /api/inventory/grn/:id (for live data; reads from localStorage today)
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Printer, FileText, Warehouse } from 'lucide-react';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { grnsKey, type GRN } from '@/types/grn';
import { PrintNarrationHeader } from '@/components/inventory-print/PrintNarrationHeader';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

function loadGrns(key: string): GRN[] {
  // [JWT] GET /api/inventory/grn?entity=
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

export function StorageSlipPrintPanel() {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'DEMO';
  const grns = useMemo<GRN[]>(() => loadGrns(grnsKey(safeEntity)), [safeEntity]);
  const postedGrns = useMemo(() => grns.filter(g => g.status === 'posted'), [grns]);

  const [selectedId, setSelectedId] = useState<string>('');
  const grn = postedGrns.find(g => g.id === selectedId) || null;

  return (
    <div className="p-6 space-y-4">
      {/* Toolbar — hidden on print */}
      <div className="no-print flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-cyan-500" />
            Storage Slip
          </h2>
          <p className="text-sm text-muted-foreground">
            Put-away instructions for posted GRNs · printed by store-keeper
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Select posted GRN" />
            </SelectTrigger>
            <SelectContent>
              {postedGrns.length === 0 && (
                <SelectItem value="__none" disabled>No posted GRNs</SelectItem>
              )}
              {postedGrns.map(g => (
                <SelectItem key={g.id} value={g.id}>
                  {g.grn_no} · {g.vendor_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            disabled={!grn}
            onClick={() => window.print()}
            className="gap-1.5"
          >
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {!grn && (
        <Card className="no-print">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            <Warehouse className="h-12 w-12 mx-auto mb-3 opacity-30" />
            Select a posted GRN to render a Storage Slip.
          </CardContent>
        </Card>
      )}

      {/* Print sheet */}
      {grn && (
        <Card className="print-sheet bg-white text-black border-2 border-border max-w-[210mm] mx-auto">
          <CardHeader className="border-b-2 border-black">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl tracking-tight">STORAGE SLIP</CardTitle>
                <CardDescription className="text-black/70">
                  Goods Put-Away Instruction · Entity {safeEntity}
                </CardDescription>
              </div>
              <div className="text-right text-xs">
                <div className="font-mono font-bold text-base">{grn.grn_no}</div>
                <div className="text-black/60">Receipt: {fmtDate(grn.receipt_date)}</div>
                <div className="text-black/60">
                  Posted: {grn.posted_at ? fmtDate(grn.posted_at) : '—'}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            <PrintNarrationHeader
              voucherTypeId={grn.voucher_type_id ?? null}
              voucherTypeName={grn.voucher_type_name ?? 'Receipt Note (GRN)'}
              baseVoucherType="Receipt Note"
              voucherNo={grn.grn_no}
              fallbackTitle={`Storage Slip · ${grn.grn_no}`}
            />
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-semibold uppercase tracking-wider text-black/60 mb-1">Vendor</p>
                <p className="font-medium text-sm">{grn.vendor_name}</p>
                <p className="text-black/70">Inv: {grn.vendor_invoice_no || '—'}</p>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-wider text-black/60 mb-1">Receiving Godown</p>
                <p className="font-medium text-sm">{grn.godown_name}</p>
                <p className="text-black/70">Vehicle: {grn.vehicle_no || '—'} · LR: {grn.lr_no || '—'}</p>
              </div>
            </div>

            <Table className="border border-black">
              <TableHeader>
                <TableRow className="bg-black/5">
                  <TableHead className="text-black font-bold text-xs">#</TableHead>
                  <TableHead className="text-black font-bold text-xs">Item</TableHead>
                  <TableHead className="text-black font-bold text-xs text-right">Qty</TableHead>
                  <TableHead className="text-black font-bold text-xs">Batch</TableHead>
                  <TableHead className="text-black font-bold text-xs">Heat</TableHead>
                  <TableHead className="text-black font-bold text-xs">Serial(s)</TableHead>
                  <TableHead className="text-black font-bold text-xs">Bin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grn.lines.map((l, idx) => (
                  <TableRow key={l.id} className="border-t border-black/30">
                    <TableCell className="text-xs font-mono">{idx + 1}</TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium">{l.item_name}</div>
                      <div className="text-[10px] text-black/60 font-mono">{l.item_code}</div>
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {l.accepted_qty} {l.uom}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{l.batch_no || '—'}</TableCell>
                    <TableCell className="text-xs font-mono">{l.heat_no || '—'}</TableCell>
                    <TableCell className="text-[10px] font-mono">
                      {l.serial_nos && l.serial_nos.length > 0 ? l.serial_nos.join(', ') : '—'}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{l.bin_id || 'TBD'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="grid grid-cols-3 gap-6 pt-12 text-xs">
              <div>
                <div className="border-t-2 border-black pt-1 text-center">Stored By (Sign)</div>
              </div>
              <div>
                <div className="border-t-2 border-black pt-1 text-center">Verified By (Sign)</div>
              </div>
              <div>
                <div className="border-t-2 border-black pt-1 text-center">Store Manager (Sign)</div>
              </div>
            </div>

            {grn.narration && (
              <div className="text-[11px] text-black/70 border-t border-black/30 pt-2 mt-2">
                <span className="font-semibold">Note:</span> {grn.narration}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-sheet { box-shadow: none !important; border: none !important; }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>
    </div>
  );
}
