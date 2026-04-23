/**
 * @file     ContraEntryPrint.tsx
 * @purpose  A4 printable Contra voucher (cash/bank transfer) — 1-copy (Accounts).
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created T10-pre.2b.1 · Last updated Apr-2026 (T10-pre.2b.3b-B2 — toggle-gating)
 * @sprint   T10-pre.2b.1 (original), T10-pre.2b.3b-B2 (resolved_toggles gating), T10-pre.2c-mop (export wiring)
 * @iso      Functional Suitability (HIGH — applicable header/footer toggles honored) · Usability (HIGH — Tally F12 parity) · Maintainability (HIGH — uniform gating pattern)
 * @whom     Accountant (accounts copy)
 * @depends  contra-print-engine.ts · print-config-storage.ts · PrintSheetFrame
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PrintSheetFrame } from '@/components/finecore/print/PrintSheetFrame';
import {
  buildContraPrintPayload, CONTRA_COPY_CONFIG,
  formatINR, formatDDMMMYYYY,
  buildContraExportRows,
  type ContraPrintPayload,
} from '@/lib/contra-print-engine';
import { loadVoucher, loadEntityGst } from '@/lib/voucher-print-shared';
import { loadPrintConfig } from '@/lib/print-config-storage';

export function ContraEntryPrintPanel() {
  const [params] = useSearchParams();
  const voucherId = params.get('voucher_id') ?? '';
  const entityCode = params.get('entity') ?? '';
  const copyKey = params.get('copy') ?? CONTRA_COPY_CONFIG.default;

  const [payload, setPayload] = useState<ContraPrintPayload | null>(null);

  useEffect(() => {
    if (!voucherId || !entityCode) return;
    const voucher = loadVoucher(entityCode, voucherId);
    if (!voucher) return;
    const gst = loadEntityGst(entityCode);
    // [Convergent] Load print config for this entity; engine resolves toggles into payload.resolved_toggles.
    const printConfig = loadPrintConfig(entityCode);
    setPayload(buildContraPrintPayload(voucher, gst, copyKey, printConfig));
  }, [voucherId, entityCode, copyKey]);

  const content = useMemo(() => {
    if (!payload) return (
      <div className="text-sm text-muted-foreground">Loading voucher…</div>
    );
    const t = payload.resolved_toggles;
    return (
      <>
        <div className="grid grid-cols-2 gap-4 text-[11px]">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Entity</div>
            <div className="font-semibold text-[13px]">{payload.supplier.legal_name}</div>
            <div className="text-muted-foreground text-[10px]">{payload.supplier_address}</div>
            {t.showHeaderGstin && payload.supplier.gstin && (
              <div className="font-mono text-[10px]">GSTIN: {payload.supplier.gstin}</div>
            )}
            {t.showHeaderPan && payload.supplier.pan && (
              <div className="font-mono text-[10px]">PAN: {payload.supplier.pan}</div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <div className="text-muted-foreground">Contra No</div>
            <div className="font-mono text-right">{payload.voucher_no}</div>
            <div className="text-muted-foreground">Date</div>
            <div className="font-mono text-right">{formatDDMMMYYYY(payload.voucher_date)}</div>
            {payload.instrument && (
              <>
                <div className="text-muted-foreground">Mode</div>
                <div className="text-right">{payload.instrument}</div>
              </>
            )}
            {payload.instrument_ref_no && (
              <>
                <div className="text-muted-foreground">Ref</div>
                <div className="font-mono text-right">{payload.instrument_ref_no}</div>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-[11px] border rounded p-3 bg-muted/30">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">From</div>
            <div className="font-semibold">{payload.from_ledger || '—'}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">To</div>
            <div className="font-semibold">{payload.to_ledger || '—'}</div>
          </div>
        </div>

        <table className="w-full mt-4 text-[10px] border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="border border-border p-1.5 text-left">#</th>
              <th className="border border-border p-1.5 text-left">Ledger</th>
              <th className="border border-border p-1.5 text-left">Narration</th>
              <th className="border border-border p-1.5 text-right">Debit</th>
              <th className="border border-border p-1.5 text-right">Credit</th>
            </tr>
          </thead>
          <tbody>
            {payload.ledger_lines.map((l, i) => (
              <tr key={`contra-ll-${i}`}>
                <td className="border border-border p-1.5">{i + 1}</td>
                <td className="border border-border p-1.5">{l.ledger_name}</td>
                <td className="border border-border p-1.5 text-muted-foreground">{l.narration || '—'}</td>
                <td className="border border-border p-1.5 text-right font-mono">
                  {l.dr_amount > 0 ? formatINR(l.dr_amount) : ''}
                </td>
                <td className="border border-border p-1.5 text-right font-mono">
                  {l.cr_amount > 0 ? formatINR(l.cr_amount) : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 border-t border-border pt-2 flex items-end justify-between text-[11px]">
          {t.showAmountInWords ? (
            <div className="flex-1 pr-4">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Amount in words</div>
              <div className="italic">{payload.amount_in_words}</div>
            </div>
          ) : <div className="flex-1 pr-4" />}
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Amount</div>
            <div className="text-lg font-bold font-mono">₹{formatINR(payload.total_amount)}</div>
          </div>
        </div>

        {t.showNarration && payload.narration && (
          <div className="mt-3 text-[10px]">
            <span className="text-muted-foreground uppercase tracking-wider text-[9px]">Narration: </span>
            {payload.narration}
          </div>
        )}

        {t.showAuthorisedSignatory && (
          <div className="mt-10 flex justify-end text-[10px]">
            <div className="text-right">
              <div className="border-t border-border pt-1 w-48">
                {payload.authorised_signatory}
              </div>
              <div className="text-muted-foreground mt-0.5">Authorised Signatory</div>
            </div>
          </div>
        )}
      </>
    );
  }, [payload]);

  return (
    <PrintSheetFrame
      documentTitle="CONTRA VOUCHER"
      documentNumber={payload?.voucher_no ?? ''}
      copyLabel={payload?.copy_label ?? ''}
      exportData={payload ? { payload, buildRows: (p) => buildContraExportRows(p as ContraPrintPayload) } : undefined}
    >
      {content}
    </PrintSheetFrame>
  );
}

export default ContraEntryPrintPanel;
