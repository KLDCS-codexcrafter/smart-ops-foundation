/**
 * DOMPrint.tsx — Demo Outward Memo print
 * Sprint T-Phase-1.2.6c · D-226 UTS dim #8
 */

import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { DOM_STATUS_LABELS, type DemoOutwardMemo } from '@/types/demo-outward-memo';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;

interface Props { dom: DemoOutwardMemo; onClose?: () => void }

export function DOMPrint({ dom, onClose }: Props) {
  const { entityCode } = useCardEntitlement();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };
  const total = dom.items.reduce((s, l) => s + l.amount, 0);

  return (
    <UniversalPrintFrame
      company={company}
      title="Demo Outward Memo"
      docNo={dom.memo_no}
      voucherDate={dom.memo_date}
      effectiveDate={dom.effective_date}
      onClose={onClose}
      signatories={['Issued By', 'Demo Coordinator', 'Authorised Signatory']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">Recipient:</span> {dom.recipient_name}</div>
          <div><span className="font-semibold">Company:</span> {dom.recipient_company ?? '—'}</div>
          <div><span className="font-semibold">Status:</span> {DOM_STATUS_LABELS[dom.status]}</div>
          <div><span className="font-semibold">Demo Period:</span> {dom.demo_period_days} days</div>
          <div><span className="font-semibold">Demo Start:</span> {dom.demo_start_date ?? '—'}</div>
          <div><span className="font-semibold">Demo End / Due:</span> {dom.demo_end_date ?? '—'}</div>
          <div><span className="font-semibold">Salesman:</span> {dom.salesman_name ?? '—'}</div>
          <div><span className="font-semibold">Engineer:</span> {dom.engineer_name ?? '—'}</div>
          {dom.outward_godown_name && (
            <div className="col-span-2"><span className="font-semibold">Outward Godown:</span> {dom.outward_godown_name}</div>
          )}
        </div>
      }
      termsAndConditions="Demo unit dispatched on returnable basis. Recipient is responsible for safe custody and return on or before the demo end date. Damage / loss may be charged at unit value."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead>Serial No</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Unit Value ₹</TableHead>
            <TableHead className="text-right">Amount ₹</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dom.items.map((l, i) => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{i + 1}</TableCell>
              <TableCell className="text-xs">{l.item_name}{l.description ? ` · ${l.description}` : ''}</TableCell>
              <TableCell className="text-xs">{l.uom ?? '—'}</TableCell>
              <TableCell className="text-xs font-mono">{l.serial_no ?? '—'}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.unit_value)}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.amount)}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={6} className="text-right font-semibold">Total Value</TableCell>
            <TableCell className="text-right font-mono font-semibold">{fmtINR(total)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </UniversalPrintFrame>
  );
}
