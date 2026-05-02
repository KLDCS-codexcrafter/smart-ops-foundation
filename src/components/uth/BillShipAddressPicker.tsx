/**
 * BillShipAddressPicker.tsx — Bill-To/Ship-To address selector
 * Sprint T-Phase-2.7-a · Q1-a · auto-loads from customer master · falls back
 *   to resolveCustomerAddress snapshot when no addresses found.
 *
 * Auto-fills bill_to + ship_to with default-billing / default-ship-to.
 * Operator can pick from available addresses or paste a free-text override.
 * [JWT] GET /api/masters/customers/:id (via existing customer-address-lookup).
 */

import { useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { resolveCustomerAddress } from '@/lib/customer-address-lookup';
import { stateCodeOptions } from '@/lib/place-of-supply-engine';
import type { BillShipValue } from './BillShipAddressPicker.helpers';

interface CustomerAddressRow {
  id: string;
  label?: string;
  addressLine?: string;
  stateCode?: string;
  stateName?: string;
  cityName?: string;
  pinCode?: string;
  isBilling?: boolean;
  isDefaultShipTo?: boolean;
  gstin?: string;
}

interface CustomerMasterRow {
  id: string;
  partyName?: string;
  gstin?: string;
  addresses?: CustomerAddressRow[];
}

export type { BillShipValue };

interface Props {
  customerId: string | null;
  customerName: string | null;
  value: BillShipValue;
  onChange: (next: BillShipValue) => void;
  /** Optional · disables auto-fill (e.g. when editing a saved record). */
  disableAutofill?: boolean;
}

function loadCustomerAddresses(customerId: string | null): {
  addresses: CustomerAddressRow[];
  customer: CustomerMasterRow | null;
} {
  if (!customerId) return { addresses: [], customer: null };
  try {
    // [JWT] GET /api/masters/customers/:id
    const raw = localStorage.getItem('erp_group_customer_master');
    const list: CustomerMasterRow[] = raw ? JSON.parse(raw) : [];
    const cust = list.find((c) => c.id === customerId) ?? null;
    return { addresses: cust?.addresses ?? [], customer: cust };
  } catch {
    return { addresses: [], customer: null };
  }
}

function buildSnapshot(a: CustomerAddressRow | null | undefined): string {
  if (!a) return '';
  return [a.addressLine, a.cityName, a.stateName, a.pinCode]
    .filter(Boolean)
    .join(', ');
}

export function BillShipAddressPicker({
  customerId,
  customerName,
  value,
  onChange,
  disableAutofill = false,
}: Props) {
  const { addresses, customer } = useMemo(
    () => loadCustomerAddresses(customerId),
    [customerId],
  );

  // Auto-fill defaults on customer change (only when current value is empty)
  useEffect(() => {
    if (disableAutofill) return;
    if (!customerId) return;
    if (value.bill_to_address_snapshot || value.ship_to_address_snapshot) return;

    const billing = addresses.find((a) => a.isBilling) ?? addresses[0] ?? null;
    const shipping = addresses.find((a) => a.isDefaultShipTo) ?? billing;

    if (!billing && !shipping) {
      // Fall back to resolveCustomerAddress (legacy snapshot)
      const fallback = resolveCustomerAddress(customerId, customerName, null);
      if (fallback.full_address) {
        onChange({
          bill_to_address_id: null,
          bill_to_address_snapshot: fallback.full_address,
          bill_to_state_code: fallback.state_code || null,
          bill_to_gstin: customer?.gstin ?? null,
          ship_to_address_id: null,
          ship_to_address_snapshot: fallback.full_address,
          ship_to_state_code: fallback.state_code || null,
          ship_to_gstin: customer?.gstin ?? null,
        });
      }
      return;
    }

    onChange({
      bill_to_address_id: billing?.id ?? null,
      bill_to_address_snapshot: buildSnapshot(billing),
      bill_to_state_code: billing?.stateCode ?? null,
      bill_to_gstin: billing?.gstin ?? customer?.gstin ?? null,
      ship_to_address_id: shipping?.id ?? null,
      ship_to_address_snapshot: buildSnapshot(shipping),
      ship_to_state_code: shipping?.stateCode ?? null,
      ship_to_gstin: shipping?.gstin ?? customer?.gstin ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, addresses.length]);

  const updateBillTo = (addrId: string) => {
    const a = addresses.find((x) => x.id === addrId) ?? null;
    onChange({
      ...value,
      bill_to_address_id: a?.id ?? null,
      bill_to_address_snapshot: buildSnapshot(a),
      bill_to_state_code: a?.stateCode ?? null,
      bill_to_gstin: a?.gstin ?? customer?.gstin ?? null,
    });
  };

  const updateShipTo = (addrId: string) => {
    const a = addresses.find((x) => x.id === addrId) ?? null;
    onChange({
      ...value,
      ship_to_address_id: a?.id ?? null,
      ship_to_address_snapshot: buildSnapshot(a),
      ship_to_state_code: a?.stateCode ?? null,
      ship_to_gstin: a?.gstin ?? customer?.gstin ?? null,
    });
  };

  const states = stateCodeOptions();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Bill-To */}
      <div className="space-y-2 rounded-lg border border-border bg-card p-3">
        <Label className="text-xs font-semibold uppercase text-muted-foreground">Bill-To</Label>
        {addresses.length > 0 ? (
          <Select
            value={value.bill_to_address_id ?? ''}
            onValueChange={updateBillTo}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select billing address" />
            </SelectTrigger>
            <SelectContent>
              {addresses.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.label || a.addressLine || a.cityName || a.id}
                  {a.isBilling ? ' · default' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Input
          className="text-xs"
          placeholder="Address snapshot"
          value={value.bill_to_address_snapshot ?? ''}
          onChange={(e) =>
            onChange({ ...value, bill_to_address_snapshot: e.target.value || null })
          }
        />
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={value.bill_to_state_code ?? ''}
            onValueChange={(v) =>
              onChange({ ...value, bill_to_state_code: v || null })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              {states.map((s) => (
                <SelectItem key={s.code} value={s.code}>
                  {s.code} · {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="h-8 text-xs font-mono"
            placeholder="GSTIN"
            value={value.bill_to_gstin ?? ''}
            onChange={(e) =>
              onChange({ ...value, bill_to_gstin: e.target.value.toUpperCase() || null })
            }
            maxLength={15}
          />
        </div>
      </div>

      {/* Ship-To */}
      <div className="space-y-2 rounded-lg border border-border bg-card p-3">
        <Label className="text-xs font-semibold uppercase text-muted-foreground">Ship-To</Label>
        {addresses.length > 0 ? (
          <Select
            value={value.ship_to_address_id ?? ''}
            onValueChange={updateShipTo}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select shipping address" />
            </SelectTrigger>
            <SelectContent>
              {addresses.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.label || a.addressLine || a.cityName || a.id}
                  {a.isDefaultShipTo ? ' · default' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Input
          className="text-xs"
          placeholder="Address snapshot"
          value={value.ship_to_address_snapshot ?? ''}
          onChange={(e) =>
            onChange({ ...value, ship_to_address_snapshot: e.target.value || null })
          }
        />
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={value.ship_to_state_code ?? ''}
            onValueChange={(v) =>
              onChange({ ...value, ship_to_state_code: v || null })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              {states.map((s) => (
                <SelectItem key={s.code} value={s.code}>
                  {s.code} · {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="h-8 text-xs font-mono"
            placeholder="GSTIN"
            value={value.ship_to_gstin ?? ''}
            onChange={(e) =>
              onChange({ ...value, ship_to_gstin: e.target.value.toUpperCase() || null })
            }
            maxLength={15}
          />
        </div>
      </div>
    </div>
  );
}
