/**
 * pod.ts — Proof of Delivery entity
 * Captured on OperixGo mobile when driver delivers the goods.
 * [JWT] GET/POST /api/dispatch/pods
 */

export type PODStatus = 'pending' | 'captured' | 'verified' | 'disputed' | 'rejected';

export type POVerificationMethod = 'gps' | 'photo' | 'signature' | 'otp' | 'receiver_id';

export interface PODConsignee {
  name: string;
  designation?: string;
  mobile?: string;
  id_type?: 'aadhaar' | 'dl' | 'employee_id' | 'visiting_card' | 'other';
  id_last4?: string;
}

export type PODExceptionType = 'damage' | 'short_qty' | 'wrong_item' | 'refused' | 'other';

export interface POD {
  id: string;
  entity_id: string;
  dln_voucher_id: string;
  dln_voucher_no: string;

  captured_at: string;
  captured_by: string;

  // GPS proof
  gps_latitude: number | null;
  gps_longitude: number | null;
  gps_accuracy_m: number | null;
  gps_timestamp: string | null;
  ship_to_latitude: number | null;
  ship_to_longitude: number | null;
  distance_from_ship_to_m: number | null;
  gps_verified: boolean;

  // Photo proof
  photo_data_url?: string;
  photo_size_bytes?: number;
  photo_verified: boolean;

  // Signature proof (SVG path data)
  signature_svg?: string;
  signature_verified: boolean;

  // OTP proof
  otp_sent_to_mobile?: string;
  otp_verified: boolean;
  otp_verified_at?: string;

  // Receiver
  consignee: PODConsignee;

  // Status
  status: PODStatus;
  dispute_reason?: string | null;

  // Exception tracking
  is_exception: boolean;
  exception_type?: PODExceptionType;
  exception_notes?: string;

  created_at: string;
  updated_at: string;
}

export const podsKey = (e: string) => `erp_pods_${e}`;

export const POD_REQUIRED_PROOFS: POVerificationMethod[] = [
  'gps', 'photo', 'signature', 'otp',
];

export const POD_DISTANCE_VARIANCE_THRESHOLD_M = 500;
