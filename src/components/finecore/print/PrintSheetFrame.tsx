/**
 * PrintSheetFrame.tsx — A4 page frame for voucher prints.
 *
 * Renders the sticky print toolbar (Back, Print) and the A4 white sheet.
 * Children are the voucher-specific content.
 *
 * Used by: ReceiptPrint, PaymentPrint, ContraEntryPrint, JournalEntryPrint
 *   (T10-pre.2b.1) and forthcoming prints.
 *
 * @media print hides the toolbar via .no-print, sets white background,
 * removes shadow, and sets @page size: A4 with 12mm margin.
 */

import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';

interface PrintSheetFrameProps {
  documentTitle: string;
  documentNumber: string;
  copyLabel: string;
  children: ReactNode;
}

export function PrintSheetFrame({
  documentTitle, documentNumber, copyLabel, children,
}: PrintSheetFrameProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-muted/40">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body, html { background: white !important; }
          .print-sheet { box-shadow: none !important; margin: 0 !important; }
        }
        @page { size: A4; margin: 12mm; }
      `}</style>

      {/* Toolbar (hidden on print) */}
      <div className="no-print sticky top-0 z-10 border-b border-border/50 bg-background/90 backdrop-blur px-4 py-2 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>
        <div className="flex-1 text-sm font-semibold">
          {documentTitle} · {documentNumber}
        </div>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5 mr-1" /> Print
        </Button>
      </div>

      {/* A4 sheet */}
      <div
        className="print-sheet mx-auto my-4 bg-white text-foreground shadow-lg"
        style={{ width: '210mm', minHeight: '297mm', padding: '12mm' }}
      >
        <div className="border-b border-border pb-2 mb-3">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
            {copyLabel}
          </div>
          <h1 className="text-xl font-bold tracking-tight">{documentTitle}</h1>
        </div>

        {children}
      </div>
    </div>
  );
}

export default PrintSheetFrame;
