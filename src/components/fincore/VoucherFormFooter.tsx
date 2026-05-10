/**
 * VoucherFormFooter.tsx — Standard footer for every voucher form.
 *
 * PURPOSE
 * Consolidates the 5 standard voucher actions — Save (Post), Save & New, Cancel,
 * Print, Export — into one reusable footer. Every voucher in FinCore uses this.
 * Keeps UX consistent across Receipt, Payment, Contra, JV, SI, PI, CN, DN, and
 * all inventory vouchers added in later sub-sprints.
 *
 * INPUT        onPost, onSaveAndNew, onCancel, disabled flags, status, exportData
 * OUTPUT       UI — fires the appropriate handler on button click
 *
 * DEPENDENCIES shadcn Button + DropdownMenu + sonner toast + voucher-export-engine
 *
 * TALLY-ON-TOP BEHAVIOR
 * Footer is agnostic. Consuming voucher reads tenantConfig.accountingMode and
 * decides what happens inside its own onPost handler.
 *
 * SPEC DOC     FinCore Voucher Deep Audit (Apr 2026) — cross-cutting gaps section
 *              Sprint T10-pre.1a Session B scope · T10-pre.2c (Export Triad wired)
 *
 * EXPORT (T10-pre.2c)
 * Export → Excel/CSV downloads via voucher-export-engine when `exportData` is
 * provided by the parent voucher form. Export → PDF reuses window.print()
 * (D-127). When `exportData` is absent, Excel/CSV show a toast prompting save.
 */
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Printer, Download, Save, SaveAll, X, Loader2, FileText, FileSpreadsheet, File,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  exportVoucherAsCSV, exportVoucherAsXLSX, type ExportRows,
} from '@/lib/voucher-export-engine';

interface VoucherFormFooterProps {
  /** Fires when user clicks "Post". */
  onPost: () => void | Promise<void>;
  /** Fires when user clicks "Save & New". Optional — button hidden if not provided. */
  onSaveAndNew?: () => void | Promise<void>;
  /** Fires when user clicks "Cancel" — voucher-level cancel. */
  onCancel: () => void;
  /** Is the form busy (saving)? Disables action buttons. */
  isSaving?: boolean;
  /** Post / Save-and-New buttons render only if true. */
  canPost?: boolean;
  /** Voucher status — controls Post button label. */
  status?: 'draft' | 'posted' | 'cancelled' | 'in_transit' | 'received';
  /** Show Print button? Default true. */
  showPrint?: boolean;
  /** Show Export dropdown? Default true. */
  showExport?: boolean;
  /** Custom label for Post button. */
  postLabel?: string;
  /**
   * [T10-pre.2c] Optional export wiring. When provided, the "Export → Excel/CSV"
   * dropdown items trigger real downloads via voucher-export-engine. When absent,
   * the dropdown still renders but the click shows a toast (save-first hint).
   * `unknown` here because the footer is voucher-agnostic; types are enforced
   * at the call-site in each voucher form.
   */
  exportData?: {
    payload: unknown;
    buildRows: (payload: unknown) => ExportRows;
  };
}

export function VoucherFormFooter({
  onPost, onSaveAndNew, onCancel,
  isSaving = false, canPost = true, status = 'draft',
  showPrint = true, showExport = true, postLabel,
  exportData,
}: VoucherFormFooterProps) {
  const resolvedPostLabel = postLabel
    ?? (status === 'posted' ? 'Amend'
      : status === 'cancelled' ? 'Reinstate'
      : 'Post');

  const handlePrint = () => {
    // [Convergent] D-127: reuse browser print pipeline.
    window.print();
  };

  const handleExport = (fmt: 'excel' | 'csv' | 'pdf') => {
    if (fmt === 'pdf') {
      // [Convergent] D-127: reuse window.print(). User selects "Save as PDF" in the dialog.
      window.print();
      return;
    }
    if (!exportData) {
      toast.info(`Export to ${fmt.toUpperCase()} requires the voucher to be saved first.`);
      return;
    }
    try {
      const rows = exportData.buildRows(exportData.payload);
      if (fmt === 'excel') {
        exportVoucherAsXLSX(rows);
      } else {
        exportVoucherAsCSV(rows);
      }
      toast.success(`Exported as ${fmt === 'excel' ? 'Excel' : 'CSV'}`);
    } catch (err) {
      // [Analytical] Diagnostic-only console.error (banned-pattern targets console.log, not console.error).
      toast.error('Export failed. Check console for details.');
      console.error('Voucher export error:', err);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      <div>
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          <X className="h-4 w-4 mr-1.5" />
          Cancel
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {showPrint && (
          <Button variant="outline" onClick={handlePrint} disabled={isSaving}>
            <Printer className="h-4 w-4 mr-1.5" />
            Print
          </Button>
        )}

        {showExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isSaving}>
                <Download className="h-4 w-4 mr-1.5" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileText className="h-4 w-4 mr-2" /> CSV (.csv)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <File className="h-4 w-4 mr-2" /> PDF (.pdf)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {canPost && onSaveAndNew && (
          <Button variant="outline" onClick={onSaveAndNew} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <SaveAll className="h-4 w-4 mr-1.5" />}
            Save &amp; New
          </Button>
        )}

        {canPost && (
          <Button data-primary onClick={onPost} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            {resolvedPostLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
