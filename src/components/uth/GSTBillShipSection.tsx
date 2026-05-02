/**
 * GSTBillShipSection.tsx — Composite Bill/Ship + GST summary mount
 * Sprint T-Phase-2.7-a · Batch C2 · drop-in mount for sales/dispatch transaction forms.
 *
 * Why a wrapper:
 *   The 6 transaction forms (Quotation, SRM, IM, SOM, DOM, DM) each carry their own
 *   FormState shape. To keep D-128 (zero schema-shape change) intact this component
 *   owns its own bill/ship state and exposes onChange so the host form can opt-in
 *   to persistence later without forcing it now.
 *
 * Inputs:
 *   customerId/customerName · drives auto-fill from customer master.
 *   supplierStateCode       · entity GSTIN state, drives intra/inter-state split.
 *   lines                   · simplified GST input (qty/rate/discount_pct/gst_rate).
 *
 * [JWT] No I/O · pure composition.
 */

import { useEffect, useState } from 'react';
import { BillShipAddressPicker } from './BillShipAddressPicker';
import { SimpleGSTPanel, type SimpleGSTLine } from './SimpleGSTPanel';
import { EMPTY_BILL_SHIP, type BillShipValue } from './BillShipAddressPicker.helpers';
import { determinePlaceOfSupply } from '@/lib/place-of-supply-engine';
import { Badge } from '@/components/ui/badge';

interface Props {
  customerId: string | null;
  customerName: string | null;
  supplierStateCode?: string | null;
  lines: SimpleGSTLine[];
  /** Optional · host form may persist bill/ship fields when ready. */
  onBillShipChange?: (next: BillShipValue) => void;
  /** Initial value for edit mode (host loads from voucher). Defaults to EMPTY_BILL_SHIP. */
  initialValue?: BillShipValue;
  /** Hides Ship-To column when irrelevant (Quotation/SRM may want bill-only). */
  showShipTo?: boolean;
}

export function GSTBillShipSection({
  customerId,
  customerName,
  supplierStateCode,
  lines,
  onBillShipChange,
  initialValue,
  showShipTo: _showShipTo = true,
}: Props) {
  const [value, setValue] = useState<BillShipValue>(initialValue ?? EMPTY_BILL_SHIP);

  useEffect(() => {
    onBillShipChange?.(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const pos = determinePlaceOfSupply(
    supplierStateCode ?? null,
    value.ship_to_state_code,
    value.bill_to_state_code,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Bill-To / Ship-To &amp; GST
        </h4>
        {pos.state_code && (
          <Badge variant="outline" className="text-[10px] font-mono">
            PoS: {pos.state_code} · {pos.state_name || '—'} ·{' '}
            {pos.is_interstate ? 'Inter-state' : 'Intra-state'}
          </Badge>
        )}
      </div>
      <BillShipAddressPicker
        customerId={customerId}
        customerName={customerName}
        value={value}
        onChange={setValue}
      />
      <SimpleGSTPanel
        lines={lines}
        supplier_state_code={supplierStateCode ?? null}
        pos_state_code={pos.state_code}
      />
    </div>
  );
}
