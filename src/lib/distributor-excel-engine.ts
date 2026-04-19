/**
 * distributor-excel-engine.ts — Convert distributors / price lists / orders
 * to flat row format for Excel export, and parse on import.
 * Pure transforms: caller handles file IO.
 */

import type { Distributor, DistributorTier, DistributorStatus } from '@/types/distributor';

export type ExcelScope = 'distributors' | 'price-lists' | 'orders';

export type ExcelRow = Record<string, string | number | boolean | null>;

export const DISTRIBUTOR_COLUMNS = [
  'partner_code', 'legal_name', 'tier', 'gstin',
  'contact_mobile', 'contact_email',
  'full_address',
  'credit_limit_paise', 'outstanding_paise', 'status',
] as const;

export function distributorsToRows(list: Distributor[]): ExcelRow[] {
  return list.map(d => ({
    partner_code:       d.partner_code ?? '',
    legal_name:         d.legal_name ?? '',
    tier:               d.tier ?? '',
    gstin:              d.gstin ?? '',
    contact_mobile:     d.contact_mobile ?? '',
    contact_email:      d.contact_email ?? '',
    full_address:       d.full_address ?? '',
    credit_limit_paise: Number(d.credit_limit_paise ?? 0),
    outstanding_paise:  Number(d.outstanding_paise ?? 0),
    status:             d.status ?? 'active',
  }));
}

export interface ImportResult<T> {
  added: T[];
  updated: T[];
  skipped: { row: ExcelRow; reason: string }[];
}

const VALID_TIERS: DistributorTier[]     = ['gold', 'silver', 'bronze'];
const VALID_STATUS: DistributorStatus[]  = ['active', 'suspended', 'pending_kyc'];

function coerceTier(v: unknown, fallback: DistributorTier): DistributorTier {
  const s = String(v ?? '').toLowerCase().trim();
  return (VALID_TIERS as string[]).includes(s) ? (s as DistributorTier) : fallback;
}
function coerceStatus(v: unknown, fallback: DistributorStatus): DistributorStatus {
  const s = String(v ?? '').toLowerCase().trim();
  return (VALID_STATUS as string[]).includes(s) ? (s as DistributorStatus) : fallback;
}

/** Validate + merge. Rows with existing partner_code update; new ones insert. */
export function mergeDistributorRows(
  incoming: ExcelRow[], existing: Distributor[],
): ImportResult<Distributor> {
  const byCode = new Map(existing.map(d => [d.partner_code, d]));
  const added: Distributor[] = [];
  const updated: Distributor[] = [];
  const skipped: ImportResult<Distributor>['skipped'] = [];

  for (const row of incoming) {
    const code = String(row.partner_code ?? '').trim();
    if (!code) {
      skipped.push({ row, reason: 'missing partner_code' });
      continue;
    }
    const current = byCode.get(code);
    const now = new Date().toISOString();
    if (current) {
      updated.push({
        ...current,
        legal_name:         String(row.legal_name ?? current.legal_name),
        tier:               coerceTier(row.tier, current.tier),
        gstin:              String(row.gstin ?? current.gstin ?? '') || null,
        contact_mobile:     String(row.contact_mobile ?? current.contact_mobile ?? ''),
        contact_email:      String(row.contact_email ?? current.contact_email ?? ''),
        full_address:       String(row.full_address ?? current.full_address ?? ''),
        credit_limit_paise: Number(row.credit_limit_paise ?? current.credit_limit_paise),
        outstanding_paise:  Number(row.outstanding_paise ?? current.outstanding_paise),
        status:             coerceStatus(row.status, current.status),
        updated_at:         now,
      });
    } else {
      added.push({
        id: `d-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        customer_id: '',
        partner_code: code,
        legal_name: String(row.legal_name ?? ''),
        tier: coerceTier(row.tier, 'bronze'),
        price_list_id: null,
        territory_id: null,
        credit_limit_paise: Number(row.credit_limit_paise ?? 0),
        outstanding_paise:  Number(row.outstanding_paise ?? 0),
        overdue_paise: 0,
        monthly_target_paise: 0,
        monthly_achieved_paise: 0,
        status: coerceStatus(row.status, 'active'),
        contact_email: String(row.contact_email ?? ''),
        contact_mobile: String(row.contact_mobile ?? ''),
        gstin: String(row.gstin ?? '') || null,
        state_code: null,
        full_address: String(row.full_address ?? ''),
        is_distributor: true,
        created_at: now,
        updated_at: now,
      });
    }
  }

  return { added, updated, skipped };
}
