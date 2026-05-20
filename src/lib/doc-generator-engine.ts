/**
 * @file        src/lib/doc-generator-engine.ts
 * @purpose     Country-specific document rule resolver · UAE legalized · EU EUR.1 · ASEAN Form AI · CEPA · GSP
 * @sprint      T-Phase-1.EX-7a-ExportPO-ForeignCustomer-DocPack
 */
import type { CountryDocRule, PreShipmentDocPack, PreShipmentDocument } from '@/types/pre-shipment-doc-pack';
import { COUNTRY_DOC_RULE_DESCRIPTIONS, docPackKey } from '@/types/pre-shipment-doc-pack';

const COUNTRY_RULE_MAP: Record<string, CountryDocRule> = {
  AE: 'cepa_preferential',
  SA: 'uae_legalized', QA: 'uae_legalized', KW: 'uae_legalized', OM: 'uae_legalized', BH: 'uae_legalized',
  DE: 'eu_eur1', FR: 'eu_eur1', NL: 'eu_eur1', IT: 'eu_eur1', ES: 'eu_eur1',
  VN: 'asean_form_ai', TH: 'asean_form_ai', MY: 'asean_form_ai', ID: 'asean_form_ai', PH: 'asean_form_ai', SG: 'asean_form_ai',
  JP: 'asean_form_ai',
  US: 'gsp_form_a', CA: 'gsp_form_a', AU: 'gsp_form_a',
};

export function resolveCountryDocRule(countryCode: string): CountryDocRule {
  return COUNTRY_RULE_MAP[countryCode] ?? 'standard';
}

export function generateDocPack(exportPoId: string, entityId: string, countryCode: string): PreShipmentDocPack {
  const rule = resolveCountryDocRule(countryCode);
  const isLegalized = rule === 'uae_legalized' || rule === 'cepa_preferential';
  const generated_at = new Date().toISOString();
  const stamp = Date.now();

  const documents: PreShipmentDocument[] = [
    { id: `doc-ci-${stamp}`, kind: 'commercial_invoice_export', doc_number: `CIE-${stamp}`, generated_at, payload_summary: 'Commercial Invoice (export) · FOB value + Incoterm + buyer details', country_rule_applied: rule, is_legalized_required: isLegalized, legalization_status: isLegalized ? 'pending' : 'not_required', notes: '' },
    { id: `doc-pl-${stamp}`, kind: 'packing_list', doc_number: `PL-${stamp}`, generated_at, payload_summary: 'Packing List · case count + gross/net weight + dimensions', country_rule_applied: rule, is_legalized_required: false, legalization_status: 'not_required', notes: '' },
    { id: `doc-coo-${stamp}`, kind: 'certificate_of_origin', doc_number: `CoO-${stamp}`, generated_at, payload_summary: `Certificate of Origin · ${COUNTRY_DOC_RULE_DESCRIPTIONS[rule]}`, country_rule_applied: rule, is_legalized_required: isLegalized, legalization_status: isLegalized ? 'pending' : 'not_required', notes: '' },
    { id: `doc-ins-${stamp}`, kind: 'insurance_certificate', doc_number: `INS-${stamp}`, generated_at, payload_summary: 'Insurance Certificate placeholder · finalized with EX-7b Shipping Bill', country_rule_applied: rule, is_legalized_required: false, legalization_status: 'not_required', notes: '' },
  ];
  const legalization_cost = isLegalized ? 4000 : 0;
  return {
    id: `dp-${stamp}`, related_export_po_id: exportPoId, entity_id: entityId,
    country_rule: rule, documents, generated_at,
    total_legalization_cost_inr: legalization_cost,
    notes: `Doc pack generated for ${countryCode} · rule: ${rule}`,
  };
}

export function saveDocPack(entityCode: string, pack: PreShipmentDocPack): void {
  try {
    const raw = localStorage.getItem(docPackKey(entityCode));
    const all = raw ? (JSON.parse(raw) as PreShipmentDocPack[]) : [];
    localStorage.setItem(docPackKey(entityCode), JSON.stringify([...all, pack]));
  } catch { /* ignore */ }
}
