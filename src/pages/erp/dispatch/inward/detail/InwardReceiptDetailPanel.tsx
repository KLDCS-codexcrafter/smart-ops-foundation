/**
 * InwardReceiptDetailPanel.tsx — UPRA-3 Phase B · display-only read-only detail panel.
 * Quarantine / Downstream linkage cards conditional render per status.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  INWARD_STATUS_LABELS, INWARD_STATUS_COLORS,
  type InwardReceipt, type InwardRoutingDecision,
} from '@/types/inward-receipt';

export interface InwardReceiptDetailPanelProps {
  receipt: InwardReceipt;
  onPrint: () => void;
}

const dash = (v: string | number | null | undefined): string =>
  v === null || v === undefined || v === '' ? '—' : String(v);

const ROUTING_DECISION_COLORS: Record<InwardRoutingDecision, string> = {
  auto_release: 'bg-success/10 text-success',
  quarantine: 'bg-warning/10 text-warning',
  inspection_required: 'bg-primary/10 text-primary',
  rejected: 'bg-destructive/10 text-destructive',
};

const ROUTING_LABELS: Record<InwardRoutingDecision, string> = {
  auto_release: 'Auto-Release',
  quarantine: 'Quarantine',
  inspection_required: 'Inspection',
  rejected: 'Rejected',
};

function Field({ label, value }: { label: string; value: React.ReactNode }): JSX.Element {
  return (
    <div className="text-xs">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-mono mt-0.5">{value}</div>
    </div>
  );
}

export function InwardReceiptDetailPanel({ receipt, onPrint }: InwardReceiptDetailPanelProps): JSX.Element {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-mono">{receipt.receipt_no}</CardTitle>
              <div className="text-sm mt-1">{receipt.vendor_name}</div>
              <div className="text-xs text-muted-foreground mt-0.5 font-mono">{receipt.arrival_date}</div>
            </div>
            <Badge variant="outline" className={INWARD_STATUS_COLORS[receipt.status]}>
              {INWARD_STATUS_LABELS[receipt.status]}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Basic</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Arrival Date" value={dash(receipt.arrival_date)} />
          <Field label="Arrival Time" value={dash(receipt.arrival_time)} />
          <Field label="PO No" value={dash(receipt.po_no)} />
          <Field label="Gate Entry" value={dash(receipt.gate_entry_no)} />
          <Field label="Received By" value={dash(receipt.received_by_name)} />
          <Field label="Godown" value={dash(receipt.godown_name)} />
          <Field label="Fiscal Year" value={dash(receipt.fiscal_year_id)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Vendor &amp; Transport</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Vendor Invoice No" value={dash(receipt.vendor_invoice_no)} />
          <Field label="Vendor Invoice Date" value={dash(receipt.vendor_invoice_date)} />
          <Field label="Vehicle" value={dash(receipt.vehicle_no)} />
          <Field label="LR No" value={dash(receipt.lr_no)} />
          <Field label="Driver" value={dash(receipt.driver_name)} />
          <Field label="Driver Mobile" value={dash(receipt.driver_mobile)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Routing Summary</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Total Lines" value={receipt.total_lines} />
          <Field label="Quarantine" value={receipt.quarantine_lines} />
          <Field label="Released" value={receipt.released_lines} />
          <Field label="Rejected" value={receipt.rejected_lines} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Lines</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Code</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>UoM</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Heat</TableHead>
                <TableHead>Routing</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipt.lines.map(line => (
                <TableRow key={line.id}>
                  <TableCell className="font-mono text-xs">{line.item_code}</TableCell>
                  <TableCell className="text-xs">{line.item_name}</TableCell>
                  <TableCell className="text-xs">{line.uom}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{line.expected_qty}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{line.received_qty}</TableCell>
                  <TableCell className="font-mono text-xs">{dash(line.batch_no)}</TableCell>
                  <TableCell className="font-mono text-xs">{dash(line.heat_no)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={ROUTING_DECISION_COLORS[line.routing_decision]}>
                      {ROUTING_LABELS[line.routing_decision]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{line.routing_reason || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {receipt.grn_id !== null && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Downstream Linkage</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="GRN No" value={dash(receipt.grn_no)} />
            <Field label="QA Inspections" value={receipt.qa_inspection_ids?.length ?? 0} />
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onPrint}>
          <Printer className="h-3 w-3 mr-1" /> Print
        </Button>
      </div>
    </div>
  );
}

export default InwardReceiptDetailPanel;
