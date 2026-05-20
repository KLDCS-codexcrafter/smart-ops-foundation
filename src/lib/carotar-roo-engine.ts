/**
 * @file        src/lib/carotar-roo-engine.ts
 * @purpose     CAROTAR FULL · Moat #11 PRIMARY · Rules of Origin verification matrix · v7 Gap #11
 * @sprint      T-Phase-1.EX-9-Compliance-Suite
 * @decisions   EX-9-Q2=a · supplier declaration register + 30-day tracker
 */
import type { SupplierDeclaration, SupplierDeclarationStatus, RoOClassification } from '@/types/supplier-declaration';
import { supplierDeclarationKey, SD_VALID_TRANSITIONS } from '@/types/supplier-declaration';

const SEED_SUPPLIER_DECLARATIONS: SupplierDeclaration[] = [
  { id: 'sd-001', declaration_no: 'SD-SINHA-2026-001', entity_id: 'sinha-steel', status: 'accepted', related_foreign_vendor_id: 'fv-sinha-001', related_cth: '7208', origin_country_code: 'CN', roo_classification: 'cth_change', value_add_percentage: null, cth_change_basis: 'CTH 7203 raw → 7208 hot rolled', specific_process_description: null, fta_treaty_code: 'India-China-NOT-FTA', customs_query_text: null, customs_response_deadline: null, declaration_date: '2026-05-01', submitted_to_customs_at: '2026-05-02T00:00:00.000Z', notes: 'CTH change basis · accepted on first review', created_at: '2026-05-01T00:00:00.000Z', updated_at: '2026-05-03T00:00:00.000Z' },
  { id: 'sd-002', declaration_no: 'SD-SINHA-2026-002', entity_id: 'sinha-steel', status: 'queried', related_foreign_vendor_id: 'fv-sinha-002', related_cth: '8542', origin_country_code: 'TH', roo_classification: 'value_add', value_add_percentage: 42, cth_change_basis: null, specific_process_description: null, fta_treaty_code: 'India-Thailand-CEPA', customs_query_text: 'Provide breakup of value-add components', customs_response_deadline: '2026-06-10', declaration_date: '2026-05-05', submitted_to_customs_at: '2026-05-06T00:00:00.000Z', notes: 'CEPA preference · 42% value-add under query · 30-day response window active', created_at: '2026-05-05T00:00:00.000Z', updated_at: '2026-05-11T00:00:00.000Z' },
  { id: 'sd-003', declaration_no: 'SD-SINHA-2026-003', entity_id: 'sinha-steel', status: 'submitted_to_customs', related_foreign_vendor_id: 'fv-sinha-003', related_cth: '8517', origin_country_code: 'SG', roo_classification: 'cth_change', value_add_percentage: null, cth_change_basis: 'CTH 8501 components → 8517 finished routers', specific_process_description: null, fta_treaty_code: 'India-ASEAN-FTA', customs_query_text: null, customs_response_deadline: null, declaration_date: '2026-05-12', submitted_to_customs_at: '2026-05-13T00:00:00.000Z', notes: 'ASEAN-FTA preference · awaiting customs response', created_at: '2026-05-12T00:00:00.000Z', updated_at: '2026-05-13T00:00:00.000Z' },
];

export function loadSupplierDeclarations(entityCode: string): SupplierDeclaration[] {
  try {
    const raw = localStorage.getItem(supplierDeclarationKey(entityCode));
    if (!raw) {
      localStorage.setItem(supplierDeclarationKey(entityCode), JSON.stringify(SEED_SUPPLIER_DECLARATIONS));
      return SEED_SUPPLIER_DECLARATIONS;
    }
    return JSON.parse(raw) as SupplierDeclaration[];
  } catch { return SEED_SUPPLIER_DECLARATIONS; }
}

export function saveSupplierDeclarations(entityCode: string, list: SupplierDeclaration[]): void {
  localStorage.setItem(supplierDeclarationKey(entityCode), JSON.stringify(list));
}

export function classifyRoO(
  cthChanged: boolean,
  valueAddPct: number | null,
  hasSpecificProcess: boolean,
): RoOClassification {
  if (cthChanged) return 'cth_change';
  if (hasSpecificProcess) return 'specific_process';
  if (valueAddPct !== null && valueAddPct >= 35) return 'value_add';
  return 'not_originating';
}

export function transitionSupplierDeclaration(entityCode: string, id: string, next: SupplierDeclarationStatus): SupplierDeclaration {
  const list = loadSupplierDeclarations(entityCode);
  const sd = list.find((x) => x.id === id);
  if (!sd) throw new Error(`SupplierDeclaration not found: ${id}`);
  if (!SD_VALID_TRANSITIONS[sd.status].includes(next)) {
    throw new Error(`Invalid SD transition: ${sd.status} → ${next}`);
  }
  const updated: SupplierDeclaration = { ...sd, status: next, updated_at: new Date().toISOString() };
  if (next === 'submitted_to_customs') {
    updated.submitted_to_customs_at = new Date().toISOString();
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30);
    updated.customs_response_deadline = deadline.toISOString().slice(0, 10);
  }
  saveSupplierDeclarations(entityCode, list.map((x) => (x.id === id ? updated : x)));
  return updated;
}

export function summarizeSupplierDeclarations(list: SupplierDeclaration[]): {
  total: number;
  by_status: Record<SupplierDeclarationStatus, number>;
  pending_customs_response: number;
} {
  const empty: Record<SupplierDeclarationStatus, number> = {
    draft: 0, submitted_by_supplier: 0, verified_by_importer: 0,
    submitted_to_customs: 0, queried: 0, accepted: 0, rejected: 0,
  };
  const s = { total: list.length, by_status: empty, pending_customs_response: 0 };
  for (const sd of list) {
    s.by_status[sd.status] = (s.by_status[sd.status] ?? 0) + 1;
    if (sd.status === 'submitted_to_customs' || sd.status === 'queried') s.pending_customs_response += 1;
  }
  return s;
}
