/**
 * @file        rate-contract-engine.ts
 * @sprint      T-Phase-1.2.6f-c-3 · Blocks E-G · per D-293
 * @purpose     Rate Contract CRUD + lookup helpers for PO creation.
 * @[JWT]       GET/POST /api/rate-contracts
 */
import {
  type RateContract, type RateContractLine, type RateContractStatus, rateContractKey,
} from '@/types/rate-contract';
import { generateDocNo } from './finecore-engine';

const now = (): string => new Date().toISOString();
const newId = (p: string): string =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function read(e: string): RateContract[] {
  try {
    // [JWT] GET /api/rate-contracts?entity=...
    const raw = localStorage.getItem(rateContractKey(e));
    return raw ? (JSON.parse(raw) as RateContract[]) : [];
  } catch { return []; }
}
function write(e: string, list: RateContract[]): void {
  try {
    // [JWT] POST /api/rate-contracts
    localStorage.setItem(rateContractKey(e), JSON.stringify(list));
  } catch { /* quota silent */ }
}

export const listRateContracts = (e: string): RateContract[] => read(e);

export const getRateContract = (id: string, e: string): RateContract | null =>
  read(e).find((r) => r.id === id) ?? null;

export function listActiveRateContracts(e: string): RateContract[] {
  const today = new Date().toISOString().slice(0, 10);
  return read(e).filter(
    (r) => r.status === 'active' && r.valid_from <= today && r.valid_to >= today,
  );
}

export interface CreateRateContractInput {
  entity_id: string;
  entity_code: string;
  vendor_id: string;
  vendor_name: string;
  valid_from: string;
  valid_to: string;
  payment_terms: string;
  delivery_terms: string;
  lines: Omit<RateContractLine, 'id'>[];
  notes: string;
  created_by: string;
}

export function createRateContract(input: CreateRateContractInput): RateContract {
  const list = read(input.entity_code);
  const lines: RateContractLine[] = input.lines.map((l) => ({ ...l, id: newId('rcl') }));
  const total_value = lines.reduce((s, l) => s + l.agreed_rate * l.max_qty, 0);
  const rec: RateContract = {
    id: newId('rc'),
    contract_no: generateDocNo('RC', input.entity_code),
    contract_date: now().slice(0, 10),
    entity_id: input.entity_id,
    vendor_id: input.vendor_id,
    vendor_name: input.vendor_name,
    valid_from: input.valid_from,
    valid_to: input.valid_to,
    currency: 'INR',
    payment_terms: input.payment_terms,
    delivery_terms: input.delivery_terms,
    lines,
    total_value,
    status: 'active',
    notes: input.notes,
    created_by: input.created_by,
    created_at: now(),
    updated_at: now(),
  };
  write(input.entity_code, [...list, rec]);
  return rec;
}

export function transitionRateContractStatus(
  id: string, status: RateContractStatus, e: string,
): RateContract | null {
  const list = read(e);
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const updated = { ...list[idx], status, updated_at: now() };
  list[idx] = updated;
  write(e, list);
  return updated;
}

/**
 * Lookup the agreed rate for a vendor+item active today.
 * Used by PO creation to auto-fill / enforce ceiling.
 */
export function findActiveRate(
  e: string, vendorId: string, itemId: string,
): { contract: RateContract; line: RateContractLine } | null {
  const today = new Date().toISOString().slice(0, 10);
  for (const c of read(e)) {
    if (c.status !== 'active') continue;
    if (c.vendor_id !== vendorId) continue;
    if (c.valid_from > today || c.valid_to < today) continue;
    const line = c.lines.find((l) => l.item_id === itemId);
    if (line) return { contract: c, line };
  }
  return null;
}

// ============================================================================
// Sprint T-Phase-1.2.6f-c-3-fix · Fix-B (D-296) + Fix-D (OOB-54 unification)
// ============================================================================

export type ComplianceStatus =
  | 'no_contract'
  | 'within_contract'
  | 'rate_exceeds_ceiling'
  | 'qty_outside_range'
  | 'contract_expired';

export interface ComplianceResult {
  has_contract: boolean;
  contract_id: string | null;
  contract_no: string | null;
  agreed_rate: number | null;
  ceiling_rate: number | null;
  variance_pct: number | null;
  compliance_status: ComplianceStatus;
  recommendation: string;
}

/**
 * Validate Bill Passing line against active Rate Contract · D-296.
 * 5 statuses adapted to current single-rate + ceiling model (D-293-rev).
 */
export function validateContractCompliance(
  invoiceLine: { item_id: string; invoice_qty: number; invoice_rate: number },
  vendorId: string,
  entityCode: string,
  asOfDate: string,
): ComplianceResult {
  const found = findActiveRate(entityCode, vendorId, invoiceLine.item_id);

  if (!found) {
    return {
      has_contract: false,
      contract_id: null, contract_no: null,
      agreed_rate: null, ceiling_rate: null,
      variance_pct: null,
      compliance_status: 'no_contract',
      recommendation: 'No active rate contract for this vendor-item. Consider creating one for pricing discipline.',
    };
  }

  const { contract, line } = found;
  const today = asOfDate.slice(0, 10);

  if (contract.status === 'expired' || contract.valid_to < today) {
    return {
      has_contract: true,
      contract_id: contract.id, contract_no: contract.contract_no,
      agreed_rate: line.agreed_rate, ceiling_rate: line.ceiling_rate,
      variance_pct: null,
      compliance_status: 'contract_expired',
      recommendation: `Contract ${contract.contract_no} expired on ${contract.valid_to}. Renew before further bills.`,
    };
  }

  if (invoiceLine.invoice_qty < line.min_qty || invoiceLine.invoice_qty > line.max_qty) {
    return {
      has_contract: true,
      contract_id: contract.id, contract_no: contract.contract_no,
      agreed_rate: line.agreed_rate, ceiling_rate: line.ceiling_rate,
      variance_pct: null,
      compliance_status: 'qty_outside_range',
      recommendation: `Invoice qty ${invoiceLine.invoice_qty} outside contract range [${line.min_qty}-${line.max_qty}]. Verify or amend.`,
    };
  }

  const variancePct = line.agreed_rate > 0
    ? ((invoiceLine.invoice_rate - line.agreed_rate) / line.agreed_rate) * 100
    : 0;
  const variancePctRounded = Math.round(variancePct * 100) / 100;

  if (invoiceLine.invoice_rate > line.ceiling_rate) {
    return {
      has_contract: true,
      contract_id: contract.id, contract_no: contract.contract_no,
      agreed_rate: line.agreed_rate, ceiling_rate: line.ceiling_rate,
      variance_pct: variancePctRounded,
      compliance_status: 'rate_exceeds_ceiling',
      recommendation: `Invoice rate ₹${invoiceLine.invoice_rate} exceeds ceiling ₹${line.ceiling_rate} (${variancePct.toFixed(2)}% above agreed ₹${line.agreed_rate}).`,
    };
  }

  return {
    has_contract: true,
    contract_id: contract.id, contract_no: contract.contract_no,
    agreed_rate: line.agreed_rate, ceiling_rate: line.ceiling_rate,
    variance_pct: variancePctRounded,
    compliance_status: 'within_contract',
    recommendation: variancePct === 0
      ? `Within contract ${contract.contract_no} at agreed rate.`
      : `Within contract ${contract.contract_no} (${variancePct >= 0 ? '+' : ''}${variancePct.toFixed(2)}% vs agreed · within ceiling).`,
  };
}

/**
 * List rate contracts expiring within `withinDays` · used by OOB-54 thin wrapper (Fix-D).
 */
export function listExpiringContracts(entityCode: string, withinDays: number = 30): RateContract[] {
  const today = Date.now();
  const limit = today + withinDays * 86400000;
  return listRateContracts(entityCode).filter((c) => {
    if (c.status !== 'active') return false;
    const expiry = new Date(c.valid_to).getTime();
    return expiry >= today && expiry <= limit;
  });
}
