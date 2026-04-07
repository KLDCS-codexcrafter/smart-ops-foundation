/**
 * finframe-seed-data.ts — Zone 3 Session 4
 * FinFrame: 4-level Chart of Accounts group hierarchy
 * L1 (5) → L2 (12) → L3 (63) system-seeded, read-only
 * L4 = user-created + industry packs
 */

export interface L1Primary {
  code: string;
  name: string;
  nature: 'Dr' | 'Cr';
  order: number;
}

export interface L2ParentGroup {
  code: string;
  name: string;
  l1Code: string;
  nature: 'Dr' | 'Cr';
  order: number;
}

export interface L3FinancialGroup {
  code: string;
  name: string;
  tallyName: string;
  l2Code: string;
  nature: 'Dr' | 'Cr';
  isBank: boolean;
  isCash: boolean;
  isParty: boolean;
  isStatutory: boolean;
  gstApplicable: boolean;
  tdsApplicable: boolean;
  order: number;
}

export interface L4IndustryGroup {
  name: string;
  l3Code: string;
  nature: 'Dr' | 'Cr';
  industry: 'manufacturing' | 'trading' | 'services' | 'common';
}

// ─── L1 Primary Groups — 5 records ──────────────────────────────
export const L1_PRIMARIES: L1Primary[] = [
  { code: 'A',  name: 'Assets',            nature: 'Dr', order: 1 },
  { code: 'L',  name: 'Liabilities',       nature: 'Cr', order: 2 },
  { code: 'CE', name: 'Capital & Equity',  nature: 'Cr', order: 3 },
  { code: 'I',  name: 'Income',            nature: 'Cr', order: 4 },
  { code: 'E',  name: 'Expenses',          nature: 'Dr', order: 5 },
];

// ─── L2 Parent Groups — 12 records ──────────────────────────────
export const L2_PARENT_GROUPS: L2ParentGroup[] = [
  { code: 'A-NCA',  name: 'Non-Current Assets',               l1Code: 'A',  nature: 'Dr', order: 1 },
  { code: 'A-CA',   name: 'Current Assets',                   l1Code: 'A',  nature: 'Dr', order: 2 },
  { code: 'L-NCL',  name: 'Non-Current Liabilities',          l1Code: 'L',  nature: 'Cr', order: 3 },
  { code: 'L-CL',   name: 'Current Liabilities',              l1Code: 'L',  nature: 'Cr', order: 4 },
  { code: 'CE-SF',  name: "Shareholders' Funds",              l1Code: 'CE', nature: 'Cr', order: 5 },
  { code: 'CE-PP',  name: "Partners' & Proprietors' Funds",   l1Code: 'CE', nature: 'Cr', order: 6 },
  { code: 'I-OR',   name: 'Operating Revenue',                l1Code: 'I',  nature: 'Cr', order: 7 },
  { code: 'I-OI',   name: 'Other Income',                     l1Code: 'I',  nature: 'Cr', order: 8 },
  { code: 'E-COG',  name: 'Cost of Goods Sold',               l1Code: 'E',  nature: 'Dr', order: 9 },
  { code: 'E-OE',   name: 'Operating Expenses',               l1Code: 'E',  nature: 'Dr', order: 10 },
  { code: 'E-FC',   name: 'Finance Costs',                    l1Code: 'E',  nature: 'Dr', order: 11 },
  { code: 'E-DEP',  name: 'Depreciation & Amortisation',      l1Code: 'E',  nature: 'Dr', order: 12 },
];

// ─── L3 Financial Groups — 63 records ───────────────────────────
export const L3_FINANCIAL_GROUPS: L3FinancialGroup[] = [
  // Under Non-Current Assets (A-NCA) — 8 groups
  { code: 'PPE',    name: 'Property, Plant & Equipment',         tallyName: 'Fixed Assets',                l2Code: 'A-NCA', nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: true,  tdsApplicable: false, order: 1 },
  { code: 'CWIP',   name: 'Capital Work-in-Progress',            tallyName: 'Capital Work in Progress',    l2Code: 'A-NCA', nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: true,  tdsApplicable: false, order: 2 },
  { code: 'INTAN',  name: 'Intangible Assets',                   tallyName: 'Intangible Assets',           l2Code: 'A-NCA', nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: true,  tdsApplicable: false, order: 3 },
  { code: 'IAWIP',  name: 'Intangible Assets Under Development', tallyName: 'Intangible Assets WIP',       l2Code: 'A-NCA', nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: false, order: 4 },
  { code: 'INVST',  name: 'Non-Current Investments',             tallyName: 'Investments',                 l2Code: 'A-NCA', nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: false, order: 5 },
  { code: 'DTA',    name: 'Deferred Tax Assets (Net)',            tallyName: 'Deferred Tax Asset',          l2Code: 'A-NCA', nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: true,  gstApplicable: false, tdsApplicable: false, order: 6 },
  { code: 'LTLA',   name: 'Long-Term Loans & Advances',          tallyName: 'Loans & Advances (Asset)',    l2Code: 'A-NCA', nature: 'Dr', isBank: false, isCash: false, isParty: true,  isStatutory: false, gstApplicable: false, tdsApplicable: true,  order: 7 },
  { code: 'ONCA',   name: 'Other Non-Current Assets',            tallyName: 'Other Non-Current Assets',    l2Code: 'A-NCA', nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: false, order: 8 },

  // Under Current Assets (A-CA) — 10 groups
  { code: 'INV',    name: 'Inventories',                         tallyName: 'Stock-in-Hand',               l2Code: 'A-CA',  nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: true,  tdsApplicable: false, order: 1 },
  { code: 'TREC',   name: 'Trade Receivables',                   tallyName: 'Sundry Debtors',              l2Code: 'A-CA',  nature: 'Dr', isBank: false, isCash: false, isParty: true,  isStatutory: false, gstApplicable: true,  tdsApplicable: true,  order: 2 },
  { code: 'CASH',   name: 'Cash & Cash Equivalents',             tallyName: 'Cash-in-Hand',                l2Code: 'A-CA',  nature: 'Dr', isBank: false, isCash: true,  isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: false, order: 3 },
  { code: 'BANK',   name: 'Bank Balances',                       tallyName: 'Bank Accounts',               l2Code: 'A-CA',  nature: 'Dr', isBank: true,  isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: false, order: 4 },
  { code: 'CINV',   name: 'Current Investments',                 tallyName: 'Current Investments',          l2Code: 'A-CA',  nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: false, order: 5 },
  { code: 'STLA',   name: 'Short-Term Loans & Advances',         tallyName: 'Loans & Advances (Current)',   l2Code: 'A-CA',  nature: 'Dr', isBank: false, isCash: false, isParty: true,  isStatutory: false, gstApplicable: false, tdsApplicable: true,  order: 6 },
  { code: 'OTREC',  name: 'Other Current Receivables',           tallyName: 'Other Receivables',            l2Code: 'A-CA',  nature: 'Dr', isBank: false, isCash: false, isParty: true,  isStatutory: false, gstApplicable: false, tdsApplicable: false, order: 7 },
  { code: 'PREEX',  name: 'Prepaid Expenses',                    tallyName: 'Pre-paid Expenses',            l2Code: 'A-CA',  nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: false, order: 8 },
  { code: 'ACINC',  name: 'Accrued Income',                      tallyName: 'Accrued Income',               l2Code: 'A-CA',  nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: false, order: 9 },
  { code: 'ADTAX',  name: 'Advance Tax & TDS Receivable',        tallyName: 'Advance Tax',                  l2Code: 'A-CA',  nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: true,  gstApplicable: false, tdsApplicable: false, order: 10 },

  // Under Non-Current Liabilities (L-NCL) — 6 groups
  { code: 'LTBOR',  name: 'Long-Term Borrowings',                tallyName: 'Secured Loans',                l2Code: 'L-NCL', nature: 'Cr', isBank: false, isCash: false, isParty: true,  isStatutory: false, gstApplicable: false, tdsApplicable: true,  order: 1 },
  { code: 'DTL',    name: 'Deferred Tax Liabilities (Net)',       tallyName: 'Deferred Tax Liability',       l2Code: 'L-NCL', nature: 'Cr', isBank: false, isCash: false, isParty: false, isStatutory: true,  gstApplicable: false, tdsApplicable: false, order: 2 },
  { code: 'LTPROV', name: 'Long-Term Provisions',                tallyName: 'Provisions (Non-Current)',     l2Code: 'L-NCL', nature: 'Cr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: false, order: 3 },
  { code: 'ONCL',   name: 'Other Non-Current Liabilities',       tallyName: 'Other Long-Term Liabilities',  l2Code: 'L-NCL', nature: 'Cr', isBank: false, isCash: false, isParty: true,  isStatutory: false, gstApplicable: false, tdsApplicable: false, order: 4 },
  { code: 'LEASE',  name: 'Lease Liabilities (Non-Current)',      tallyName: 'Lease Liabilities',            l2Code: 'L-NCL', nature: 'Cr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: false, order: 5 },
  { code: 'BOND',   name: 'Debentures & Bonds',                  tallyName: 'Debentures',                   l2Code: 'L-NCL', nature: 'Cr', isBank: false, isCash: false, isParty: true,  isStatutory: false, gstApplicable: false, tdsApplicable: true,  order: 6 },

  // Under Current Liabilities (L-CL) — 9 groups
  { code: 'STBOR',  name: 'Short-Term Borrowings',               tallyName: 'Unsecured Loans',              l2Code: 'L-CL',  nature: 'Cr', isBank: false, isCash: false, isParty: true,  isStatutory: false, gstApplicable: false, tdsApplicable: true,  order: 1 },
  { code: 'TPAY',   name: 'Trade Payables',                      tallyName: 'Sundry Creditors',             l2Code: 'L-CL',  nature: 'Cr', isBank: false, isCash: false, isParty: true,  isStatutory: false, gstApplicable: true,  tdsApplicable: true,  order: 2 },
  { code: 'STPROV', name: 'Short-Term Provisions',               tallyName: 'Provisions (Current)',         l2Code: 'L-CL',  nature: 'Cr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: false, order: 3 },
  { code: 'DUTYP',  name: 'Duties & Taxes Payable',              tallyName: 'Duties & Taxes',               l2Code: 'L-CL',  nature: 'Cr', isBank: false, isCash: false, isParty: false, isStatutory: true,  gstApplicable: false, tdsApplicable: false, order: 4 },
  { code: 'ADVRC',  name: 'Advances Received from Customers',    tallyName: 'Advance from Customers',       l2Code: 'L-CL',  nature: 'Cr', isBank: false, isCash: false, isParty: true,  isStatutory: false, gstApplicable: true,  tdsApplicable: false, order: 5 },
  { code: 'OPAY',   name: 'Other Current Liabilities',           tallyName: 'Other Current Liabilities',    l2Code: 'L-CL',  nature: 'Cr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: false, order: 6 },
  { code: 'TDSP',   name: 'TDS Payable',                         tallyName: 'TDS Payable',                  l2Code: 'L-CL',  nature: 'Cr', isBank: false, isCash: false, isParty: false, isStatutory: true,  gstApplicable: false, tdsApplicable: false, order: 7 },
  { code: 'GSTP',   name: 'GST Payable',                         tallyName: 'GST Payable',                  l2Code: 'L-CL',  nature: 'Cr', isBank: false, isCash: false, isParty: false, isStatutory: true,  gstApplicable: false, tdsApplicable: false, order: 8 },
  { code: 'EMPL',   name: 'Employee Liabilities',                tallyName: 'Outstanding Liabilities',      l2Code: 'L-CL',  nature: 'Cr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: true,  order: 9 },

  // Under Shareholders' Funds (CE-SF) — 4 groups
  { code: 'EQSH',   name: 'Equity Share Capital',                tallyName: 'Share Capital',                l2Code: 'CE-SF', nature: 'Cr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: false, order: 1 },
  { code: 'PRSH',   name: 'Preference Share Capital',            tallyName: 'Preference Capital',           l2Code: 'CE-SF', nature: 'Cr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: false, order: 2 },
  { code: 'RSRV',   name: 'Reserves & Surplus',                  tallyName: 'Reserves & Surplus',           l2Code: 'CE-SF', nature: 'Cr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: false, order: 3 },
  { code: 'OCI',    name: 'Other Comprehensive Income',          tallyName: 'Other Comprehensive Income',   l2Code: 'CE-SF', nature: 'Cr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: false, order: 4 },

  // Under Partners' & Proprietors' Funds (CE-PP) — 3 groups
  { code: 'PCAP',   name: "Partners' Capital Accounts",          tallyName: 'Capital Account',              l2Code: 'CE-PP', nature: 'Cr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: false, order: 1 },
  { code: 'PCUR',   name: "Partners' Current Accounts",          tallyName: 'Current Account (Partners)',   l2Code: 'CE-PP', nature: 'Cr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: false, order: 2 },
  { code: 'PDRAW',  name: "Proprietor's Drawings",               tallyName: 'Drawings Account',             l2Code: 'CE-PP', nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: false, order: 3 },

  // Under Operating Revenue (I-OR) — 5 groups
  { code: 'SALE',   name: 'Revenue from Operations',             tallyName: 'Sales Accounts',               l2Code: 'I-OR',  nature: 'Cr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: true,  tdsApplicable: true,  order: 1 },
  { code: 'SRET',   name: 'Sales Returns & Allowances',          tallyName: 'Sales Returns',                l2Code: 'I-OR',  nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: true,  tdsApplicable: false, order: 2 },
  { code: 'SDISC',  name: 'Trade Discounts Given',               tallyName: 'Discount Allowed',             l2Code: 'I-OR',  nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: true,  tdsApplicable: false, order: 3 },
  { code: 'SERV',   name: 'Service Revenue',                     tallyName: 'Service Income',               l2Code: 'I-OR',  nature: 'Cr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: true,  tdsApplicable: true,  order: 4 },
  { code: 'EXINC',  name: 'Export Revenue',                      tallyName: 'Export Sales',                 l2Code: 'I-OR',  nature: 'Cr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: true,  tdsApplicable: false, order: 5 },

  // Under Other Income (I-OI) — 5 groups
  { code: 'INTINC', name: 'Interest Income',                     tallyName: 'Interest Received',            l2Code: 'I-OI',  nature: 'Cr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: true,  order: 1 },
  { code: 'DIVINC', name: 'Dividend Income',                     tallyName: 'Dividend Received',            l2Code: 'I-OI',  nature: 'Cr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: true,  order: 2 },
  { code: 'RNTINC', name: 'Rental Income',                       tallyName: 'Rent Received',                l2Code: 'I-OI',  nature: 'Cr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: true,  tdsApplicable: true,  order: 3 },
  { code: 'GAIN',   name: 'Gain on Sale of Assets',              tallyName: 'Profit on Sale of Assets',     l2Code: 'I-OI',  nature: 'Cr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: false, order: 4 },
  { code: 'MISC',   name: 'Miscellaneous Income',                tallyName: 'Other Income',                 l2Code: 'I-OI',  nature: 'Cr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: true,  tdsApplicable: false, order: 5 },

  // Under Cost of Goods Sold (E-COG) — 5 groups
  { code: 'PURCH',  name: 'Purchases',                           tallyName: 'Purchase Accounts',            l2Code: 'E-COG', nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: true,  tdsApplicable: true,  order: 1 },
  { code: 'PRET',   name: 'Purchase Returns & Allowances',       tallyName: 'Purchase Returns',             l2Code: 'E-COG', nature: 'Cr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: true,  tdsApplicable: false, order: 2 },
  { code: 'DLAB',   name: 'Direct Labour',                       tallyName: 'Direct Labour Charges',        l2Code: 'E-COG', nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: true,  tdsApplicable: true,  order: 3 },
  { code: 'DEXP',   name: 'Direct Expenses',                     tallyName: 'Direct Expenses',              l2Code: 'E-COG', nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: true,  tdsApplicable: true,  order: 4 },
  { code: 'STCHG',  name: 'Changes in Inventories',              tallyName: 'Stock Adjustments',            l2Code: 'E-COG', nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: false, order: 5 },

  // Under Operating Expenses (E-OE) — 8 groups
  { code: 'EMPB',   name: 'Employee Benefits Expense',           tallyName: 'Salary & Wages',               l2Code: 'E-OE',  nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: true,  order: 1 },
  { code: 'RENT',   name: 'Rent Expense',                        tallyName: 'Rent Paid',                    l2Code: 'E-OE',  nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: true,  tdsApplicable: true,  order: 2 },
  { code: 'UTIL',   name: 'Utilities & Communication',           tallyName: 'Telephone & Internet',         l2Code: 'E-OE',  nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: true,  tdsApplicable: true,  order: 3 },
  { code: 'TRAV',   name: 'Travel & Conveyance',                 tallyName: 'Travelling Expenses',          l2Code: 'E-OE',  nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: true,  tdsApplicable: false, order: 4 },
  { code: 'PRFEE',  name: 'Professional & Legal Fees',           tallyName: 'Professional Fees',            l2Code: 'E-OE',  nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: true,  tdsApplicable: true,  order: 5 },
  { code: 'ADMIN',  name: 'Administrative Expenses',             tallyName: 'Office & Administrative Exp',  l2Code: 'E-OE',  nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: true,  tdsApplicable: false, order: 6 },
  { code: 'SELL',   name: 'Selling & Distribution Expenses',     tallyName: 'Selling Expenses',             l2Code: 'E-OE',  nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: true,  tdsApplicable: false, order: 7 },
  { code: 'REPAIR', name: 'Repairs & Maintenance',               tallyName: 'Repairs & Maintenance',        l2Code: 'E-OE',  nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: true,  tdsApplicable: true,  order: 8 },

  // Under Finance Costs (E-FC) — 4 groups
  { code: 'INTEXP', name: 'Interest Expense',                    tallyName: 'Interest Paid',                l2Code: 'E-FC',  nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: true,  order: 1 },
  { code: 'BKCHG',  name: 'Bank Charges & Commission',           tallyName: 'Bank Charges',                 l2Code: 'E-FC',  nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: true,  tdsApplicable: false, order: 2 },
  { code: 'FXLOSS', name: 'Foreign Exchange Loss',               tallyName: 'Exchange Rate Difference',     l2Code: 'E-FC',  nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: false, order: 3 },
  { code: 'LSCOST', name: 'Lease Finance Cost',                  tallyName: 'Lease Interest',               l2Code: 'E-FC',  nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: false, order: 4 },

  // Under Depreciation & Amortisation (E-DEP) — 3 groups
  { code: 'DTAN',   name: 'Depreciation on Tangible Assets',     tallyName: 'Depreciation',                 l2Code: 'E-DEP', nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: false, order: 1 },
  { code: 'AMINT',  name: 'Amortisation of Intangible Assets',   tallyName: 'Amortisation',                 l2Code: 'E-DEP', nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: false, order: 2 },
  { code: 'IMPAIR', name: 'Impairment Losses',                   tallyName: 'Impairment Loss',              l2Code: 'E-DEP', nature: 'Dr', isBank: false, isCash: false, isParty: false, isStatutory: false, gstApplicable: false, tdsApplicable: false, order: 3 },
];

// ─── L4 Industry Packs ──────────────────────────────────────────

// Common Pack — loads for ALL industries (25 groups)
const COMMON_PACK: L4IndustryGroup[] = [
  { name: 'Petty Cash',                     l3Code: 'CASH',   nature: 'Dr', industry: 'common' },
  { name: 'Main Cash',                      l3Code: 'CASH',   nature: 'Dr', industry: 'common' },
  { name: 'Primary Bank Account',           l3Code: 'BANK',   nature: 'Dr', industry: 'common' },
  { name: 'Salary Bank Account',            l3Code: 'BANK',   nature: 'Dr', industry: 'common' },
  { name: 'Tax Payment Bank Account',       l3Code: 'BANK',   nature: 'Dr', industry: 'common' },
  { name: 'FD & Deposit Account',           l3Code: 'BANK',   nature: 'Dr', industry: 'common' },
  { name: 'Domestic Debtors',               l3Code: 'TREC',   nature: 'Dr', industry: 'common' },
  { name: 'Export Debtors',                 l3Code: 'TREC',   nature: 'Dr', industry: 'common' },
  { name: 'Related Party Debtors',          l3Code: 'TREC',   nature: 'Dr', industry: 'common' },
  { name: 'Domestic Creditors',             l3Code: 'TPAY',   nature: 'Cr', industry: 'common' },
  { name: 'Import Creditors',              l3Code: 'TPAY',   nature: 'Cr', industry: 'common' },
  { name: 'Expense Creditors',             l3Code: 'TPAY',   nature: 'Cr', industry: 'common' },
  { name: 'Input CGST',                    l3Code: 'ADTAX',  nature: 'Dr', industry: 'common' },
  { name: 'Input SGST',                    l3Code: 'ADTAX',  nature: 'Dr', industry: 'common' },
  { name: 'Input IGST',                    l3Code: 'ADTAX',  nature: 'Dr', industry: 'common' },
  { name: 'Output CGST',                   l3Code: 'GSTP',   nature: 'Cr', industry: 'common' },
  { name: 'Output SGST',                   l3Code: 'GSTP',   nature: 'Cr', industry: 'common' },
  { name: 'Output IGST',                   l3Code: 'GSTP',   nature: 'Cr', industry: 'common' },
  { name: 'TDS on Salary',                 l3Code: 'TDSP',   nature: 'Cr', industry: 'common' },
  { name: 'TDS on Professional Fees',      l3Code: 'TDSP',   nature: 'Cr', industry: 'common' },
  { name: 'TDS on Rent',                   l3Code: 'TDSP',   nature: 'Cr', industry: 'common' },
  { name: 'TDS on Contractor',             l3Code: 'TDSP',   nature: 'Cr', industry: 'common' },
  { name: 'Salaries & Wages',              l3Code: 'EMPB',   nature: 'Dr', industry: 'common' },
  { name: 'Directors Remuneration',         l3Code: 'EMPB',   nature: 'Dr', industry: 'common' },
  { name: 'Staff Welfare Expenses',         l3Code: 'EMPB',   nature: 'Dr', industry: 'common' },
];

// Manufacturing Pack — loads when industry = Manufacturing (30 groups)
const MANUFACTURING_PACK: L4IndustryGroup[] = [
  { name: 'Land & Site Development',        l3Code: 'PPE',    nature: 'Dr', industry: 'manufacturing' },
  { name: 'Factory Building',               l3Code: 'PPE',    nature: 'Dr', industry: 'manufacturing' },
  { name: 'Plant & Machinery',              l3Code: 'PPE',    nature: 'Dr', industry: 'manufacturing' },
  { name: 'Electrical Installation',        l3Code: 'PPE',    nature: 'Dr', industry: 'manufacturing' },
  { name: 'Moulds & Dies',                  l3Code: 'PPE',    nature: 'Dr', industry: 'manufacturing' },
  { name: 'Vehicles — Factory',             l3Code: 'PPE',    nature: 'Dr', industry: 'manufacturing' },
  { name: 'Furniture & Fixtures',           l3Code: 'PPE',    nature: 'Dr', industry: 'manufacturing' },
  { name: 'Office Equipment',               l3Code: 'PPE',    nature: 'Dr', industry: 'manufacturing' },
  { name: 'Computer & IT Equipment',        l3Code: 'PPE',    nature: 'Dr', industry: 'manufacturing' },
  { name: 'Raw Materials',                  l3Code: 'INV',    nature: 'Dr', industry: 'manufacturing' },
  { name: 'Work-in-Progress',              l3Code: 'INV',    nature: 'Dr', industry: 'manufacturing' },
  { name: 'Finished Goods',                l3Code: 'INV',    nature: 'Dr', industry: 'manufacturing' },
  { name: 'Packing Materials',             l3Code: 'INV',    nature: 'Dr', industry: 'manufacturing' },
  { name: 'Consumable Stores',             l3Code: 'INV',    nature: 'Dr', industry: 'manufacturing' },
  { name: 'Scrap & Waste',                 l3Code: 'INV',    nature: 'Dr', industry: 'manufacturing' },
  { name: 'Raw Material Purchases',        l3Code: 'PURCH',  nature: 'Dr', industry: 'manufacturing' },
  { name: 'Packing Material Purchases',    l3Code: 'PURCH',  nature: 'Dr', industry: 'manufacturing' },
  { name: 'Consumable Purchases',          l3Code: 'PURCH',  nature: 'Dr', industry: 'manufacturing' },
  { name: 'Import Purchases',              l3Code: 'PURCH',  nature: 'Dr', industry: 'manufacturing' },
  { name: 'Factory Wages',                 l3Code: 'DLAB',   nature: 'Dr', industry: 'manufacturing' },
  { name: 'Overtime Wages',                l3Code: 'DLAB',   nature: 'Dr', industry: 'manufacturing' },
  { name: 'Contract Labour',               l3Code: 'DLAB',   nature: 'Dr', industry: 'manufacturing' },
  { name: 'Power & Fuel',                  l3Code: 'DEXP',   nature: 'Dr', industry: 'manufacturing' },
  { name: 'Carriage Inward',               l3Code: 'DEXP',   nature: 'Dr', industry: 'manufacturing' },
  { name: 'Factory Rent',                  l3Code: 'DEXP',   nature: 'Dr', industry: 'manufacturing' },
  { name: 'Quality Control Expenses',      l3Code: 'DEXP',   nature: 'Dr', industry: 'manufacturing' },
  { name: 'Domestic Sales',                l3Code: 'SALE',   nature: 'Cr', industry: 'manufacturing' },
  { name: 'Export Sales',                  l3Code: 'SALE',   nature: 'Cr', industry: 'manufacturing' },
  { name: 'Scrap Sales',                   l3Code: 'SALE',   nature: 'Cr', industry: 'manufacturing' },
  { name: 'Job Work Income',               l3Code: 'SERV',   nature: 'Cr', industry: 'manufacturing' },
];

// Trading Pack — loads when industry = Trading or Retail (18 groups)
const TRADING_PACK: L4IndustryGroup[] = [
  { name: 'Shop & Showroom',               l3Code: 'PPE',    nature: 'Dr', industry: 'trading' },
  { name: 'Display & Fixtures',            l3Code: 'PPE',    nature: 'Dr', industry: 'trading' },
  { name: 'Delivery Vehicles',             l3Code: 'PPE',    nature: 'Dr', industry: 'trading' },
  { name: 'Goods in Stock',                l3Code: 'INV',    nature: 'Dr', industry: 'trading' },
  { name: 'Goods in Transit',              l3Code: 'INV',    nature: 'Dr', industry: 'trading' },
  { name: 'Goods on Consignment',          l3Code: 'INV',    nature: 'Dr', industry: 'trading' },
  { name: 'Domestic Purchases',            l3Code: 'PURCH',  nature: 'Dr', industry: 'trading' },
  { name: 'Import Purchases',              l3Code: 'PURCH',  nature: 'Dr', industry: 'trading' },
  { name: 'Retail Sales',                  l3Code: 'SALE',   nature: 'Cr', industry: 'trading' },
  { name: 'Wholesale Sales',               l3Code: 'SALE',   nature: 'Cr', industry: 'trading' },
  { name: 'Online Sales',                  l3Code: 'SALE',   nature: 'Cr', industry: 'trading' },
  { name: 'Export Sales',                  l3Code: 'SALE',   nature: 'Cr', industry: 'trading' },
  { name: 'Freight & Delivery',            l3Code: 'DEXP',   nature: 'Dr', industry: 'trading' },
  { name: 'Customs Duty',                  l3Code: 'DEXP',   nature: 'Dr', industry: 'trading' },
  { name: 'Commission on Sales',           l3Code: 'SELL',   nature: 'Dr', industry: 'trading' },
  { name: 'Advertisement Expenses',        l3Code: 'SELL',   nature: 'Dr', industry: 'trading' },
  { name: 'Warehouse Rent',                l3Code: 'RENT',   nature: 'Dr', industry: 'trading' },
  { name: 'E-commerce Platform Fees',      l3Code: 'ADMIN',  nature: 'Dr', industry: 'trading' },
];

// Services Pack — loads when industry = Technology / Consulting / IT Services (20 groups)
const SERVICES_PACK: L4IndustryGroup[] = [
  { name: 'Computers & Laptops',           l3Code: 'PPE',    nature: 'Dr', industry: 'services' },
  { name: 'Servers & Networking',           l3Code: 'PPE',    nature: 'Dr', industry: 'services' },
  { name: 'Office Furniture',              l3Code: 'PPE',    nature: 'Dr', industry: 'services' },
  { name: 'Software Licences',             l3Code: 'INTAN',  nature: 'Dr', industry: 'services' },
  { name: 'Product Development WIP',       l3Code: 'IAWIP',  nature: 'Dr', industry: 'services' },
  { name: 'Consulting Revenue',            l3Code: 'SERV',   nature: 'Cr', industry: 'services' },
  { name: 'Software Development Revenue',  l3Code: 'SERV',   nature: 'Cr', industry: 'services' },
  { name: 'AMC & Support Revenue',         l3Code: 'SERV',   nature: 'Cr', industry: 'services' },
  { name: 'SaaS Subscription Revenue',     l3Code: 'SERV',   nature: 'Cr', industry: 'services' },
  { name: 'Export of Services',            l3Code: 'EXINC',  nature: 'Cr', industry: 'services' },
  { name: 'Subcontractor Charges',         l3Code: 'DEXP',   nature: 'Dr', industry: 'services' },
  { name: 'Cloud & Hosting Costs',         l3Code: 'DEXP',   nature: 'Dr', industry: 'services' },
  { name: 'Domain & SSL Costs',            l3Code: 'ADMIN',  nature: 'Dr', industry: 'services' },
  { name: 'Training & Certification',      l3Code: 'EMPB',   nature: 'Dr', industry: 'services' },
  { name: 'Recruitment Expenses',          l3Code: 'EMPB',   nature: 'Dr', industry: 'services' },
  { name: 'Co-working Space Rent',         l3Code: 'RENT',   nature: 'Dr', industry: 'services' },
  { name: 'Software Subscriptions',        l3Code: 'ADMIN',  nature: 'Dr', industry: 'services' },
  { name: 'Internet & Communication',      l3Code: 'UTIL',   nature: 'Dr', industry: 'services' },
  { name: 'Client Travel',                 l3Code: 'TRAV',   nature: 'Dr', industry: 'services' },
  { name: 'Marketing & Branding',          l3Code: 'SELL',   nature: 'Dr', industry: 'services' },
];

export const L4_INDUSTRY_PACKS = {
  common: COMMON_PACK,
  manufacturing: MANUFACTURING_PACK,
  trading: TRADING_PACK,
  services: SERVICES_PACK,
};
