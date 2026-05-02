/**
 * party-master-engine · Sprint T-Phase-2.7-e · OOB-9
 *
 * Centralized party master CRUD + Quick-Add support. Pure functions · no React.
 * Maintains backward-compat with existing legacy storage keys (writes BOTH new
 * canonical key AND legacy key on save · so existing inline loadCustomers /
 * loadVendors in 12+ forms continue to work).
 *
 * [JWT] Phase 2: replaces with /api/masters/parties endpoints.
 */
import {
  type Party,
  type PartyType,
  partyMasterKey,
  LEGACY_CUSTOMER_KEY,
  LEGACY_VENDOR_KEY,
} from '@/types/party';
import { validateGSTIN } from '@/lib/gstin-validator';
import { STATE_CODE_NAMES } from '@/lib/place-of-supply-engine';

export interface UpsertPartyInput {
  entity_id: string;
  party_name: string;
  party_type: PartyType;
  gstin?: string | null;
  state_code?: string | null;
  created_via_quick_add?: boolean;
  created_by?: string;
}

export interface UpsertPartyResult {
  party: Party;
  isNew: boolean;
  warnings: string[];
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota errors swallowed — engine remains pure */
  }
}

/** Load the full party master from canonical storage. */
export function loadPartyMaster(entityCode: string): Party[] {
  if (!entityCode) return [];
  // [JWT] GET /api/masters/parties?entity={entityCode}
  return readJSON<Party[]>(partyMasterKey(entityCode), []);
}

/** Read parties filtered by type. Used by voucher pickers. */
export function loadPartiesByType(
  entityCode: string,
  type: PartyType | 'any',
): Party[] {
  const all = loadPartyMaster(entityCode);
  if (type === 'any') return all;
  return all.filter((p) => p.party_type === type || p.party_type === 'both');
}

/** Generate next party_code · CUST/0001 · VEND/0001 · BOTH/0001 · entity-scoped. */
export function generatePartyCode(entityCode: string, type: PartyType): string {
  const all = loadPartyMaster(entityCode);
  const prefix = type === 'customer' ? 'CUST' : type === 'vendor' ? 'VEND' : 'BOTH';
  const peers = all.filter((p) => p.party_code?.startsWith(`${prefix}/`));
  let max = 0;
  for (const p of peers) {
    const n = parseInt(p.party_code.split('/')[1] ?? '0', 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}/${String(max + 1).padStart(4, '0')}`;
}

/** Find by name · case-insensitive exact match · for duplicate detection. */
export function findPartyByName(entityCode: string, name: string): Party | null {
  const target = (name ?? '').trim().toLowerCase();
  if (!target) return null;
  const all = loadPartyMaster(entityCode);
  return all.find((p) => p.party_name.trim().toLowerCase() === target) ?? null;
}

/** Q2-c: create OR update party with audit flag. */
export function upsertParty(input: UpsertPartyInput): UpsertPartyResult {
  const warnings: string[] = [];
  const entityCode = input.entity_id;
  const now = new Date().toISOString();

  // GSTIN validation (non-blocking warning)
  let gstin: string | null = (input.gstin ?? '').trim().toUpperCase() || null;
  if (gstin) {
    const r = validateGSTIN(gstin);
    if (!r.valid) {
      warnings.push(`GSTIN format invalid: ${r.reason ?? 'unknown'}`);
    }
  }

  let stateCode: string | null = (input.state_code ?? '').trim() || null;
  if (stateCode) {
    stateCode = stateCode.padStart(2, '0');
    if (!STATE_CODE_NAMES[stateCode]) {
      warnings.push(`State code '${stateCode}' is not a recognised Indian state.`);
    }
  }

  const existing = findPartyByName(entityCode, input.party_name);
  if (existing) {
    warnings.push(`A party named '${input.party_name}' already exists.`);
  }

  const all = loadPartyMaster(entityCode);
  let party: Party;
  let isNew = true;

  if (existing) {
    party = {
      ...existing,
      party_type: input.party_type,
      gstin: gstin ?? existing.gstin,
      state_code: stateCode ?? existing.state_code,
      updated_at: now,
    };
    const idx = all.findIndex((p) => p.id === existing.id);
    if (idx >= 0) all[idx] = party;
    isNew = false;
  } else {
    party = {
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `pty_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      entity_id: entityCode,
      party_code: generatePartyCode(entityCode, input.party_type),
      party_name: input.party_name.trim(),
      party_type: input.party_type,
      gstin,
      state_code: stateCode,
      created_via_quick_add: input.created_via_quick_add === true,
      audit_flag_resolved_at: null,
      created_at: now,
      updated_at: now,
      created_by: input.created_by ?? 'unknown-user',
    };
    all.push(party);
  }

  // [JWT] POST /api/masters/parties
  writeJSON(partyMasterKey(entityCode), all);

  // Sync to legacy keys for backward compat with inline loaders in 12+ forms
  syncLegacyKey(entityCode, party.party_type);
  if (party.party_type === 'both') {
    syncLegacyKey(entityCode, 'customer');
    syncLegacyKey(entityCode, 'vendor');
  }

  return { party, isNew, warnings };
}

/** Sync legacy key from canonical · ensures inline loaders see new entries. Idempotent. */
export function syncLegacyKey(entityCode: string, type: PartyType): void {
  const all = loadPartyMaster(entityCode);
  if (type === 'customer' || type === 'both') {
    const customers = all
      .filter((p) => p.party_type === 'customer' || p.party_type === 'both')
      .map((p) => ({ id: p.id, partyName: p.party_name }));
    // Merge with existing legacy entries to preserve any that pre-existed
    const existing = readJSON<Array<{ id: string; partyName?: string }>>(LEGACY_CUSTOMER_KEY, []);
    const seen = new Set(customers.map((c) => c.id));
    const merged = [...customers, ...existing.filter((e) => !seen.has(e.id))];
    writeJSON(LEGACY_CUSTOMER_KEY, merged);
  }
  if (type === 'vendor' || type === 'both') {
    const vendors = all
      .filter((p) => p.party_type === 'vendor' || p.party_type === 'both')
      .map((p) => ({ id: p.id, name: p.party_name, vendor_name: p.party_name }));
    const existing = readJSON<Array<{ id: string; name?: string; vendor_name?: string }>>(
      LEGACY_VENDOR_KEY,
      [],
    );
    const seen = new Set(vendors.map((v) => v.id));
    const merged = [...vendors, ...existing.filter((e) => !seen.has(e.id))];
    writeJSON(LEGACY_VENDOR_KEY, merged);
  }
}

/** List parties created via Quick-Add since a date · for finance audit. */
export function listQuickAddCreations(entityCode: string, sinceISO?: string): Party[] {
  const all = loadPartyMaster(entityCode);
  const since = sinceISO ? Date.parse(sinceISO) : 0;
  return all.filter(
    (p) =>
      p.created_via_quick_add &&
      !p.audit_flag_resolved_at &&
      (!since || Date.parse(p.created_at) >= since),
  );
}
