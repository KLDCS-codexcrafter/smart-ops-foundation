/**
 * pod-engine.ts — Pure helpers for POD capture and verification.
 */

import type { POD, PODStatus, POVerificationMethod } from '@/types/pod';
import { POD_DISTANCE_VARIANCE_THRESHOLD_M } from '@/types/pod';

export function haversineDistanceMeters(
  lat1: number, lon1: number, lat2: number, lon2: number,
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export interface POVerificationResult {
  verified: boolean;
  missing: POVerificationMethod[];
  distance_warning: boolean;
  distance_m: number | null;
}

export function verifyPOD(pod: POD): POVerificationResult {
  const missing: POVerificationMethod[] = [];
  if (!pod.gps_verified) missing.push('gps');
  if (!pod.photo_verified) missing.push('photo');
  if (!pod.signature_verified) missing.push('signature');
  if (!pod.otp_verified) missing.push('otp');

  let distanceM: number | null = null;
  let distanceWarning = false;
  if (
    pod.gps_latitude != null && pod.gps_longitude != null &&
    pod.ship_to_latitude != null && pod.ship_to_longitude != null
  ) {
    distanceM = haversineDistanceMeters(
      pod.gps_latitude, pod.gps_longitude,
      pod.ship_to_latitude, pod.ship_to_longitude,
    );
    distanceWarning = distanceM > POD_DISTANCE_VARIANCE_THRESHOLD_M;
  }

  return {
    verified: missing.length === 0 && !distanceWarning,
    missing,
    distance_warning: distanceWarning,
    distance_m: distanceM,
  };
}

/** Generate a 6-digit OTP. Production: SMS gateway integration. */
export function generateOTP(): string {
  return String(Math.floor(100_000 + Math.random() * 900_000));
}

/** Mask a mobile number for display. 9876543210 -> 98XXXXX210 */
export function maskMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  if (digits.length < 7) return mobile;
  return digits.slice(0, 2) + 'X'.repeat(digits.length - 5) + digits.slice(-3);
}

export function createEmptyPOD(
  dlnVoucherId: string, dlnVoucherNo: string, entityCode: string,
  capturedBy: string, shipToLat: number | null, shipToLng: number | null,
): POD {
  const now = new Date().toISOString();
  return {
    id: `pod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    entity_id: entityCode,
    dln_voucher_id: dlnVoucherId,
    dln_voucher_no: dlnVoucherNo,
    captured_at: now,
    captured_by: capturedBy,
    gps_latitude: null, gps_longitude: null,
    gps_accuracy_m: null, gps_timestamp: null,
    ship_to_latitude: shipToLat, ship_to_longitude: shipToLng,
    distance_from_ship_to_m: null, gps_verified: false,
    photo_verified: false, signature_verified: false, otp_verified: false,
    consignee: { name: '' },
    status: 'pending', is_exception: false,
    created_at: now, updated_at: now,
  };
}

export function statusLabel(s: PODStatus): string {
  return {
    pending: 'Pending Capture',
    captured: 'Captured',
    verified: 'Verified',
    disputed: 'Disputed',
    rejected: 'Rejected',
  }[s];
}
