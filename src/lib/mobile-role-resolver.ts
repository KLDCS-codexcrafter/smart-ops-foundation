/**
 * mobile-role-resolver.ts — Given a credential, resolve user role from masters.
 * Admin-panel-first model: user must already exist in Distributor or Customer Master,
 * placed there by tenant sales/admin. NO self-signup.
 *
 * Resolution order:
 *   1. Check Distributor Master (contact_mobile / contact_email / partner_code).
 *   2. If not found, check Customer Master (mobile / email).
 *   3. If neither, return 'unknown' — UI shows 'Contact sales representative'.
 */

import type { Distributor } from '@/types/distributor';
import type { PlanTier } from '@/types/card-entitlement';
import type { SAMPerson } from '@/types/sam-person';

export type ResolvedRole =
  | 'salesman'
  | 'telecaller'
  | 'supervisor'
  | 'sales_manager'
  | 'distributor'
  | 'customer'
  | 'unknown';

export interface CustomerLite {
  id: string;
  name: string;
  mobile?: string;
  email?: string;
  active?: boolean;
}

export interface ResolvedIdentity {
  role: ResolvedRole;
  user_id: string | null;
  display_name: string;
  entity_code: string;
  plan_tier: PlanTier;
  distributor?: Distributor;
  customer?: CustomerLite;
  salesperson?: SAMPerson;
  failure_reason?: string;
}

/** Match distributor by mobile OR email OR partner_code (admin-assigned). */
export function resolveFromDistributors(
  credential: string,
  distributors: Distributor[],
): Distributor | null {
  const c = credential.trim().toLowerCase();
  if (!c) return null;
  return (
    distributors.find(
      (d) =>
        (d.contact_mobile ?? '').toLowerCase() === c ||
        (d.contact_email ?? '').toLowerCase() === c ||
        (d.partner_code ?? '').toLowerCase() === c,
    ) ?? null
  );
}

/** Match customer by mobile OR email (admin-created). */
export function resolveFromCustomers(
  credential: string,
  customers: CustomerLite[],
): CustomerLite | null {
  const c = credential.trim().toLowerCase();
  if (!c) return null;
  return (
    customers.find(
      (cu) =>
        cu.active !== false &&
        ((cu.mobile ?? '').toLowerCase() === c || (cu.email ?? '').toLowerCase() === c),
    ) ?? null
  );
}

/** Match SAMPerson by person_code OR phone OR email. */
export function resolveFromSAMPersons(
  credential: string,
  persons: SAMPerson[],
): SAMPerson | null {
  const c = credential.trim().toLowerCase();
  if (!c) return null;
  return (
    persons.find(
      (p) =>
        (p.person_code ?? '').toLowerCase() === c ||
        (p.phone ?? '').toLowerCase() === c ||
        (p.email ?? '').toLowerCase() === c,
    ) ?? null
  );
}

/** Map a person_code prefix to a mobile role. */
export function roleFromPersonCode(personCode: string): ResolvedRole {
  const upper = personCode.toUpperCase();
  if (upper.startsWith('SM-')) return 'salesman';
  if (upper.startsWith('AG-')) return 'salesman';
  if (upper.startsWith('BR-')) return 'salesman';
  if (upper.startsWith('TC-')) return 'telecaller';
  if (upper.startsWith('SUP-')) return 'supervisor';
  if (upper.startsWith('MGR-')) return 'sales_manager';
  return 'unknown';
}

/** Full resolution — returns role + identity data. */
export function resolveIdentity(
  credential: string,
  password: string,
  distributors: Distributor[],
  customers: CustomerLite[],
  persons: SAMPerson[],
  entityCode: string,
  planTier: PlanTier = 'starter',
): ResolvedIdentity {
  void password;

  const dist = resolveFromDistributors(credential, distributors);
  if (dist) {
    return {
      role: 'distributor',
      user_id: dist.id,
      display_name: dist.legal_name ?? 'Distributor',
      entity_code: entityCode,
      plan_tier: planTier,
      distributor: dist,
    };
  }

  const cust = resolveFromCustomers(credential, customers);
  if (cust) {
    return {
      role: 'customer',
      user_id: cust.id,
      display_name: cust.name,
      entity_code: entityCode,
      plan_tier: planTier,
      customer: cust,
    };
  }

  const sp = resolveFromSAMPersons(credential, persons);
  if (sp) {
    const role = roleFromPersonCode(sp.person_code);
    if (role !== 'unknown') {
      return {
        role,
        user_id: sp.id,
        display_name: sp.display_name,
        entity_code: entityCode,
        plan_tier: planTier,
        salesperson: sp,
      };
    }
  }

  return {
    role: 'unknown',
    user_id: null,
    display_name: '',
    entity_code: entityCode,
    plan_tier: planTier,
    failure_reason:
      'Account not found. Contact your sales representative to set up your account.',
  };
}

