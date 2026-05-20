/**
 * @file        src/lib/commercial-invoice-engine.ts
 * @purpose     CI CRUD + status transitions · 6-state workflow · entity-scoped FR-26
 * @sprint      T-Phase-1.EX-5-CommercialInvoice-6PartAllocation-CIFWaterfall
 * @decisions   EX-5-Q1=b sibling · 6-state workflow matching Tally voucher lifecycle
 */
import type { CommercialInvoice, CIStatus } from '@/types/commercial-invoice';
import { commercialInvoiceKey, CI_VALID_TRANSITIONS } from '@/types/commercial-invoice';
import { SINHA_COMMERCIAL_INVOICES } from '@/data/sinha-commercial-invoice-seed-data';

// [JWT] GET /api/eximx/commercial-invoices?entityCode=...
export function loadCIs(entityCode: string): CommercialInvoice[] {
  try {
    const raw = localStorage.getItem(commercialInvoiceKey(entityCode));
    if (!raw) {
      localStorage.setItem(commercialInvoiceKey(entityCode), JSON.stringify(SINHA_COMMERCIAL_INVOICES));
      return SINHA_COMMERCIAL_INVOICES;
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as CommercialInvoice[]) : SINHA_COMMERCIAL_INVOICES;
  } catch {
    return SINHA_COMMERCIAL_INVOICES;
  }
}

// [JWT] PUT /api/eximx/commercial-invoices?entityCode=...
export function saveCIs(entityCode: string, cis: CommercialInvoice[]): void {
  try {
    localStorage.setItem(commercialInvoiceKey(entityCode), JSON.stringify(cis));
  } catch {
    /* localStorage unavailable */
  }
}

export function getCI(entityCode: string, id: string): CommercialInvoice | null {
  return loadCIs(entityCode).find((c) => c.id === id) ?? null;
}

export function transitionCI(entityCode: string, ciId: string, newStatus: CIStatus): CommercialInvoice {
  const cis = loadCIs(entityCode);
  const ci = cis.find((c) => c.id === ciId);
  if (!ci) throw new Error(`CI not found: ${ciId}`);
  if (!CI_VALID_TRANSITIONS[ci.status].includes(newStatus)) {
    throw new Error(`Invalid CI transition: ${ci.status} → ${newStatus}`);
  }
  const updated = { ...ci, status: newStatus, updated_at: new Date().toISOString() };
  saveCIs(entityCode, cis.map((c) => (c.id === ciId ? updated : c)));
  return updated;
}

export function totalCIFAcrossLines(ci: CommercialInvoice): number {
  return ci.lines.reduce((s, l) => s + l.allocation.part_b.cif_total_inr, 0);
}

export function totalActualCIFAcrossLines(ci: CommercialInvoice): number {
  return ci.lines.reduce((s, l) => s + l.allocation.part_c.actual_cif_value_inr, 0);
}

export function totalLandedValueAcrossLines(ci: CommercialInvoice): number {
  return ci.lines.reduce((s, l) => s + l.allocation.part_d.total_landed_value_inr, 0);
}

export function filterCIsByStatus(cis: CommercialInvoice[], status: CIStatus): CommercialInvoice[] {
  return cis.filter((c) => c.status === status);
}

export function countCIsWithRevaluation(cis: CommercialInvoice[]): number {
  return cis.filter((c) => c.lines.some((l) => l.allocation.part_c.customs_revaluation_history.length > 0)).length;
}
