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
