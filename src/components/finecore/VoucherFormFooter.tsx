/**
 * VoucherFormFooter.tsx — Standard footer for every voucher form.
 *
 * PURPOSE
 * Consolidates the 5 standard voucher actions — Save (Post), Save & New, Cancel,
 * Print, Export — into one reusable footer. Every voucher in FinCore uses this.
 * Keeps UX consistent across Receipt, Payment, Contra, JV, SI, PI, CN, DN, and
 * all inventory vouchers added in later sub-sprints.
 *
 * INPUT        onPost, onSaveAndNew, onCancel, disabled flags, status
 * OUTPUT       UI — fires the appropriate handler on button click
 *
 * DEPENDENCIES shadcn Button + DropdownMenu + sonner toast
 *
 * TALLY-ON-TOP BEHAVIOR
 * Footer is agnostic. Consuming voucher reads tenantConfig.accountingMode and
 * decides what happens inside its own onPost handler.
 *
 * SPEC DOC     FinCore Voucher Deep Audit (Apr 2026) — cross-cutting gaps section
 *              Sprint T10-pre.1a Session B scope
 *
 * PHASE 2 NOTE
 * Print + Export remain stubs. Real handlers arrive in:
 *   - T10-pre.4: Invoice print layouts via pdfmake (D-035)
 *   - T10-pre.5: Export triad (Excel / Word / PDF) reusable hooks
 */
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Printer, Download, Save, SaveAll, X, Loader2, FileText, FileSpreadsheet, File,
} from 'lucide-react';
import { toast } from 'sonner';

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
}

export function VoucherFormFooter({
  onPost, onSaveAndNew, onCancel,
  isSaving = false, canPost = true, status = 'draft',
  showPrint = true, showExport = true, postLabel,
}: VoucherFormFooterProps) {
  const resolvedPostLabel = postLabel
    ?? (status === 'posted' ? 'Amend'
      : status === 'cancelled' ? 'Reinstate'
      : 'Post');

  const handlePrint = () => {
    toast.info('Print preview arrives with Sprint T10-pre.4 (pdfmake invoice layouts).');
  };

  const handleExport = (fmt: 'excel' | 'word' | 'pdf') => {
    toast.info(`Export to ${fmt.toUpperCase()} arrives with Sprint T10-pre.5 (reusable export triad).`);
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
              <DropdownMenuItem onClick={() => handleExport('word')}>
                <FileText className="h-4 w-4 mr-2" /> Word (.docx)
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
