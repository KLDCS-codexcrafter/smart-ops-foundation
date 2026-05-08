/**
 * @file        MaterialRfqPrintPanel.tsx
 * @sprint      T-Phase-1.A.3.d · Block G.2 · D-NEW-AT
 * @purpose     Browse RFQs and render print payload (vendor / office copy).
 * @[JWT]       GET /api/procure360/rfqs (read-only)
 */
import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useRfqs } from '@/hooks/useRfqs';
import { buildRfqPrintPayload, RFQ_COPY_CONFIG } from '@/lib/rfq-print-engine';

export function MaterialRfqPrintPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const rfqs = useRfqs();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copyKey, setCopyKey] = useState<string>(RFQ_COPY_CONFIG.default);

  const payload = useMemo(
    () => (selectedId ? buildRfqPrintPayload(selectedId, entityCode, copyKey) : null),
    [selectedId, entityCode, copyKey],
  );

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Material RFQ Print</h1>
        <p className="text-sm text-muted-foreground">Vendor/Office copy of any RFQ — D-246 hybrid model</p>
      </div>

      <Card><CardContent className="pt-6">
        {rfqs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No RFQs available.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RFQ No</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rfqs.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.rfq_no}</TableCell>
                  <TableCell>{r.vendor_name}</TableCell>
                  <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                  <TableCell className="font-mono">{r.line_item_ids.length}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setSelectedId(r.id)}>
                      <Printer className="h-3.5 w-3.5 mr-1" /> Preview
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>

      {payload && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{payload.copy_label}</h2>
                <p className="text-xs text-muted-foreground">RFQ {payload.rfq_no} · Enquiry {payload.parent_enquiry_no}</p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={copyKey} onValueChange={setCopyKey}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RFQ_COPY_CONFIG.keys.map((k) => (
                      <SelectItem key={k} value={k}>{RFQ_COPY_CONFIG.labels[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={() => window.print()}>
                  <Printer className="h-3.5 w-3.5 mr-1" /> Print
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Buyer</p>
                <p className="font-medium">{payload.buyer.legal_name}</p>
                <p className="text-xs">{payload.buyer_address}</p>
                <p className="text-xs">GSTIN: <span className="font-mono">{payload.buyer.gstin || '—'}</span></p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vendor</p>
                <p className="font-medium">{payload.vendor_name}</p>
                <p className="text-xs">Sent: <span className="font-mono">{payload.sent_at || '—'}</span></p>
                <p className="text-xs">Deadline: <span className="font-mono">{payload.deadline_at || '—'}</span></p>
                <p className="text-xs">Delivery: {payload.delivery_terms} · Payment: {payload.payment_terms}</p>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Required By</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payload.lines.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No lines.</TableCell></TableRow>
                ) : payload.lines.map((l) => (
                  <TableRow key={`rfqp-${l.sl_no}`}>
                    <TableCell className="font-mono">{l.sl_no}</TableCell>
                    <TableCell className="font-mono text-xs">{l.item_code}</TableCell>
                    <TableCell>{l.item_name}</TableCell>
                    <TableCell>{l.uom}</TableCell>
                    <TableCell className="text-right font-mono">{l.qty}</TableCell>
                    <TableCell className="font-mono text-xs">{l.required_date}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.remarks}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="text-xs text-muted-foreground pt-2 border-t">
              {payload.authorised_signatory}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
