/**
 * compliance-seed-data.ts — Seed arrays for Zone 3 Accounting Masters
 * GST_RATES (24), TDS_SECTIONS (30), TCS_SECTIONS (11)
 */

export interface GSTRate {
  code: string;
  name: string;
  rate: number;
  countryCode: string; // 'IN' | 'AE' | 'SG' | 'GB'
  taxType: 'gst' | 'vat' | 'corporate_tax' | 'cess';
  applicableTo: 'goods' | 'services' | 'both';
  category: string;
  cessRate?: number;
  effectiveFrom: string; // 'YYYY-MM-DD'
  notes: string;
  status: 'active' | 'inactive';
}

export const GST_RATES: GSTRate[] = [
  { code: 'GST_0', name: 'Exempt/Nil Rated', rate: 0, countryCode: 'IN', taxType: 'gst', applicableTo: 'both', category: 'essential', effectiveFrom: '2017-07-01', notes: '', status: 'active' },
  { code: 'GST_0.25', name: 'GST 0.25%', rate: 0.25, countryCode: 'IN', taxType: 'gst', applicableTo: 'goods', category: 'precious_stones', effectiveFrom: '2017-07-01', notes: 'rough diamonds, cut stones', status: 'active' },
  { code: 'GST_1.5', name: 'GST 1.5%', rate: 1.5, countryCode: 'IN', taxType: 'gst', applicableTo: 'goods', category: 'job_work', effectiveFrom: '2017-07-01', notes: 'job work on textiles/diamonds', status: 'active' },
  { code: 'GST_3', name: 'GST 3%', rate: 3, countryCode: 'IN', taxType: 'gst', applicableTo: 'goods', category: 'gold', effectiveFrom: '2017-07-01', notes: 'gold, silver, platinum, jewellery', status: 'active' },
  { code: 'GST_5', name: 'GST 5%', rate: 5, countryCode: 'IN', taxType: 'gst', applicableTo: 'both', category: 'essential', effectiveFrom: '2017-07-01', notes: 'essential goods and services', status: 'active' },
  { code: 'GST_12', name: 'GST 12%', rate: 12, countryCode: 'IN', taxType: 'gst', applicableTo: 'both', category: 'standard_low', effectiveFrom: '2017-07-01', notes: 'standard rate lower slab', status: 'active' },
  { code: 'GST_18', name: 'GST 18%', rate: 18, countryCode: 'IN', taxType: 'gst', applicableTo: 'both', category: 'standard', effectiveFrom: '2017-07-01', notes: 'most common rate', status: 'active' },
  { code: 'GST_28', name: 'GST 28%', rate: 28, countryCode: 'IN', taxType: 'gst', applicableTo: 'both', category: 'luxury', effectiveFrom: '2017-07-01', notes: 'luxury, sin goods, automobiles', status: 'active' },
  { code: 'CESS_TOBACCO', name: 'Compensation Cess Tobacco', rate: 28, countryCode: 'IN', taxType: 'cess', applicableTo: 'goods', category: 'cess', cessRate: 65, effectiveFrom: '2017-07-01', notes: '', status: 'active' },
  { code: 'CESS_PAN_MASALA', name: 'Compensation Cess Pan Masala', rate: 28, countryCode: 'IN', taxType: 'cess', applicableTo: 'goods', category: 'cess', cessRate: 60, effectiveFrom: '2017-07-01', notes: '', status: 'active' },
  { code: 'CESS_AERATED', name: 'Compensation Cess Aerated Beverages', rate: 28, countryCode: 'IN', taxType: 'cess', applicableTo: 'goods', category: 'cess', cessRate: 12, effectiveFrom: '2017-07-01', notes: '', status: 'active' },
  { code: 'CESS_MV_SMALL', name: 'Cess Small Cars', rate: 28, countryCode: 'IN', taxType: 'cess', applicableTo: 'goods', category: 'cess', cessRate: 1, effectiveFrom: '2017-07-01', notes: '<1200cc petrol/<1500cc diesel', status: 'active' },
  { code: 'CESS_MV_MID', name: 'Cess Mid Cars', rate: 28, countryCode: 'IN', taxType: 'cess', applicableTo: 'goods', category: 'cess', cessRate: 3, effectiveFrom: '2017-07-01', notes: '', status: 'active' },
  { code: 'CESS_MV_LARGE', name: 'Cess Large Cars', rate: 28, countryCode: 'IN', taxType: 'cess', applicableTo: 'goods', category: 'cess', cessRate: 15, effectiveFrom: '2017-07-01', notes: '>1500cc', status: 'active' },
  { code: 'CESS_MV_SUV', name: 'Cess SUVs', rate: 28, countryCode: 'IN', taxType: 'cess', applicableTo: 'goods', category: 'cess', cessRate: 22, effectiveFrom: '2017-07-01', notes: '', status: 'active' },
  { code: 'UAE_VAT_STD', name: 'UAE VAT 5%', rate: 5, countryCode: 'AE', taxType: 'vat', applicableTo: 'both', category: 'standard', effectiveFrom: '2018-01-01', notes: 'standard rate from 2018', status: 'active' },
  { code: 'UAE_VAT_ZERO', name: 'UAE VAT Zero-Rated', rate: 0, countryCode: 'AE', taxType: 'vat', applicableTo: 'both', category: 'zero_rated', effectiveFrom: '2018-01-01', notes: 'exports, international', status: 'active' },
  { code: 'UAE_CT_0', name: 'UAE Corporate Tax 0%', rate: 0, countryCode: 'AE', taxType: 'corporate_tax', applicableTo: 'both', category: 'corporate', effectiveFrom: '2023-06-01', notes: 'income up to AED 375,000', status: 'active' },
  { code: 'UAE_CT_9', name: 'UAE Corporate Tax 9%', rate: 9, countryCode: 'AE', taxType: 'corporate_tax', applicableTo: 'both', category: 'corporate', effectiveFrom: '2023-06-01', notes: 'income above AED 375,000', status: 'active' },
  { code: 'SG_GST', name: 'Singapore GST 9%', rate: 9, countryCode: 'SG', taxType: 'gst', applicableTo: 'both', category: 'standard', effectiveFrom: '2024-01-01', notes: 'increased from 8% Jan 2024', status: 'active' },
  { code: 'SG_GST_ZERO', name: 'Singapore GST Zero-Rated', rate: 0, countryCode: 'SG', taxType: 'gst', applicableTo: 'both', category: 'zero_rated', effectiveFrom: '2024-01-01', notes: 'exports, international', status: 'active' },
  { code: 'UK_VAT_STD', name: 'UK VAT 20%', rate: 20, countryCode: 'GB', taxType: 'vat', applicableTo: 'both', category: 'standard', effectiveFrom: '2011-01-04', notes: 'standard rate', status: 'active' },
  { code: 'UK_VAT_RED', name: 'UK VAT 5%', rate: 5, countryCode: 'GB', taxType: 'vat', applicableTo: 'both', category: 'reduced', effectiveFrom: '2011-01-04', notes: 'home energy, child seats', status: 'active' },
  { code: 'UK_VAT_ZERO', name: 'UK VAT Zero-Rated', rate: 0, countryCode: 'GB', taxType: 'vat', applicableTo: 'both', category: 'zero_rated', effectiveFrom: '2011-01-04', notes: 'food, books, children\'s clothing', status: 'active' },
];

export interface TDSSection {
  sectionCode: string;
  sectionName: string;
  natureOfPayment: string;
  rateIndividual: number;
  rateCompany: number;
  rateNoPAN: number;
  thresholdPerTransaction: number | null;
  thresholdAggregateAnnual: number | null;
  lowerDeductionEligible: boolean;
  section206ABApplicable: boolean;
  notes: string;
  status: 'active' | 'inactive';
}

export const TDS_SECTIONS: TDSSection[] = [
  { sectionCode: '192', sectionName: 'Salary', natureOfPayment: 'Salary', rateIndividual: 0, rateCompany: 0, rateNoPAN: 20, thresholdPerTransaction: null, thresholdAggregateAnnual: 250000, lowerDeductionEligible: false, section206ABApplicable: false, notes: 'As per income tax slab', status: 'active' },
  { sectionCode: '193', sectionName: 'Interest on Securities', natureOfPayment: 'Interest on securities', rateIndividual: 10, rateCompany: 10, rateNoPAN: 20, thresholdPerTransaction: null, thresholdAggregateAnnual: 10000, lowerDeductionEligible: true, section206ABApplicable: true, notes: '', status: 'active' },
  { sectionCode: '194', sectionName: 'Dividends', natureOfPayment: 'Dividends', rateIndividual: 10, rateCompany: 10, rateNoPAN: 20, thresholdPerTransaction: null, thresholdAggregateAnnual: 5000, lowerDeductionEligible: true, section206ABApplicable: true, notes: '', status: 'active' },
  { sectionCode: '194A', sectionName: 'Interest other than securities', natureOfPayment: 'Interest other than on securities', rateIndividual: 10, rateCompany: 10, rateNoPAN: 20, thresholdPerTransaction: null, thresholdAggregateAnnual: 40000, lowerDeductionEligible: true, section206ABApplicable: true, notes: 'Rs 50,000 for senior citizens', status: 'active' },
  { sectionCode: '194B', sectionName: 'Lottery Winnings', natureOfPayment: 'Winnings from lottery, crossword puzzle', rateIndividual: 30, rateCompany: 30, rateNoPAN: 30, thresholdPerTransaction: 10000, thresholdAggregateAnnual: null, lowerDeductionEligible: false, section206ABApplicable: true, notes: '', status: 'active' },
  { sectionCode: '194BB', sectionName: 'Horse Race Winnings', natureOfPayment: 'Winnings from horse race', rateIndividual: 30, rateCompany: 30, rateNoPAN: 30, thresholdPerTransaction: 10000, thresholdAggregateAnnual: null, lowerDeductionEligible: false, section206ABApplicable: true, notes: '', status: 'active' },
  { sectionCode: '194C', sectionName: 'Contractor Payments', natureOfPayment: 'Payment to contractors', rateIndividual: 1, rateCompany: 2, rateNoPAN: 20, thresholdPerTransaction: 30000, thresholdAggregateAnnual: 100000, lowerDeductionEligible: true, section206ABApplicable: true, notes: 'Single payment >30K or aggregate >1L in FY', status: 'active' },
  { sectionCode: '194D', sectionName: 'Insurance Commission', natureOfPayment: 'Insurance commission', rateIndividual: 5, rateCompany: 10, rateNoPAN: 20, thresholdPerTransaction: null, thresholdAggregateAnnual: 15000, lowerDeductionEligible: true, section206ABApplicable: true, notes: '', status: 'active' },
  { sectionCode: '194DA', sectionName: 'Life Insurance Payout', natureOfPayment: 'Life insurance policy maturity', rateIndividual: 5, rateCompany: 5, rateNoPAN: 20, thresholdPerTransaction: null, thresholdAggregateAnnual: 100000, lowerDeductionEligible: false, section206ABApplicable: true, notes: 'On income component only', status: 'active' },
  { sectionCode: '194E', sectionName: 'NRI Sportsperson', natureOfPayment: 'Payment to non-resident sportsmen/association', rateIndividual: 20, rateCompany: 20, rateNoPAN: 20, thresholdPerTransaction: null, thresholdAggregateAnnual: null, lowerDeductionEligible: false, section206ABApplicable: false, notes: '', status: 'active' },
  { sectionCode: '194G', sectionName: 'Lottery Commission', natureOfPayment: 'Commission on sale of lottery tickets', rateIndividual: 5, rateCompany: 5, rateNoPAN: 20, thresholdPerTransaction: null, thresholdAggregateAnnual: 15000, lowerDeductionEligible: true, section206ABApplicable: true, notes: '', status: 'active' },
  { sectionCode: '194H', sectionName: 'Commission/Brokerage', natureOfPayment: 'Commission or brokerage', rateIndividual: 5, rateCompany: 5, rateNoPAN: 20, thresholdPerTransaction: null, thresholdAggregateAnnual: 15000, lowerDeductionEligible: true, section206ABApplicable: true, notes: '', status: 'active' },
  { sectionCode: '194I(a)', sectionName: 'Rent — Plant/Machinery', natureOfPayment: 'Rent on plant, machinery, equipment', rateIndividual: 2, rateCompany: 2, rateNoPAN: 20, thresholdPerTransaction: null, thresholdAggregateAnnual: 240000, lowerDeductionEligible: true, section206ABApplicable: true, notes: '', status: 'active' },
  { sectionCode: '194I(b)', sectionName: 'Rent — Land/Building', natureOfPayment: 'Rent on land, building, furniture, fittings', rateIndividual: 10, rateCompany: 10, rateNoPAN: 20, thresholdPerTransaction: null, thresholdAggregateAnnual: 240000, lowerDeductionEligible: true, section206ABApplicable: true, notes: '', status: 'active' },
  { sectionCode: '194IA', sectionName: 'Property Purchase', natureOfPayment: 'Transfer of immovable property', rateIndividual: 1, rateCompany: 1, rateNoPAN: 20, thresholdPerTransaction: 5000000, thresholdAggregateAnnual: null, lowerDeductionEligible: false, section206ABApplicable: true, notes: 'Consideration >= 50 lakhs', status: 'active' },
  { sectionCode: '194IB', sectionName: 'Rent by Individual', natureOfPayment: 'Rent by individual/HUF (non-audit)', rateIndividual: 5, rateCompany: 5, rateNoPAN: 20, thresholdPerTransaction: null, thresholdAggregateAnnual: 600000, lowerDeductionEligible: false, section206ABApplicable: true, notes: 'Monthly rent > Rs 50,000', status: 'active' },
  { sectionCode: '194J(a)', sectionName: 'Technical Services', natureOfPayment: 'Fee for technical services / call centre', rateIndividual: 2, rateCompany: 2, rateNoPAN: 20, thresholdPerTransaction: null, thresholdAggregateAnnual: 30000, lowerDeductionEligible: true, section206ABApplicable: true, notes: '', status: 'active' },
  { sectionCode: '194J(b)', sectionName: 'Professional Services', natureOfPayment: 'Fee for professional services / royalty', rateIndividual: 10, rateCompany: 10, rateNoPAN: 20, thresholdPerTransaction: null, thresholdAggregateAnnual: 30000, lowerDeductionEligible: true, section206ABApplicable: true, notes: '', status: 'active' },
  { sectionCode: '194K', sectionName: 'Mutual Fund Income', natureOfPayment: 'Income from units of mutual fund', rateIndividual: 10, rateCompany: 10, rateNoPAN: 20, thresholdPerTransaction: null, thresholdAggregateAnnual: 5000, lowerDeductionEligible: false, section206ABApplicable: true, notes: '', status: 'active' },
  { sectionCode: '194LA', sectionName: 'Compulsory Acquisition', natureOfPayment: 'Compensation on compulsory acquisition', rateIndividual: 10, rateCompany: 10, rateNoPAN: 20, thresholdPerTransaction: null, thresholdAggregateAnnual: 250000, lowerDeductionEligible: false, section206ABApplicable: true, notes: '', status: 'active' },
  { sectionCode: '194LBA', sectionName: 'Business Trust Income', natureOfPayment: 'Income from business trust', rateIndividual: 10, rateCompany: 10, rateNoPAN: 20, thresholdPerTransaction: null, thresholdAggregateAnnual: null, lowerDeductionEligible: false, section206ABApplicable: false, notes: '', status: 'active' },
  { sectionCode: '194M', sectionName: 'Contract/Commission (Non-audit)', natureOfPayment: 'Commission, brokerage, contractual payment by individual/HUF', rateIndividual: 5, rateCompany: 5, rateNoPAN: 20, thresholdPerTransaction: null, thresholdAggregateAnnual: 5000000, lowerDeductionEligible: false, section206ABApplicable: true, notes: 'Paid by individual/HUF not liable to audit', status: 'active' },
  { sectionCode: '194N', sectionName: 'Cash Withdrawal', natureOfPayment: 'Cash withdrawal from bank', rateIndividual: 2, rateCompany: 2, rateNoPAN: 20, thresholdPerTransaction: null, thresholdAggregateAnnual: 10000000, lowerDeductionEligible: false, section206ABApplicable: false, notes: '2% above Rs 1Cr, 5% for non-filers above Rs 20L', status: 'active' },
  { sectionCode: '194O', sectionName: 'E-commerce Payments', natureOfPayment: 'Payment by e-commerce operator', rateIndividual: 1, rateCompany: 1, rateNoPAN: 20, thresholdPerTransaction: null, thresholdAggregateAnnual: 500000, lowerDeductionEligible: false, section206ABApplicable: true, notes: 'Gross amount of sale/service', status: 'active' },
  { sectionCode: '194P', sectionName: 'Senior Citizen (75+)', natureOfPayment: 'Income of specified senior citizen', rateIndividual: 0, rateCompany: 0, rateNoPAN: 20, thresholdPerTransaction: null, thresholdAggregateAnnual: null, lowerDeductionEligible: false, section206ABApplicable: false, notes: 'Bank deducts tax; no ITR required', status: 'active' },
  { sectionCode: '194Q', sectionName: 'Purchase of Goods', natureOfPayment: 'Purchase of goods', rateIndividual: 0.1, rateCompany: 0.1, rateNoPAN: 5, thresholdPerTransaction: null, thresholdAggregateAnnual: 5000000, lowerDeductionEligible: false, section206ABApplicable: true, notes: 'Buyer turnover > Rs 10 Cr. TDS on amount exceeding Rs 50L', status: 'active' },
  { sectionCode: '194R', sectionName: 'Perquisites/Benefits', natureOfPayment: 'Benefit or perquisite in business/profession', rateIndividual: 10, rateCompany: 10, rateNoPAN: 20, thresholdPerTransaction: null, thresholdAggregateAnnual: 20000, lowerDeductionEligible: false, section206ABApplicable: true, notes: '', status: 'active' },
  { sectionCode: '194S', sectionName: 'Virtual Digital Asset', natureOfPayment: 'Transfer of virtual digital asset (crypto)', rateIndividual: 1, rateCompany: 1, rateNoPAN: 20, thresholdPerTransaction: null, thresholdAggregateAnnual: 50000, lowerDeductionEligible: false, section206ABApplicable: true, notes: 'Rs 10,000 for specified persons', status: 'active' },
  { sectionCode: '195', sectionName: 'NRI Payments', natureOfPayment: 'Other sums payable to non-resident', rateIndividual: 20, rateCompany: 20, rateNoPAN: 20, thresholdPerTransaction: null, thresholdAggregateAnnual: null, lowerDeductionEligible: true, section206ABApplicable: false, notes: 'Rate varies per DTAA and nature', status: 'active' },
  { sectionCode: '196D', sectionName: 'FII Income', natureOfPayment: 'Income of Foreign Institutional Investors', rateIndividual: 20, rateCompany: 20, rateNoPAN: 20, thresholdPerTransaction: null, thresholdAggregateAnnual: null, lowerDeductionEligible: false, section206ABApplicable: false, notes: '', status: 'active' },
];

export interface TCSSection {
  sectionCode: string;
  sectionName: string;
  natureOfGoods: string;
  ratePercentage: number;
  rateNoPAN: number;
  thresholdLimit: number | null;
  thresholdType: 'per_transaction' | 'aggregate_annual';
  buyerType: 'all' | 'specified_buyer';
  notes: string;
  status: 'active' | 'inactive';
}

export const TCS_SECTIONS: TCSSection[] = [
  { sectionCode: '206C_1_ALCOHOL', sectionName: 'Alcoholic Liquor', natureOfGoods: 'Alcoholic liquor for human consumption', ratePercentage: 1, rateNoPAN: 5, thresholdLimit: null, thresholdType: 'per_transaction', buyerType: 'all', notes: '', status: 'active' },
  { sectionCode: '206C_1_TIMBER_LEASE', sectionName: 'Timber (Forest Lease)', natureOfGoods: 'Timber from forest lease', ratePercentage: 2.5, rateNoPAN: 5, thresholdLimit: null, thresholdType: 'per_transaction', buyerType: 'all', notes: '', status: 'active' },
  { sectionCode: '206C_1_TIMBER_OTHER', sectionName: 'Timber (Other)', natureOfGoods: 'Timber other mode', ratePercentage: 2.5, rateNoPAN: 5, thresholdLimit: null, thresholdType: 'per_transaction', buyerType: 'all', notes: '', status: 'active' },
  { sectionCode: '206C_1_FOREST', sectionName: 'Forest Produce', natureOfGoods: 'Other forest produce', ratePercentage: 2.5, rateNoPAN: 5, thresholdLimit: null, thresholdType: 'per_transaction', buyerType: 'all', notes: '', status: 'active' },
  { sectionCode: '206C_1_SCRAP', sectionName: 'Scrap', natureOfGoods: 'Scrap', ratePercentage: 1, rateNoPAN: 5, thresholdLimit: null, thresholdType: 'per_transaction', buyerType: 'all', notes: '', status: 'active' },
  { sectionCode: '206C_1_MINERALS', sectionName: 'Minerals', natureOfGoods: 'Coal, lignite, iron ore', ratePercentage: 1, rateNoPAN: 5, thresholdLimit: null, thresholdType: 'per_transaction', buyerType: 'all', notes: '', status: 'active' },
  { sectionCode: '206C_1C_PARKING', sectionName: 'Toll/Parking/Mining', natureOfGoods: 'Toll plaza, parking lot, mining', ratePercentage: 2, rateNoPAN: 5, thresholdLimit: null, thresholdType: 'per_transaction', buyerType: 'all', notes: '', status: 'active' },
  { sectionCode: '206C_1F_VEHICLES', sectionName: 'Motor Vehicles', natureOfGoods: 'Motor vehicles sale', ratePercentage: 1, rateNoPAN: 5, thresholdLimit: 1000000, thresholdType: 'per_transaction', buyerType: 'all', notes: 'Rs 10 lakh per transaction', status: 'active' },
  { sectionCode: '206C_1G_LRS', sectionName: 'Overseas Remittance (LRS)', natureOfGoods: 'Overseas remittance under LRS', ratePercentage: 5, rateNoPAN: 10, thresholdLimit: 700000, thresholdType: 'aggregate_annual', buyerType: 'all', notes: 'Rs 7 lakh aggregate annual', status: 'active' },
  { sectionCode: '206C_1G_TOUR', sectionName: 'Overseas Tour Package', natureOfGoods: 'Overseas tour package', ratePercentage: 5, rateNoPAN: 10, thresholdLimit: null, thresholdType: 'per_transaction', buyerType: 'all', notes: 'No threshold', status: 'active' },
  { sectionCode: '206C_1H_GOODS', sectionName: 'Sale of Goods', natureOfGoods: 'Sale of goods', ratePercentage: 0.1, rateNoPAN: 1, thresholdLimit: 5000000, thresholdType: 'aggregate_annual', buyerType: 'all', notes: 'Seller turnover > Rs 10Cr, threshold Rs 50L aggregate annual', status: 'active' },
];
