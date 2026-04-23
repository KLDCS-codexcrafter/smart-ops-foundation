/**
 * @file     ManufacturingJournalPrint.tsx
 * @purpose  A4 printable Manufacturing Journal voucher (consumption + production + byproducts).
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created T10-pre.2b.3a · Last updated Apr-2026 (T10-pre.2b.3b-B2 — toggle-gating)
 * @sprint   T10-pre.2b.3a (original), T10-pre.2b.3b-B2 (resolved_toggles gating), T10-pre.2c-mop (export wiring)
 * @iso      Functional Suitability (HIGH) · Usability (HIGH) · Maintainability (HIGH)
 * @whom     Production
 * @depends  manufacturing-journal-print-engine.ts · print-config-storage.ts · PrintSheetFrame
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PrintSheetFrame } from '@/components/finecore/print/PrintSheetFrame';
import {
  buildMfgJournalPrintPayload, MFG_JOURNAL_COPY_CONFIG,
  formatDDMMMYYYY,
  buildMfgJournalExportRows,
  type MfgJournalPrintPayload, type MfgJournalPrintLine,
} from '@/lib/manufacturing-journal-print-engine';
import { loadVoucher, loadEntityGst } from '@/lib/voucher-print-shared';
import { loadPrintConfig } from '@/lib/print-config-storage';

function Section({ title, lines, total, prefix, showGodown }: {
  title: string; lines: MfgJournalPrintLine[]; total: number; prefix: string; showGodown: boolean;
}) {
  // [Analytical] Subtotal colSpan covers fixed pre-Qty: # + Code + Name (+ Godown if shown) = 3 or 4.
  const subtotalColSpan = showGodown ? 4 : 3;
  return (
    <div className="mt-4">
      <div className="bg-muted/50 px-2 py-1 text-[10px] uppercase tracking-wider font-semibold border border-border border-b-0">
        {title}
      </div>
      {lines.length === 0 ? (
        <div className="text-[10px] text-muted-foreground italic border border-border p-3 text-center">
          No {title.toLowerCase()} lines
        </div>
      ) : (
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-muted/30">
              <th className="border border-border p-1.5 text-left">#</th>
              <th className="border border-border p-1.5 text-left">Item Code</th>
              <th className="border border-border p-1.5 text-left">Item Name</th>
              {showGodown && <th className="border border-border p-1.5 text-left">Godown</th>}
              <th className="border border-border p-1.5 text-right">Qty</th>
              <th className="border border-border p-1.5 text-left">UOM</th>
            </tr>
          </thead>
          <tbody>
            {lines.map(l => (
              <tr key={`${prefix}-${l.sl_no}`}>
                <td className="border border-border p-1.5">{l.sl_no}</td>
                <td className="border border-border p-1.5 font-mono">{l.item_code || '—'}</td>
                <td className="border border-border p-1.5">{l.item_name}</td>
                {showGodown && <td className="border border-border p-1.5">{l.godown}</td>}
                <td className="border border-border p-1.5 text-right font-mono">{l.qty}</td>
                <td className="border border-border p-1.5">{l.uom}</td>
              </tr>
            ))}
            <tr className="bg-muted/20 font-semibold">
              <td className="border border-border p-1.5" colSpan={subtotalColSpan}>Subtotal</td>
              <td className="border border-border p-1.5 text-right font-mono">{total}</td>
              <td className="border border-border p-1.5"></td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

export function ManufacturingJournalPrintPanel() {
  const [params] = useSearchParams();
  const voucherId = params.get('voucher_id') ?? '';
  const entityCode = params.get('entity') ?? '';
  const copyKey = params.get('copy') ?? MFG_JOURNAL_COPY_CONFIG.default;

  const [payload, setPayload] = useState<MfgJournalPrintPayload | null>(null);

  useEffect(() => {
    if (!voucherId || !entityCode) return;
    const voucher = loadVoucher(entityCode, voucherId);
    if (!voucher) return;
    const gst = loadEntityGst(entityCode);
    // [Convergent] Load print config for this entity; engine resolves toggles into payload.resolved_toggles.
    const printConfig = loadPrintConfig(entityCode);
    setPayload(buildMfgJournalPrintPayload(voucher, gst, copyKey, printConfig));
  }, [voucherId, entityCode, copyKey]);

  const content = useMemo(() => {
    if (!payload) return <div className="text-sm text-muted-foreground">Loading voucher…</div>;
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
            <div className="text-muted-foreground">Mfg JV No</div>
            <div className="font-mono text-right">{payload.voucher_no}</div>
            <div className="text-muted-foreground">Date</div>
            <div className="font-mono text-right">{formatDDMMMYYYY(payload.voucher_date)}</div>
            {payload.department && (
              <>
                <div className="text-muted-foreground">Department</div>
                <div className="text-right">{payload.department}</div>
              </>
            )}
            <div className="text-muted-foreground">BOM Ref</div>
            <div className="font-mono text-right font-semibold">
              {payload.bom_id || '—'}
              {payload.bom_version_no != null && ` v${payload.bom_version_no}`}
            </div>
            <div className="text-muted-foreground">Batch Multiple</div>
            <div className="font-mono text-right font-semibold">{payload.batch_multiple}</div>
            {payload.overhead_ledger_name && (
              <>
                <div className="text-muted-foreground">Overhead Ledger</div>
                <div className="text-right">{payload.overhead_ledger_name}</div>
              </>
            )}
          </div>
        </div>

        <Section title="Consumption" lines={payload.consumption_lines} total={payload.total_consumption_qty} prefix="mj-c" showGodown={t.showGodown} />
        <Section title="Production" lines={payload.production_lines} total={payload.total_production_qty} prefix="mj-p" showGodown={t.showGodown} />
        <Section title="Byproducts" lines={payload.byproduct_lines} total={payload.total_byproduct_qty} prefix="mj-b" showGodown={t.showGodown} />

        {t.showNarration && payload.narration && (
          <div className="mt-3 text-[10px]">
            <span className="text-muted-foreground uppercase tracking-wider text-[9px]">Narration: </span>
            {payload.narration}
          </div>
        )}

        {t.showAuthorisedSignatory && (
          <div className="mt-10 flex justify-end text-[10px]">
            <div className="text-right">
              <div className="border-t border-border pt-1 w-48">{payload.authorised_signatory}</div>
              <div className="text-muted-foreground mt-0.5">Authorised Signatory</div>
            </div>
          </div>
        )}
      </>
    );
  }, [payload]);

  return (
    <PrintSheetFrame
      documentTitle="MANUFACTURING JOURNAL"
      documentNumber={payload?.voucher_no ?? ''}
      copyLabel={payload?.copy_label ?? ''}
      exportData={payload ? { payload, buildRows: (p) => buildMfgJournalExportRows(p as MfgJournalPrintPayload) } : undefined}
    >
      {content}
    </PrintSheetFrame>
  );
}

export default ManufacturingJournalPrintPanel;
