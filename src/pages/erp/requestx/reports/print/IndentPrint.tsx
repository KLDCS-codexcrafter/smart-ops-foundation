/**
 * IndentPrint.tsx — UPRA-4 Phase C · NEW union Print
 * A4 portrait indent commitment document · 3-kind discriminated rendering.
 * UniversalPrintFrame consumer · signatories Requester/Department Head/Authorised Signatory.
 *
 * Note: MaterialIndentLine / CapitalIndentLine carry `item_name` only (no `item_code` field);
 * line rows render `item_name` per type schema · documented in close summary.
 */
import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import { inrFmt } from '@/lib/requestx-report-engine';
import type { IndentUnionRow } from '../IndentRegister';

export interface IndentPrintProps {
  row: IndentUnionRow;
  onClose?: () => void;
}

export function IndentPrint({ row, onClose }: IndentPrintProps): JSX.Element {
  const { entityCode } = useEntityCode();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };

  const titleByKind: Record<IndentUnionRow['kind'], string> = {
    material: 'Material Indent',
    service: 'Service Request',
    capital: 'Capital Indent',
  };

  return (
    <UniversalPrintFrame
      company={company}
      title={titleByKind[row.kind]}
      docNo={row.voucher_no}
      voucherDate={row.date}
      onClose={onClose}
      signatories={['Requester', 'Department Head', 'Authorised Signatory']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div><span className="font-semibold">Requester:</span> {row.requested_by_name}</div>
          <div><span className="font-semibold">Department:</span> {row.originating_department_name}</div>
          <div><span className="font-semibold">Priority:</span> {row.priority}</div>
          <div><span className="font-semibold">Approval Tier:</span> {row.approval_tier}</div>
          <div><span className="font-semibold">FY:</span> {row.fiscal_year_id ?? '—'}</div>
          <div><span className="font-semibold">Kind:</span> {row.kind}</div>
          {row.kind === 'service' && (
            <>
              <div><span className="font-semibold">Service Track:</span> {row.service_track}</div>
              <div><span className="font-semibold">Vendor:</span> {row.vendor_id ?? '—'}</div>
            </>
          )}
          {row.kind === 'capital' && (
            <>
              <div><span className="font-semibold">Capital Type:</span> {row.capital_sub_type}</div>
              <div><span className="font-semibold">Finance Gate:</span> {row.finance_gate_required ? 'Required' : 'Not Required'}</div>
            </>
          )}
        </div>
      }
      termsAndConditions="Indent · commitment document only · zero GL/stock/GST impact at this stage (downstream RFQ/PO/GRN will create the postings). Requires HOD/Purchase/Finance approval per approval tier matrix."
    >
      {row.kind === 'material' && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sl</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>UoM</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">In Stock</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead>Target Godown</TableHead>
              <TableHead>Required Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {row.lines.map((line, idx) => (
              <TableRow key={line.id}>
                <TableCell className="font-mono">{idx + 1}</TableCell>
                <TableCell>{line.item_name}</TableCell>
                <TableCell>{line.uom}</TableCell>
                <TableCell className="text-right font-mono">{line.qty}</TableCell>
                <TableCell className="text-right font-mono">{line.current_stock_qty}</TableCell>
                <TableCell className="text-right font-mono">{inrFmt(line.estimated_rate)}</TableCell>
                <TableCell className="text-right font-mono">{inrFmt(line.estimated_value)}</TableCell>
                <TableCell className="text-xs">{line.target_godown_name}</TableCell>
                <TableCell className="font-mono text-xs">{line.required_date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {row.kind === 'service' && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sl</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>UoM</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">SLA (days)</TableHead>
              <TableHead>Required</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {row.lines.map((line, idx) => (
              <TableRow key={line.id}>
                <TableCell className="font-mono">{idx + 1}</TableCell>
                <TableCell>{line.service_name}</TableCell>
                <TableCell className="text-xs">{line.description}</TableCell>
                <TableCell className="text-right font-mono">{line.qty}</TableCell>
                <TableCell>{line.uom}</TableCell>
                <TableCell className="text-right font-mono">{inrFmt(line.estimated_rate)}</TableCell>
                <TableCell className="text-right font-mono">{inrFmt(line.estimated_value)}</TableCell>
                <TableCell className="text-right font-mono">{line.sla_days}</TableCell>
                <TableCell className="font-mono text-xs">{line.required_date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {row.kind === 'capital' && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sl</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>UoM</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead>CWIP Account</TableHead>
              <TableHead className="text-right">Useful Life (yr)</TableHead>
              <TableHead>Depreciation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {row.lines.map((line, idx) => (
              <TableRow key={line.id}>
                <TableCell className="font-mono">{idx + 1}</TableCell>
                <TableCell>{line.item_name}</TableCell>
                <TableCell>{line.uom}</TableCell>
                <TableCell className="text-right font-mono">{line.qty}</TableCell>
                <TableCell className="text-right font-mono">{inrFmt(line.estimated_rate)}</TableCell>
                <TableCell className="text-right font-mono">{inrFmt(line.estimated_value)}</TableCell>
                <TableCell className="text-xs">{line.cwip_account_id}</TableCell>
                <TableCell className="text-right font-mono">{line.expected_useful_life_years}</TableCell>
                <TableCell>{line.depreciation_method ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="mt-3 flex justify-end border-t pt-3 text-sm font-semibold">
        <div>Total Estimated Value: <span className="font-mono text-base">{inrFmt(row.total_estimated_value)}</span></div>
      </div>
    </UniversalPrintFrame>
  );
}
