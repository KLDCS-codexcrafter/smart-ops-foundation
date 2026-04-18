/**
 * irn-engine.ts — Pure GSTN IRP API abstraction
 * Sprint 9. Generates synthetic IRNRecord in test mode; structured for
 * a backend swap to real NIC IRP endpoints.
 *
 * No localStorage / no React / no toast. Fully unit-testable.
 */

import type { Voucher } from '@/types/voucher';
import type { IRNRecord } from '@/types/irn';
import type { GSPProvider } from '@/types/entity-gst';

export interface IRPCredentials {
  username: string;
  password: string;
  client_id: string;
  client_secret: string;
  gsp_provider: GSPProvider;
  test_mode: boolean;
}

export interface IRPItemPayload {
  SlNo: string;
  PrdDesc: string;
  IsServc: 'Y' | 'N';
  HsnCd: string;
  Qty: number;
  Unit: string;
  UnitPrice: number;
  TotAmt: number;
  Discount: number;
  AssAmt: number;
  GstRt: number;
  IgstAmt: number;
  CgstAmt: number;
  SgstAmt: number;
  CesRt: number;
  CesAmt: number;
  TotItemVal: number;
}

export interface IRPPayload {
  Version: '1.1';
  TranDtls: {
    TaxSch: 'GST';
    SupTyp: 'B2B' | 'SEZWP' | 'SEZWOP' | 'EXPWP' | 'EXPWOP' | 'DEXP';
    RegRev: 'Y' | 'N';
    EcmGstin: string | null;
    IgstOnIntra: 'Y' | 'N';
  };
  DocDtls: {
    Typ: 'INV' | 'CRN' | 'DBN';
    No: string;
    Dt: string; // dd/mm/yyyy
  };
  SellerDtls: {
    Gstin: string;
    LglNm: string;
    Addr1: string;
    Addr2?: string;
    Loc: string;
    Pin: number;
    Stcd: string;
  };
  BuyerDtls: {
    Gstin: string;
    LglNm: string;
    Pos: string;
    Addr1: string;
    Addr2?: string;
    Loc: string;
    Pin: number;
    Stcd: string;
  };
  ItemList: IRPItemPayload[];
  ValDtls: {
    AssVal: number;
    CgstVal: number;
    SgstVal: number;
    IgstVal: number;
    CesVal: number;
    RndOffAmt: number;
    TotInvVal: number;
  };
}

function pad2(n: number): string { return String(n).padStart(2, '0'); }

function ddmmyyyy(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Build the IRP-shaped payload from a voucher and entity context. */
export function buildIRNPayload(
  voucher: Voucher,
  supplierGstin: string,
  supplierLegalName: string,
  supplierAddress: string,
  supplierCity: string,
  supplierPincode: string,
  supplierStateCode: string,
  customerGstin: string,
  customerLegalName: string,
  customerAddress: string,
  customerCity: string,
  customerPincode: string,
  customerStateCode: string,
): IRPPayload {
  const items: IRPItemPayload[] = (voucher.inventory_lines ?? []).map((l, i) => ({
    SlNo: String(i + 1),
    PrdDesc: l.item_name,
    IsServc: 'N',
    HsnCd: l.hsn_sac_code || '0000',
    Qty: l.qty,
    Unit: l.uom || 'NOS',
    UnitPrice: l.rate,
    TotAmt: l.qty * l.rate,
    Discount: l.discount_amount,
    AssAmt: l.taxable_value,
    GstRt: l.gst_rate,
    IgstAmt: l.igst_amount,
    CgstAmt: l.cgst_amount,
    SgstAmt: l.sgst_amount,
    CesRt: l.cess_rate,
    CesAmt: l.cess_amount,
    TotItemVal: l.total,
  }));

  return {
    Version: '1.1',
    TranDtls: {
      TaxSch: 'GST',
      SupTyp: 'B2B',
      RegRev: 'N',
      EcmGstin: null,
      IgstOnIntra: 'N',
    },
    DocDtls: {
      Typ: 'INV',
      No: voucher.voucher_no,
      Dt: ddmmyyyy(voucher.date),
    },
    SellerDtls: {
      Gstin: supplierGstin,
      LglNm: supplierLegalName,
      Addr1: supplierAddress || 'NA',
      Loc: supplierCity || 'NA',
      Pin: Number(supplierPincode) || 0,
      Stcd: supplierStateCode,
    },
    BuyerDtls: {
      Gstin: customerGstin,
      LglNm: customerLegalName,
      Pos: customerStateCode,
      Addr1: customerAddress || 'NA',
      Loc: customerCity || 'NA',
      Pin: Number(customerPincode) || 0,
      Stcd: customerStateCode,
    },
    ItemList: items,
    ValDtls: {
      AssVal: voucher.total_taxable,
      CgstVal: voucher.total_cgst,
      SgstVal: voucher.total_sgst,
      IgstVal: voucher.total_igst,
      CesVal: voucher.total_cess,
      RndOffAmt: voucher.round_off,
      TotInvVal: voucher.net_amount,
    },
  };
}

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}Z[0-9A-Z]{1}$/;

/** Validate IRP payload per GSTN schema. Empty list = valid. */
export function validateIRNPayload(payload: IRPPayload): string[] {
  const errors: string[] = [];
  if (!GSTIN_PATTERN.test(payload.SellerDtls.Gstin)) {
    errors.push('Supplier GSTIN must be a valid 15-character GSTIN');
  }
  if (!GSTIN_PATTERN.test(payload.BuyerDtls.Gstin)) {
    errors.push('Customer GSTIN must be a valid 15-character GSTIN');
  }
  if (payload.ItemList.length === 0) {
    errors.push('At least one line item required');
  }
  for (const it of payload.ItemList) {
    if (!it.HsnCd || it.HsnCd.length < 4) {
      errors.push(`HSN code missing or too short for line ${it.SlNo}`);
    }
  }
  const lineSum = payload.ItemList.reduce((s, it) => s + it.TotItemVal, 0);
  if (Math.abs(lineSum - payload.ValDtls.TotInvVal) > 1) {
    errors.push(`Line item total (${lineSum.toFixed(2)}) must match invoice total (${payload.ValDtls.TotInvVal.toFixed(2)}) within ₹1`);
  }
  return errors;
}

function makeSyntheticIRN(): string {
  const chars = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 64; i += 1) {
    out += chars[Math.floor(Math.random() * 16)];
  }
  return out;
}

/**
 * Generate IRN. Stub returns a synthetic record with realistic shape.
 * Real implementation:
 *   const url = creds.test_mode
 *     ? 'https://einv-apisandbox.nic.in/eivital/v1.04/Invoice'
 *     : 'https://einvoice1.gst.gov.in/eivital/v1.04/Invoice';
 *   const res = await fetch(url, { method: 'POST', headers: {...}, body: JSON.stringify(payload) });
 */
export async function generateIRN(
  payload: IRPPayload,
  creds: IRPCredentials,
  voucher: Voucher,
  entityCode: string,
): Promise<IRNRecord> {
  // [JWT] POST IRP /eivital/v1.04/Invoice with auth token from creds
  void creds;
  await new Promise(r => setTimeout(r, 800));
  const errors = validateIRNPayload(payload);
  const now = new Date().toISOString();
  if (errors.length > 0) {
    return {
      id: `irn-${Date.now()}`,
      entity_id: entityCode,
      voucher_id: voucher.id,
      voucher_no: voucher.voucher_no,
      voucher_date: voucher.date,
      voucher_type: voucher.voucher_type_name,
      supplier_gstin: payload.SellerDtls.Gstin,
      customer_gstin: payload.BuyerDtls.Gstin,
      customer_name: payload.BuyerDtls.LglNm,
      total_invoice_value: voucher.net_amount,
      total_taxable_value: voucher.total_taxable,
      total_cgst: voucher.total_cgst,
      total_sgst: voucher.total_sgst,
      total_igst: voucher.total_igst,
      irn: null, ack_no: null, ack_date: null,
      signed_invoice: null, signed_qr_code: null, qr_code_url: null,
      status: 'failed',
      error_code: '2150',
      error_message: errors.join('; '),
      cancellation_reason: null, cancellation_remarks: null,
      cancelled_at: null, cancelled_by: null,
      generated_by: 'current-user', generated_at: null,
      created_at: now, updated_at: now,
    };
  }

  const irn = makeSyntheticIRN();
  const ackNo = String(Math.floor(Math.random() * 1e14)).padStart(14, '0');
  // Audit fix #7: signed QR is a JWS (~700 chars) carrying SellerGstin, BuyerGstin,
  // DocNo, DocDt, TotInvVal, ItemCnt, MainHsnCode, IRN, IRN date.
  const qrPayload = JSON.stringify({
    SellerGstin: payload.SellerDtls.Gstin,
    BuyerGstin: payload.BuyerDtls.Gstin,
    DocNo: payload.DocDtls.No,
    DocTyp: payload.DocDtls.Typ,
    DocDt: payload.DocDtls.Dt,
    TotInvVal: payload.ValDtls.TotInvVal,
    ItemCnt: payload.ItemList.length,
    MainHsnCode: payload.ItemList[0]?.HsnCd ?? '',
    Irn: irn,
    IrnDt: now,
  });
  const qrHeader = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'NIC-IRP-2024' }));
  // Synthetic 384-char base64 signature segment to mirror real JWS length.
  let qrSig = '';
  const sigChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  for (let i = 0; i < 384; i += 1) qrSig += sigChars[Math.floor(Math.random() * sigChars.length)];
  const signedQr = `${qrHeader}.${btoa(qrPayload)}.${qrSig}`;
  return {
    id: `irn-${Date.now()}`,
    entity_id: entityCode,
    voucher_id: voucher.id,
    voucher_no: voucher.voucher_no,
    voucher_date: voucher.date,
    voucher_type: voucher.voucher_type_name,
    supplier_gstin: payload.SellerDtls.Gstin,
    customer_gstin: payload.BuyerDtls.Gstin,
    customer_name: payload.BuyerDtls.LglNm,
    total_invoice_value: voucher.net_amount,
    total_taxable_value: voucher.total_taxable,
    total_cgst: voucher.total_cgst,
    total_sgst: voucher.total_sgst,
    total_igst: voucher.total_igst,
    irn,
    ack_no: ackNo,
    ack_date: now,
    signed_invoice: `${qrHeader}.${btoa(JSON.stringify({ irn, ackNo, payload }))}.${qrSig}`,
    signed_qr_code: signedQr,
    qr_code_url: null,
    status: 'generated',
    error_code: null, error_message: null,
    cancellation_reason: null, cancellation_remarks: null,
    cancelled_at: null, cancelled_by: null,
    generated_by: 'current-user', generated_at: now,
    created_at: now, updated_at: now,
  };
}

/** Cancel IRN within 24h window. Stub returns the cancellation patch. */
export async function cancelIRN(
  irn: string,
  reasonCode: string,
  remarks: string,
  creds: IRPCredentials,
): Promise<Partial<IRNRecord>> {
  // [JWT] POST IRP /eicore/v1.03/Invoice/Cancel
  void irn; void creds;
  await new Promise(r => setTimeout(r, 600));
  const now = new Date().toISOString();
  return {
    status: 'cancelled',
    cancellation_reason: reasonCode,
    cancellation_remarks: remarks,
    cancelled_at: now,
    cancelled_by: 'current-user',
    updated_at: now,
  };
}
