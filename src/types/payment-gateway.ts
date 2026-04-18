/**
 * payment-gateway.ts — Unified payment gateway types
 * Sprint 8. Supports Razorpay, PayU, Cashfree — pluggable via provider field.
 * [JWT] POST /api/payment-gateway/create-order
 * [JWT] POST /api/payment-gateway/webhook
 */

export type GatewayProvider = 'razorpay' | 'payu' | 'cashfree' | 'upi_intent_only';

export type PaymentStatus =
  | 'created' | 'pending' | 'paid' | 'failed' | 'expired' | 'refunded' | 'cancelled';

export interface PaymentLinkRecord {
  id: string;
  entity_id: string;
  ref_voucher_id: string;
  ref_voucher_no: string;
  party_id: string;
  party_name: string;
  amount: number;
  currency: string;
  provider: GatewayProvider;
  provider_order_id: string | null;
  link_url: string;
  upi_intent_uri: string | null;
  qr_data_url: string | null;
  status: PaymentStatus;
  paid_at: string | null;
  paid_amount: number | null;
  provider_payment_id: string | null;
  receipt_voucher_id: string | null;
  expiry_at: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GatewayCredentials {
  provider: GatewayProvider;
  key_id: string;
  key_secret: string;
  webhook_secret: string;
  is_test_mode: boolean;
  merchant_vpa: string | null;
  merchant_name: string | null;
}

export interface PaymentRequest {
  ref_voucher_id: string;
  ref_voucher_no: string;
  party_id: string;
  party_name: string;
  party_phone: string | null;
  party_email: string | null;
  amount: number;
  narration: string;
  expiry_days: number;
}

export interface PaymentResponse {
  success: boolean;
  record: PaymentLinkRecord | null;
  error: string | null;
}

export const paymentLinksKey = (e: string) => `erp_payment_links_${e}`;

export const PROVIDER_LABELS: Record<GatewayProvider, string> = {
  razorpay: 'Razorpay',
  payu: 'PayU',
  cashfree: 'Cashfree',
  upi_intent_only: 'UPI Intent (no gateway)',
};
