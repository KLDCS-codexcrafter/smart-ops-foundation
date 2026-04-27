/**
 * @file     bank-format-specs.ts
 * @purpose  12-bank file format specifications · Phase 1 NEFT/RTGS/IMPS file
 *           generators · column mappings · delimiters · supported formats.
 * @who      Operix Engineering
 * @when     Apr-2026 · T-T8.7-SmartAP (Group B Sprint B.7)
 * @sprint   T-T8.7-SmartAP
 * @whom     bank-file-engine.ts
 *
 * Per Q-FF (a) Universal coverage · 12 Indian banks ship Phase 1.
 *
 * 12 banks: HDFC · ICICI · SBI · Axis · Kotak · Yes · IndusInd · Federal · RBL · BOB · PNB · Canara.
 *
 * [DEFERRED · Phase 2 backend] Per-bank REST API auth + push integration ·
 *   Phase 1 specs drive file string generation only · operator uploads to bank
 *   corporate banking portal manually.
 *   See: /Future_Task_Register_Support_BackOffice.md · Capability 8.
 */
import type { BankFileSpec } from '@/types/smart-ap';

const STANDARD_COLUMNS = [
  'beneficiary_name',
  'beneficiary_account_no',
  'beneficiary_ifsc',
  'amount',
  'remitter_name',
  'remitter_account_no',
  'remarks',
] as const;

const STANDARD_HEADERS = {
  beneficiary_name: 'Beneficiary Name',
  beneficiary_account_no: 'Beneficiary A/c No',
  beneficiary_ifsc: 'IFSC Code',
  amount: 'Amount',
  remitter_name: 'Remitter Name',
  remitter_account_no: 'Remitter A/c No',
  remarks: 'Remarks',
} as const;

/** All 12 supported Indian bank specs · indexed by bank_code. */
export const BANK_FORMAT_SPECS: BankFileSpec[] = [
  {
    bank_code: 'HDFC',
    bank_name: 'HDFC Bank',
    supported_formats: ['NEFT', 'RTGS', 'IMPS'],
    delimiter: ',',
    header_required: true,
    column_order: [...STANDARD_COLUMNS],
    column_mappings: { ...STANDARD_HEADERS },
    file_extension: 'csv',
  },
  {
    bank_code: 'ICICI',
    bank_name: 'ICICI Bank',
    supported_formats: ['NEFT', 'RTGS', 'IMPS'],
    delimiter: ',',
    header_required: true,
    column_order: [
      'transaction_type',
      'beneficiary_name',
      'beneficiary_account_no',
      'beneficiary_ifsc',
      'amount',
      'remitter_name',
      'remitter_account_no',
      'remarks',
    ],
    column_mappings: {
      transaction_type: 'TXN Type',
      beneficiary_name: 'Beneficiary Name',
      beneficiary_account_no: 'Bene A/c',
      beneficiary_ifsc: 'IFSC',
      amount: 'Amount',
      remitter_name: 'Remitter',
      remitter_account_no: 'Debit A/c',
      remarks: 'Remarks',
    },
    file_extension: 'csv',
  },
  {
    bank_code: 'SBI',
    bank_name: 'State Bank of India',
    supported_formats: ['NEFT', 'RTGS'],
    delimiter: '|',
    header_required: true,
    column_order: [
      'beneficiary_name',
      'beneficiary_account_no',
      'beneficiary_ifsc',
      'amount',
      'remitter_account_no',
      'remarks',
      'transaction_type',
    ],
    column_mappings: {
      beneficiary_name: 'BENE_NAME',
      beneficiary_account_no: 'BENE_ACCT_NO',
      beneficiary_ifsc: 'BENE_IFSC',
      amount: 'AMOUNT',
      remitter_account_no: 'DEBIT_ACCT',
      remarks: 'NARRATION',
      transaction_type: 'TXN_TYPE',
    },
    file_extension: 'txt',
  },
  {
    bank_code: 'AXIS',
    bank_name: 'Axis Bank',
    supported_formats: ['NEFT', 'RTGS', 'IMPS'],
    delimiter: ',',
    header_required: true,
    column_order: [...STANDARD_COLUMNS, 'value_date'],
    column_mappings: { ...STANDARD_HEADERS, value_date: 'Value Date' },
    file_extension: 'csv',
  },
  {
    bank_code: 'KOTAK',
    bank_name: 'Kotak Mahindra Bank',
    supported_formats: ['NEFT', 'RTGS', 'IMPS'],
    delimiter: ',',
    header_required: true,
    column_order: [...STANDARD_COLUMNS],
    column_mappings: { ...STANDARD_HEADERS },
    file_extension: 'csv',
  },
  {
    bank_code: 'YES',
    bank_name: 'Yes Bank',
    supported_formats: ['NEFT', 'RTGS'],
    delimiter: '\t',
    header_required: true,
    column_order: [...STANDARD_COLUMNS],
    column_mappings: { ...STANDARD_HEADERS },
    file_extension: 'txt',
  },
  {
    bank_code: 'INDUSIND',
    bank_name: 'IndusInd Bank',
    supported_formats: ['NEFT', 'RTGS', 'IMPS'],
    delimiter: ',',
    header_required: true,
    column_order: [...STANDARD_COLUMNS],
    column_mappings: { ...STANDARD_HEADERS },
    file_extension: 'csv',
  },
  {
    bank_code: 'FEDERAL',
    bank_name: 'Federal Bank',
    supported_formats: ['NEFT', 'RTGS'],
    delimiter: ',',
    header_required: true,
    column_order: [...STANDARD_COLUMNS],
    column_mappings: { ...STANDARD_HEADERS },
    file_extension: 'csv',
  },
  {
    bank_code: 'RBL',
    bank_name: 'RBL Bank',
    supported_formats: ['NEFT', 'RTGS', 'IMPS'],
    delimiter: ',',
    header_required: true,
    column_order: [...STANDARD_COLUMNS, 'reference_no'],
    column_mappings: { ...STANDARD_HEADERS, reference_no: 'Ref No' },
    file_extension: 'csv',
  },
  {
    bank_code: 'BOB',
    bank_name: 'Bank of Baroda',
    supported_formats: ['NEFT', 'RTGS'],
    delimiter: '|',
    header_required: true,
    column_order: [
      'beneficiary_name',
      'beneficiary_account_no',
      'beneficiary_ifsc',
      'amount',
      'remitter_account_no',
      'remarks',
    ],
    column_mappings: {
      beneficiary_name: 'BENE_NAME',
      beneficiary_account_no: 'BENE_AC',
      beneficiary_ifsc: 'IFSC',
      amount: 'AMT',
      remitter_account_no: 'DEBIT_AC',
      remarks: 'PURPOSE',
    },
    file_extension: 'txt',
  },
  {
    bank_code: 'PNB',
    bank_name: 'Punjab National Bank',
    supported_formats: ['NEFT', 'RTGS'],
    delimiter: ',',
    header_required: true,
    column_order: [...STANDARD_COLUMNS],
    column_mappings: { ...STANDARD_HEADERS },
    file_extension: 'csv',
  },
  {
    bank_code: 'CANARA',
    bank_name: 'Canara Bank',
    supported_formats: ['NEFT', 'RTGS'],
    delimiter: '|',
    header_required: true,
    column_order: [
      'beneficiary_name',
      'beneficiary_account_no',
      'beneficiary_ifsc',
      'amount',
      'remitter_account_no',
      'remarks',
    ],
    column_mappings: {
      beneficiary_name: 'BENEFICIARY',
      beneficiary_account_no: 'BENE_ACCT',
      beneficiary_ifsc: 'IFSC',
      amount: 'AMOUNT',
      remitter_account_no: 'DR_ACCT',
      remarks: 'NARRATION',
    },
    file_extension: 'txt',
  },
];

/** Quick lookup map · bank_code → spec. */
export const BANK_SPEC_BY_CODE = new Map(
  BANK_FORMAT_SPECS.map(s => [s.bank_code, s] as const),
);
