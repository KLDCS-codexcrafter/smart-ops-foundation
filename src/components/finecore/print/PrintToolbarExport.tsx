/**
 * @file     PrintToolbarExport.tsx
 * @purpose  Reusable export buttons for print-page toolbars: Excel · PDF · Word · Tally (XML/JSON).
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created Apr-2026 · T10-pre.2c-mop · Tally added T-T10-pre.2c-TallyNative
 * @sprint   T-T10-pre.2c-TallyNative
 * @iso      Functional Suitability (HIGH) · Maintainability (HIGH — one component, 14 consumers)
 * @whom     Accountants · auditors · (future) voucher-register pages
 * @depends  voucher-export-engine.ts · sonner toast · lucide-react
 */

import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { FileSpreadsheet, FileText, FileType2, FileCode } from 'lucide-react';
import { toast } from 'sonner';
import {
  exportVoucherAsXLSX, exportVoucherAsPDF, exportVoucherAsWord,
  exportVoucherAsTallyXML, exportVoucherAsTallyJSON,
  type ExportRows, type TallyAction,
} from '@/lib/voucher-export-engine';
import type { Voucher } from '@/types/voucher';

export interface PrintToolbarExportProps {
  payload: unknown;
  buildRows: (payload: unknown) => ExportRows;
  label?: string;
  pdfLabel?: string;
  wordLabel?: string;
  /** Tally button label (default 'Tally'). */
  tallyLabel?: string;
  /**
   * The full Voucher used by Tally exporters. Optional — if not provided,
   * the Tally menu items show an error toast prompting the parent to wire it.
   */
  voucher?: Voucher;
  /** Default Tally action for this consumer (default 'Create'). */
  tallyAction?: TallyAction;
  /** Company name for <SVCURRENTCOMPANY> tag (default ''). */
  tallyCompanyName?: string;
}

export function PrintToolbarExport({
  payload, buildRows,
  label = 'Excel', pdfLabel = 'PDF', wordLabel = 'Word', tallyLabel = 'Tally',
  voucher, tallyAction = 'Create', tallyCompanyName = '',
}: PrintToolbarExportProps) {
  const handleExcelClick = () => {
    try {
      exportVoucherAsXLSX(buildRows(payload));
      toast.success('Exported as Excel');
    } catch (err) {
      toast.error('Export failed. Check console for details.');
      console.error('Print-toolbar export error:', err);
    }
  };

  const handlePDFClick = () => {
    try {
      exportVoucherAsPDF(buildRows(payload), 'voucher');
      toast.success('Exported as PDF');
    } catch (err) {
      toast.error('PDF export failed. Check console for details.');
      console.error('Print-toolbar PDF export error:', err);
    }
  };

  const handleWordClick = () => {
    try {
      exportVoucherAsWord(buildRows(payload), 'voucher');
      toast.success('Exported as Word');
    } catch (err) {
      toast.error('Word export failed. Check console for details.');
      console.error('Print-toolbar Word export error:', err);
    }
  };

  // [T-T10-pre.2c-TallyNative] Tally export takes the raw Voucher (not ExportRows)
  // since Tally schema needs full voucher detail (party, ledger lines, inventory, GST).
  const handleTallyExport = (format: 'xml' | 'json') => {
    if (!voucher) {
      toast.error('Tally export requires the voucher prop. Wire it from the parent.');
      return;
    }
    try {
      if (format === 'xml') exportVoucherAsTallyXML(voucher, tallyAction, tallyCompanyName);
      else exportVoucherAsTallyJSON(voucher, tallyAction, tallyCompanyName);
      toast.success(`Exported as Tally ${format.toUpperCase()}`);
    } catch (err) {
      toast.error(`Tally ${format.toUpperCase()} export failed. Check console for details.`);
      console.error(`Print-toolbar Tally ${format.toUpperCase()} export error:`, err);
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
      <Button variant="outline" size="sm" onClick={handleWordClick}>
        <FileType2 className="h-3.5 w-3.5 mr-1" /> {wordLabel}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <FileCode className="h-3.5 w-3.5 mr-1" /> {tallyLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => handleTallyExport('xml')}>Export as Tally XML</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleTallyExport('json')}>Export as Tally JSON</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export default PrintToolbarExport;
