/**
 * SimpleGSTPanel.tsx — GST computation summary for non-FineCore line shapes
 * Sprint T-Phase-2.7-a · sibling to FineCore GSTComputationPanel.
 *
 * Consumes simpler line shape: { qty, rate, discount_pct?, gst_rate? }.
 * Splits into CGST/SGST or IGST based on supplier vs PoS state codes.
 * All ₹ math via Decimal.js (MONEY-MATH-AUDITED).
 * [JWT] No I/O · pure presentation.
 */

import { useMemo } from 'react';
import Decimal from 'decimal.js';
import { Card } from '@/components/ui/card';

export interface SimpleGSTLine {
  id: string;
  qty: number;
  rate: number;
  discount_pct?: number | null;
  gst_rate?: number | null;
}

interface Props {
  lines: SimpleGSTLine[];
  supplier_state_code: string | null | undefined;
  pos_state_code: string | null | undefined;
  /** Display-only currency code · default INR. */
  currency?: string;
}

interface GSTBreakdown {
  taxable: Decimal;
  cgst: Decimal;
  sgst: Decimal;
  igst: Decimal;
  cess: Decimal;
  total: Decimal;
  is_interstate: boolean;
}

function formatINR(d: Decimal): string {
  // Indian Lakhs grouping · ₹ symbol · 2 dp
  const n = d.toNumber();
  if (!Number.isFinite(n)) return '₹0.00';
  return `₹${n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** MONEY-MATH-AUDITED — Decimal.js only · no float arithmetic on ₹ values. */
function computeGST(
  lines: SimpleGSTLine[],
  supplier_state_code: string | null | undefined,
  pos_state_code: string | null | undefined,
): GSTBreakdown {
  const supplier = (supplier_state_code ?? '').trim().padStart(2, '0');
  const pos = (pos_state_code ?? '').trim().padStart(2, '0');
  const is_interstate = Boolean(supplier && pos) && supplier !== pos;

  let taxable = new Decimal(0);
  let cgst = new Decimal(0);
  let sgst = new Decimal(0);
  let igst = new Decimal(0);

  for (const ln of lines) {
    const qty = new Decimal(ln.qty || 0);
    const rate = new Decimal(ln.rate || 0);
    const discPct = new Decimal(ln.discount_pct || 0);
    const gross = qty.mul(rate);
    const disc = gross.mul(discPct).div(100);
    const lineTaxable = gross.sub(disc);
    taxable = taxable.add(lineTaxable);

    const gstRate = new Decimal(ln.gst_rate || 0);
    const tax = lineTaxable.mul(gstRate).div(100);

    if (is_interstate) {
      igst = igst.add(tax);
    } else {
      const half = tax.div(2);
      cgst = cgst.add(half);
      sgst = sgst.add(half);
    }
  }

  const cess = new Decimal(0);
  const total = taxable.add(cgst).add(sgst).add(igst).add(cess);

  return { taxable, cgst, sgst, igst, cess, total, is_interstate };
}

export function SimpleGSTPanel({
  lines,
  supplier_state_code,
  pos_state_code,
  currency = 'INR',
}: Props) {
  const g = useMemo(
    () => computeGST(lines, supplier_state_code, pos_state_code),
    [lines, supplier_state_code, pos_state_code],
  );

  return (
    <Card className="p-3 bg-card border-border">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          GST Summary
        </h4>
        <span className="text-[10px] text-muted-foreground font-mono">
          {g.is_interstate ? 'Inter-state · IGST' : 'Intra-state · CGST + SGST'} · {currency}
        </span>
      </div>
      <div className="space-y-1 text-xs font-mono">
        <Row label="Taxable Value" value={formatINR(g.taxable)} />
        {g.is_interstate ? (
          <Row label="IGST" value={formatINR(g.igst)} />
        ) : (
          <>
            <Row label="CGST" value={formatINR(g.cgst)} />
            <Row label="SGST" value={formatINR(g.sgst)} />
          </>
        )}
        {g.cess.gt(0) ? <Row label="Cess" value={formatINR(g.cess)} /> : null}
        <div className="border-t border-border pt-1 mt-1">
          <Row label="Total" value={formatINR(g.total)} bold />
        </div>
      </div>
    </Card>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
        {label}
      </span>
      <span className={bold ? 'font-semibold text-foreground' : 'text-foreground'}>
        {value}
      </span>
    </div>
  );
}
