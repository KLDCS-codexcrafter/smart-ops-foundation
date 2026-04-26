/**
 * @file     PrintToolbarExport.tsx
 * @purpose  Reusable Excel-export button for print-page toolbars. Leverages the
 *           voucher-export-engine shipped in T10-pre.2c. Downloads .xlsx when clicked.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created Apr-2026 · T10-pre.2c-mop
 * @sprint   T10-pre.2c-mop
 * @iso      Functional Suitability (HIGH — single action) · Usability (HIGH — compact toolbar fit) · Maintainability (HIGH — one component, 14 consumers)
 * @whom     Accountants (Excel export) · auditors · (future) voucher register pages
 * @depends  voucher-export-engine.ts · sonner toast · lucide-react
 * @consumers PrintSheetFrame.tsx · SalesInvoicePrint.tsx (bespoke toolbar)
 */

import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import {
  exportVoucherAsXLSX, exportVoucherAsPDF, type ExportRows,
} from '@/lib/voucher-export-engine';

export interface PrintToolbarExportProps {
  /**
   * The voucher payload (shape varies per voucher type; unknown here because
   * this component is voucher-agnostic — types are enforced at the call-site).
   */
  payload: unknown;
  /**
   * The per-voucher row-builder function (e.g. `buildInvoiceExportRows`).
   * Returns ExportRows consumed by the shared XLSX serializer.
   */
  buildRows: (payload: unknown) => ExportRows;
  /** Optional override for the Excel button label. Default: "Excel". */
  label?: string;
  /** Optional override for the PDF button label. Default: "PDF". */
  pdfLabel?: string;
}

/**
 * @purpose   Render "Excel" + "PDF" buttons that export the given payload to .xlsx / .pdf on click.
 * @param     props.payload      — voucher payload (already built by parent)
 * @param     props.buildRows    — per-voucher row-builder (e.g. buildInvoiceExportRows)
 * @param     props.label        — optional Excel button label, default "Excel"
 * @param     props.pdfLabel     — optional PDF button label, default "PDF"
 * @why-this-approach  [Convergent] D-129: export belongs where payload lives (print page),
 *                     not where forms live (voucher entry). Shared component keeps
 *                     PrintSheetFrame lean and allows SalesInvoicePrint's bespoke toolbar
 *                     to drop it in without duplicating logic.
 *                     [T-T10-pre.2c-PDF] PDF button added alongside Excel · CSV/XLSX engines untouched.
 * @iso       Reliability (HIGH — try/catch with toast fallback) · Maintainability (HIGH)
 */
export function PrintToolbarExport({
  payload, buildRows, label = 'Excel', pdfLabel = 'PDF',
}: PrintToolbarExportProps) {
  const handleExcelClick = () => {
    try {
      const rows = buildRows(payload);
      exportVoucherAsXLSX(rows);
      toast.success('Exported as Excel');
    } catch (err) {
      // [Analytical] Diagnostic-only; banned-pattern rule targets console.log, not console.error.
      toast.error('Export failed. Check console for details.');
      console.error('Print-toolbar export error:', err);
    }
  };

  const handlePDFClick = () => {
    try {
      const rows = buildRows(payload);
      exportVoucherAsPDF(rows, 'voucher');
      toast.success('Exported as PDF');
    } catch (err) {
      // [Analytical] Diagnostic-only; banned-pattern rule targets console.log, not console.error.
      toast.error('PDF export failed. Check console for details.');
      console.error('Print-toolbar PDF export error:', err);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleExcelClick}>
        <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> {label}
      </Button>
      <Button variant="outline" size="sm" onClick={handlePDFClick}>
        <FileText className="h-3.5 w-3.5 mr-1" /> {pdfLabel}
      </Button>
    </>
  );
}

export default PrintToolbarExport;
