/**
 * customer-address-lookup.ts — Resolve a Voucher's customer to a printable address
 * Sprint 9 audit fix #3+#4: SalesInvoice and InvoicePrint must NOT use
 * `party_name` as the address. Look up the real customer master record and
 * return the default-billing address fields.
 *
 * [JWT] GET /api/masters/customers/:id
 */

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
}

interface CustomerMasterRow {
  id: string;
  partyCode?: string;
  partyName?: string;
  gstin?: string;
  pan?: string;
  addresses?: CustomerAddressRow[];
}

export interface ResolvedCustomerAddress {
  full_address: string;
  city: string;
  pincode: string;
  state_code: string;
  legal_name: string;
}

const EMPTY: ResolvedCustomerAddress = {
  full_address: '',
  city: '',
  pincode: '',
  state_code: '',
  legal_name: '',
};

function pickAddress(addrs: CustomerAddressRow[] | undefined): CustomerAddressRow | null {
  if (!addrs || addrs.length === 0) return null;
  return addrs.find(a => a.isBilling) ?? addrs.find(a => a.isDefaultShipTo) ?? addrs[0];
}

/**
 * Resolve customer billing address from local customer master.
 * Falls back to vouchers fields when master row is missing.
 */
export function resolveCustomerAddress(
  customerId: string | null | undefined,
  partyName: string | null | undefined,
  fallbackStateCode: string | null | undefined,
): ResolvedCustomerAddress {
  try {
    // [JWT] GET /api/masters/customers
    const raw = localStorage.getItem('erp_group_customer_master');
    const list: CustomerMasterRow[] = raw ? JSON.parse(raw) : [];
    const cust = (customerId ? list.find(c => c.id === customerId) : null)
      ?? (partyName ? list.find(c => c.partyName === partyName) : null);
    if (!cust) {
      return {
        ...EMPTY,
        legal_name: partyName ?? '',
        state_code: fallbackStateCode ?? '',
      };
    }
    const addr = pickAddress(cust.addresses);
    if (!addr) {
      return {
        ...EMPTY,
        legal_name: cust.partyName ?? partyName ?? '',
        state_code: fallbackStateCode ?? '',
      };
    }
    const fullParts = [addr.addressLine, addr.cityName, addr.stateName, addr.pinCode]
      .filter(Boolean)
      .join(', ');
    return {
      full_address: fullParts,
      city: addr.cityName ?? '',
      pincode: addr.pinCode ?? '',
      state_code: addr.stateCode ?? fallbackStateCode ?? '',
      legal_name: cust.partyName ?? partyName ?? '',
    };
  } catch {
    return {
      ...EMPTY,
      legal_name: partyName ?? '',
      state_code: fallbackStateCode ?? '',
    };
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Format ISO/yyyy-mm-dd to DD MMM YYYY (Indian display). */
export function formatDDMMMYYYY(input: string | null | undefined): string {
  if (!input) return '—';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input;
  const day = String(d.getDate()).padStart(2, '0');
  const mon = MONTHS[d.getMonth()];
  return `${day} ${mon} ${d.getFullYear()}`;
}

/** Format ISO timestamp to DD MMM YYYY HH:mm IST. */
export function formatDateTimeIST(input: string | null | undefined): string {
  if (!input) return '—';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input;
  const date = formatDDMMMYYYY(input);
  // Convert to IST (UTC+5:30) regardless of host TZ
  const istMs = d.getTime() + (330 * 60 * 1000);
  const ist = new Date(istMs);
  const hh = String(ist.getUTCHours()).padStart(2, '0');
  const mm = String(ist.getUTCMinutes()).padStart(2, '0');
  return `${date} ${hh}:${mm} IST`;
}
