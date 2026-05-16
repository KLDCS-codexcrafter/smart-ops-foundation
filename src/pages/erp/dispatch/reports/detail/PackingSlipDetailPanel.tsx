/**
 * PackingSlipDetailPanel.tsx — UPRA-1 Phase A · T1-4
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { PackingSlip } from '@/types/packing-slip';

interface Props { slip: PackingSlip; onPrint: () => void }

export function PackingSlipDetailPanel({ slip, onPrint }: Props) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-mono">{slip.dln_voucher_no}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {slip.party_name} · {slip.ship_to_city}, {slip.ship_to_state}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize text-[10px]">{slip.status}</Badge>
            <Button size="sm" variant="outline" onClick={onPrint}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">DLN Date</div><div className="font-mono">{slip.dln_date}</div></div>
          <div><div className="text-xs text-muted-foreground">Printed Count</div><div className="font-mono">{slip.printed_count}</div></div>
          <div><div className="text-xs text-muted-foreground">Transporter</div><div>{slip.transporter_name ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Vehicle</div><div className="font-mono">{slip.vehicle_no ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Full Cartons</div><div className="font-mono">{slip.total_full_cartons}</div></div>
          <div><div className="text-xs text-muted-foreground">Loose Packs</div><div className="font-mono">{slip.total_loose_packs}</div></div>
          <div><div className="text-xs text-muted-foreground">Gross Kg</div><div className="font-mono">{slip.total_gross_kg}</div></div>
          <div><div className="text-xs text-muted-foreground">Volumetric Kg</div><div className="font-mono">{slip.total_volumetric_kg}</div></div>
          <div className="md:col-span-4"><div className="text-xs text-muted-foreground">Ship To</div><div>{slip.ship_to_address}, {slip.ship_to_city}, {slip.ship_to_state} — {slip.ship_to_pincode}</div></div>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pack Lines</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Full Ctn</TableHead>
                <TableHead className="text-right">Loose</TableHead>
                <TableHead className="text-right">Gross Kg</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slip.lines.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{l.item_code} · {l.item_name}</TableCell>
                  <TableCell className="text-xs">{l.uom}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.qty}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.full_cartons}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.loose_packs}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{l.total_gross_kg}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
