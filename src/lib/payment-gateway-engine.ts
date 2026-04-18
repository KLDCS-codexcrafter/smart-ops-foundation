/**
 * payment-gateway-engine.ts — Pure payment gateway abstraction
 * Sprint 8. 3 drivers + UPI intent fallback.
 * Pure — no localStorage, no React, no toast.
 */

import type {
  GatewayProvider, PaymentRequest, PaymentResponse,
  PaymentLinkRecord, GatewayCredentials,
} from '@/types/payment-gateway';

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function daysFromNowISO(n: number): string {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString();
}

/** Razorpay driver — stub. Replace with real Razorpay Payment Links API when backend lands. */
function razorpayCreate(
  req: PaymentRequest, creds: GatewayCredentials, expiryDays: number,
): PaymentLinkRecord {
  // [JWT] POST https://api.razorpay.com/v1/payment_links with Basic Auth
  const orderId = `rzp_order_${makeId('rzp')}`;
  const linkId = `plink_${makeId('link')}`;
  return {
    id: linkId, entity_id: '',
    ref_voucher_id: req.ref_voucher_id, ref_voucher_no: req.ref_voucher_no,
    party_id: req.party_id, party_name: req.party_name,
    amount: req.amount, currency: 'INR',
    provider: 'razorpay', provider_order_id: orderId,
    link_url: `https://rzp.io/i/${linkId}`,
    upi_intent_uri: buildUpiIntent(req.amount, req.narration, creds.merchant_vpa, creds.merchant_name),
    qr_data_url: null,
    status: 'created', paid_at: null, paid_amount: null,
    provider_payment_id: null, receipt_voucher_id: null,
    expiry_at: daysFromNowISO(expiryDays),
    created_by: 'system',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
}

/** PayU driver — stub. Real endpoint: https://info.payu.in/merchant/postservice?form=2 */
function payuCreate(
  req: PaymentRequest, creds: GatewayCredentials, expiryDays: number,
): PaymentLinkRecord {
  // [JWT] POST https://info.payu.in/merchant/postservice?form=2 (create_invoice)
  const txnid = `payu_${makeId('txn')}`;
  return {
    id: makeId('plink'), entity_id: '',
    ref_voucher_id: req.ref_voucher_id, ref_voucher_no: req.ref_voucher_no,
    party_id: req.party_id, party_name: req.party_name,
    amount: req.amount, currency: 'INR',
    provider: 'payu', provider_order_id: txnid,
    link_url: `https://pay.payu.in/invoice/${txnid}`,
    upi_intent_uri: buildUpiIntent(req.amount, req.narration, creds.merchant_vpa, creds.merchant_name),
    qr_data_url: null,
    status: 'created', paid_at: null, paid_amount: null,
    provider_payment_id: null, receipt_voucher_id: null,
    expiry_at: daysFromNowISO(expiryDays),
    created_by: 'system',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
}

/** Cashfree driver — stub. Real endpoint: https://api.cashfree.com/pg/links */
function cashfreeCreate(
  req: PaymentRequest, creds: GatewayCredentials, expiryDays: number,
): PaymentLinkRecord {
  // [JWT] POST https://api.cashfree.com/pg/links
  const linkId = `cf_${makeId('cf')}`;
  return {
    id: makeId('plink'), entity_id: '',
    ref_voucher_id: req.ref_voucher_id, ref_voucher_no: req.ref_voucher_no,
    party_id: req.party_id, party_name: req.party_name,
    amount: req.amount, currency: 'INR',
    provider: 'cashfree', provider_order_id: linkId,
    link_url: `https://payments.cashfree.com/forms/${linkId}`,
    upi_intent_uri: buildUpiIntent(req.amount, req.narration, creds.merchant_vpa, creds.merchant_name),
    qr_data_url: null,
    status: 'created', paid_at: null, paid_amount: null,
    provider_payment_id: null, receipt_voucher_id: null,
    expiry_at: daysFromNowISO(expiryDays),
    created_by: 'system',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
}

/** UPI intent only — zero-cost fallback. Builds a upi:// URI. */
function upiIntentCreate(
  req: PaymentRequest, creds: GatewayCredentials, expiryDays: number,
): PaymentLinkRecord {
  const uri = buildUpiIntent(req.amount, req.narration, creds.merchant_vpa, creds.merchant_name);
  return {
    id: makeId('plink'), entity_id: '',
    ref_voucher_id: req.ref_voucher_id, ref_voucher_no: req.ref_voucher_no,
    party_id: req.party_id, party_name: req.party_name,
    amount: req.amount, currency: 'INR',
    provider: 'upi_intent_only', provider_order_id: null,
    link_url: uri || '',
    upi_intent_uri: uri,
    qr_data_url: null,
    status: 'created', paid_at: null, paid_amount: null,
    provider_payment_id: null, receipt_voucher_id: null,
    expiry_at: daysFromNowISO(expiryDays),
    created_by: 'system',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
}

/** Build a UPI intent URI. Returns null if merchant VPA is not configured. */
export function buildUpiIntent(
  amount: number, narration: string,
  merchantVpa: string | null, merchantName: string | null,
): string | null {
  if (!merchantVpa || !merchantName) return null;
  const params = new URLSearchParams({
    pa: merchantVpa,
    pn: merchantName,
    am: amount.toFixed(2),
    tn: narration.slice(0, 50),
    cu: 'INR',
  });
  return `upi://pay?${params.toString()}`;
}

/** Build a WhatsApp share URL with payment link in the message body. */
export function buildWaMePaymentMessage(
  partyPhone: string, record: PaymentLinkRecord,
): string {
  const msg = `Dear ${record.party_name}, please pay INR ${record.amount.toLocaleString('en-IN')} for invoice ${record.ref_voucher_no}. Pay link: ${record.link_url}`;
  const phone = partyPhone.replace(/\D/g, '');
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

/** Main entry — dispatch to the right driver. */
export function createPaymentRequest(
  req: PaymentRequest,
  provider: GatewayProvider,
  creds: GatewayCredentials,
  expiryDays: number = 7,
): PaymentResponse {
  try {
    let record: PaymentLinkRecord;
    switch (provider) {
      case 'razorpay':         record = razorpayCreate(req, creds, expiryDays); break;
      case 'payu':             record = payuCreate(req, creds, expiryDays); break;
      case 'cashfree':         record = cashfreeCreate(req, creds, expiryDays); break;
      case 'upi_intent_only':  record = upiIntentCreate(req, creds, expiryDays); break;
      default: return { success: false, record: null, error: `Unknown provider: ${provider}` };
    }
    return { success: true, record, error: null };
  } catch (err) {
    return { success: false, record: null, error: (err as Error).message };
  }
}

/** Webhook parser — each provider signs differently. Pure function (stub). */
export function parseGatewayWebhook(
  provider: GatewayProvider, payload: unknown, signature: string, secret: string,
): { paid: boolean; order_id: string | null; payment_id: string | null; amount: number | null } {
  // [JWT] validate webhook signature per provider (HMAC-SHA256 for Razorpay, etc.)
  void provider; void payload; void signature; void secret;
  return { paid: false, order_id: null, payment_id: null, amount: null };
}
