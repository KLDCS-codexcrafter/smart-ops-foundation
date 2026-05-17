/**
 * IRNDetailPanel.tsx — UPRA-4 Phase B′ HOTFIX · NEW DetailPanel
 * Renders full IRN record + IRP response + signed QR + cancellation/error states.
 * Self-contained STATUS maps per PE-Q6=(A) · type file 0-diff.
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, FileText, AlertTriangle, Shield } from 'lucide-react';
import type { IRNRecord } from '@/types/irn';

const inr = (n: number): string =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_LABELS: Record<IRNRecord['status'], string> = {
  pending: 'Pending',
  generated: 'Generated',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<IRNRecord['status'], string> = {
  pending: 'bg-muted text-muted-foreground',
  generated: 'bg-success/15 text-success border-success/30',
  failed: 'bg-destructive/15 text-destructive border-destructive/30',
  cancelled: 'bg-secondary text-secondary-foreground',
};

const dash = (v: string | null | undefined): string => v ?? '—';

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-sm ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}

export interface IRNDetailPanelProps {
  record: IRNRecord;
  onPrint: () => void;
}

export function IRNDetailPanel({ record, onPrint }: IRNDetailPanelProps): JSX.Element {
  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-lg font-mono">{record.voucher_no}</CardTitle>
              <div className="text-xs text-muted-foreground">
                {record.customer_name} · {record.customer_gstin || 'Unregistered'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={STATUS_COLORS[record.status]}>
                {STATUS_LABELS[record.status]}
              </Badge>
              <Button size="sm" variant="outline" onClick={onPrint}>
                <Printer className="h-3.5 w-3.5 mr-1" /> Print
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* IRN Identifiers */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> IRN Identifiers
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="IRN" value={<span className="font-mono break-all text-[11px]">{dash(record.irn)}</span>} />
          <Field label="Ack No" value={dash(record.ack_no)} mono />
          <Field label="Ack Date" value={dash(record.ack_date)} />
          <Field label="Voucher Date" value={record.voucher_date.slice(0, 10)} />
          <Field label="Voucher Type" value={record.voucher_type} />
          <Field label="Supplier GSTIN" value={record.supplier_gstin} mono />
          <Field label="Customer GSTIN" value={dash(record.customer_gstin || null) || 'Unregistered'} mono />
          <Field label="FY" value={dash(record.fiscal_year_id)} />
        </CardContent>
      </Card>

      {/* Invoice Amounts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Invoice Amounts</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Total Invoice Value" value={inr(record.total_invoice_value)} mono />
          <Field label="Total Taxable Value" value={inr(record.total_taxable_value)} mono />
          <Field label="CGST" value={inr(record.total_cgst)} mono />
          <Field label="SGST" value={inr(record.total_sgst)} mono />
          <Field label="IGST" value={inr(record.total_igst)} mono />
        </CardContent>
      </Card>

      {/* Signed QR (conditional) */}
      {record.signed_qr_code && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-success" /> Signed QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <img
              src={`data:image/png;base64,${record.signed_qr_code}`}
              alt="Signed QR Code"
              className="max-w-[200px] max-h-[200px] border rounded"
            />
          </CardContent>
        </Card>
      )}

      {/* Cancellation (conditional) */}
      {record.cancellation_reason && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-warning" /> Cancellation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Field label="Cancellation Reason" value={record.cancellation_reason} />
          </CardContent>
        </Card>
      )}

      {/* Error (conditional) */}
      {record.status === 'failed' && (record.error_code || record.error_message) && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> Error
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Error Code" value={dash(record.error_code)} mono />
            <Field label="Error Message" value={dash(record.error_message)} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
