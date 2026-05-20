/**
 * @file        src/types/pre-shipment-doc-pack.ts
 * @purpose     4-document Pre-shipment Doc Pack · country-specific rules · Moat #10 CoO Embassy seed
 * @sprint      T-Phase-1.EX-7a-ExportPO-ForeignCustomer-DocPack
 * @decisions   EX-7a-Q6=b 4 documents · country-specific
 */

export type DocPackKind =
  | 'commercial_invoice_export'
  | 'packing_list'
  | 'certificate_of_origin'
  | 'insurance_certificate';

export type CountryDocRule =
  | 'standard'
  | 'uae_legalized'
  | 'eu_eur1'
  | 'asean_form_ai'
  | 'cepa_preferential'
  | 'gsp_form_a';

export const COUNTRY_DOC_RULE_DESCRIPTIONS: Record<CountryDocRule, string> = {
  standard: 'Plain CoO · most destinations · standard chamber-attested',
  uae_legalized: 'UAE/GCC · Embassy of UAE legalization required · ~₹3,000-5,000 per consignment',
  eu_eur1: 'EU · EUR.1 movement certificate · proves originating products under preferential agreement',
  asean_form_ai: 'ASEAN-10 · Form AI · India-ASEAN FTA preferential rate',
  cepa_preferential: 'UAE-CEPA · India-UAE Comprehensive Economic Partnership Agreement',
  gsp_form_a: 'GSP beneficiary · Form A · USA/Japan/Canada/EU/Australia/NZ',
};

export interface PreShipmentDocument {
  id: string;
  kind: DocPackKind;
  doc_number: string;
  generated_at: string;
  payload_summary: string;
  country_rule_applied: CountryDocRule;
  is_legalized_required: boolean;
  legalization_status: 'not_required' | 'pending' | 'submitted' | 'legalized';
  notes: string;
}

export interface PreShipmentDocPack {
  id: string;
  related_export_po_id: string;
  entity_id: string;
  country_rule: CountryDocRule;
  documents: PreShipmentDocument[];
  generated_at: string;
  total_legalization_cost_inr: number;
  notes: string;
}

export const docPackKey = (entityCode: string): string =>
  `erp_${entityCode}_pre_shipment_doc_packs`;
