/**
 * UniversalPrintFrame.tsx — Tally-Prime-style print letterhead frame for non-voucher records
 *
 * Sprint T-Phase-1.2.6a · Card #2.6 sub-sprint 1 of 5 · D-226 UTS Foundation
 *
 * Sibling abstraction. Voucher prints continue to use FineCore's print
 * components; non-voucher consumers (GRN, MIN, RTV, Quotation, ...) wrap
 * their content in this frame to satisfy UTS dimension #8 (print parity).
 *
 * Layout:
 *   1. Letterhead block (company + GSTIN/PAN/contact)
 *   2. Title bar (uppercase title + doc_no + voucher_date + optional effective_date)
 *   3. Reference block slot (PO/SO refs etc.)
 *   4. Body slot (children)
 *   5. Signatory rows (3-column grid with separator lines)
 *   6. Terms & Conditions footer
 *   7. Print/Close action bar (hidden in @media print)
 */

import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';

export interface PrintCompany {
  name: string;
  address?: string;
  gstin?: string;
  pan?: string;
  phone?: string;
  email?: string;
}

interface UniversalPrintFrameProps {
  company: PrintCompany;
  title: string;
  docNo: string;
  voucherDate: string;
  /** Optional. Shown only when different from voucherDate (D-226 UTS dim #3). */
  effectiveDate?: string | null;
  referenceBlock?: ReactNode;
  children: ReactNode;
  termsAndConditions?: string;
  onClose?: () => void;
  /** Optional override for signatory column labels. Default: ['Prepared by','Checked by','Authorised Signatory']. */
  signatories?: string[];
}

export function UniversalPrintFrame(props: UniversalPrintFrameProps) {
  const {
    company, title, docNo, voucherDate, effectiveDate,
    referenceBlock, children, termsAndConditions, onClose, signatories,
  } = props;
  const sigs = signatories && signatories.length > 0
    ? signatories
    : ['Prepared by', 'Checked by', 'Authorised Signatory'];

  const showEffective = !!effectiveDate && effectiveDate !== voucherDate;

  return (
    <div className="bg-background text-foreground">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 12mm; }
          body { background: white !important; }
        }
      `}</style>

      {/* Action bar */}
      <div className="no-print sticky top-0 z-10 flex justify-end gap-2 p-3 bg-background/80 backdrop-blur-xl border-b">
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" /> Print
        </Button>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-2">
            <X className="h-4 w-4" /> Close
          </Button>
        )}
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Letterhead */}
        <div className="border-b pb-4 text-center">
          <div className="text-2xl font-bold">{company.name}</div>
          {company.address && (
            <div className="text-sm text-muted-foreground mt-1">{company.address}</div>
          )}
          <div className="text-xs text-muted-foreground mt-1 font-mono space-x-3">
            {company.gstin && <span>GSTIN: {company.gstin}</span>}
            {company.pan && <span>PAN: {company.pan}</span>}
            {company.phone && <span>Phone: {company.phone}</span>}
            {company.email && <span>Email: {company.email}</span>}
          </div>
        </div>

        {/* Title bar */}
        <div className="flex items-center justify-between border-b pb-3">
          <h1 className="text-xl font-bold uppercase tracking-wider">{title}</h1>
          <div className="text-right text-sm">
            <div className="font-mono">{docNo}</div>
            <div className="text-muted-foreground">Date: <span className="font-mono">{voucherDate}</span></div>
            {showEffective && (
              <div className="text-muted-foreground">
                Effective: <span className="font-mono">{effectiveDate}</span>
              </div>
            )}
          </div>
        </div>

        {/* Reference block */}
        {referenceBlock && <div className="text-sm">{referenceBlock}</div>}

        {/* Body */}
        <div>{children}</div>

        {/* Signatory rows */}
        <div className="grid grid-cols-3 gap-8 pt-12">
          {['Prepared by', 'Checked by', 'Authorised Signatory'].map(label => (
            <div key={label} className="text-center">
              <div className="border-t pt-2 text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        {/* T&C */}
        {termsAndConditions && (
          <div className="text-xs text-muted-foreground border-t pt-3 whitespace-pre-line">
            <div className="font-semibold mb-1">Terms &amp; Conditions</div>
            {termsAndConditions}
          </div>
        )}
      </div>
    </div>
  );
}
