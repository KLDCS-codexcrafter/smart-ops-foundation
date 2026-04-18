/**
 * entity-gst.ts — Entity GSTIN registration + GSP credentials
 * Sprint 9. Every legal entity needs its own GSTIN, IRP + EWB API creds,
 * and a GSP (GST Suvidha Provider) choice.
 */

export type GSPProvider =
  | 'nic_direct'
  | 'cleartax'
  | 'gsthero'
  | 'irisgst'
  | 'masters_india'
  | 'tally'
  | 'other';

export interface EntityGSTConfig {
  entity_id: string;

  // Registration
  gstin: string;
  legal_name: string;
  trade_name: string;
  registration_type: 'regular' | 'composition' | 'sez_unit' | 'sez_developer';
  pan: string;
  state_code: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  pincode: string;

  // IRP / EWB API credentials
  irp_api_enabled: boolean;
  irp_test_mode: boolean;
  irp_username: string;
  irp_password: string;
  irp_client_id: string;
  irp_client_secret: string;

  ewb_api_enabled: boolean;
  ewb_test_mode: boolean;
  ewb_username: string;
  ewb_password: string;

  // GSP
  gsp_provider: GSPProvider;
  gsp_api_endpoint: string;
  gsp_api_key: string;

  // Behaviour
  auto_generate_irn_on_post: boolean;
  auto_generate_ewb_above: number;

  // UPI for invoice payment QR (ties Sprint 8 + Sprint 9)
  upi_vpa: string;
  upi_payee_name: string;

  // Bank for printable invoice
  bank_name: string;
  bank_account_no: string;
  bank_ifsc: string;
  bank_branch: string;

  created_at: string;
  updated_at: string;
}

export const entityGstKey = (e: string) => `erp_entity_gst_${e}`;

export const DEFAULT_ENTITY_GST_CONFIG: EntityGSTConfig = {
  entity_id: '',
  gstin: '',
  legal_name: '',
  trade_name: '',
  registration_type: 'regular',
  pan: '',
  state_code: '',
  address_line_1: '',
  address_line_2: null,
  city: '',
  pincode: '',
  irp_api_enabled: false,
  irp_test_mode: true,
  irp_username: '',
  irp_password: '',
  irp_client_id: '',
  irp_client_secret: '',
  ewb_api_enabled: false,
  ewb_test_mode: true,
  ewb_username: '',
  ewb_password: '',
  gsp_provider: 'nic_direct',
  gsp_api_endpoint: '',
  gsp_api_key: '',
  auto_generate_irn_on_post: false,
  auto_generate_ewb_above: 50000,
  upi_vpa: '',
  upi_payee_name: '',
  bank_name: '',
  bank_account_no: '',
  bank_ifsc: '',
  bank_branch: '',
  created_at: '',
  updated_at: '',
};

export const GSP_PROVIDER_LABELS: Record<GSPProvider, string> = {
  nic_direct: 'NIC Direct',
  cleartax: 'ClearTax',
  gsthero: 'GSTHero',
  irisgst: 'IRIS GST',
  masters_india: 'Masters India',
  tally: 'Tally',
  other: 'Other',
};
