/**
 * @file        src/types/buyer-reliability-score.ts
 * @purpose     Buyer Reliability Index · 0-100 score + 4-class + country risk overlay · Moat #18 FOUNDATION
 * @sprint      T-Phase-1.EX-7a-ExportPO-ForeignCustomer-DocPack
 * @decisions   EX-7a-Q7=a foundation only · feedback loop closes EX-7c e-BRC
 */

export type BuyerReliabilityClass = 'excellent' | 'good' | 'attention' | 'risk';

export const BUYER_RELIABILITY_THRESHOLDS: Record<BuyerReliabilityClass, { min: number; max: number; description: string }> = {
  excellent: { min: 90, max: 100, description: '90-100 · A-grade buyer · auto-approve large credit · expedite shipment' },
  good: { min: 70, max: 89, description: '70-89 · B-grade buyer · standard credit · normal workflow' },
  attention: { min: 50, max: 69, description: '50-69 · C-grade buyer · monitor closely · reduced credit · advance payment recommended' },
  risk: { min: 0, max: 49, description: '0-49 · D-grade buyer · LC required · senior approval mandatory · sanctions check' },
};

export type CountryRiskLevel = 'low' | 'medium' | 'high';

export interface BuyerReliabilityComponents {
  base_score: number;
  country_risk_delta: number;
  credit_utilization_delta: number;
  payment_history_delta: number;
  sanctions_check_delta: number;
  computed_score: number;
  classification: BuyerReliabilityClass;
  computed_at: string;
}

export const COUNTRY_RISK_TABLE: Record<string, CountryRiskLevel> = {
  US: 'low', GB: 'low', DE: 'low', FR: 'low', JP: 'low', SG: 'low', AU: 'low', CA: 'low', NL: 'low',
  AE: 'low', SA: 'medium', QA: 'low', KW: 'low', OM: 'low', BH: 'low',
  CN: 'medium', VN: 'medium', TH: 'medium', MY: 'low', ID: 'medium', PH: 'medium',
  RU: 'high', IR: 'high', KP: 'high', SY: 'high', VE: 'high', CU: 'high', SD: 'high',
};

export const buyerReliabilityKey = (entityCode: string): string =>
  `erp_${entityCode}_buyer_reliability_snapshots`;
