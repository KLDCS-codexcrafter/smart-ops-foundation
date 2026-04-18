/**
 * ewb-engine.ts — Pure NIC E-Way Bill API abstraction
 * Sprint 9. Generates synthetic EWBRecord in test mode.
 *
 * No localStorage / no React / no toast.
 */

import type { Voucher } from '@/types/voucher';
import type {
  EWBRecord, EWBSubSupplyType, EWBTransportMode, EWBSupplyType, EWBDocType,
} from '@/types/irn';

export interface EWBCredentials {
  username: string;
  password: string;
  test_mode: boolean;
}

export interface EWBContext {
  voucher: Voucher;
  irn: string | null;
  supplier_gstin: string;
  supplier_state_code: string;
  supplier_address: string;
  customer_gstin: string;
  customer_state_code: string;
  customer_address: string;
  transporter_id: string | null;
  transporter_name: string | null;
  vehicle_no: string | null;
  vehicle_type: 'regular' | 'odc';
  transport_mode: EWBTransportMode;
  transport_distance_km: number;
  sub_supply_type: EWBSubSupplyType;
  doc_type: EWBDocType;
  supply_type: EWBSupplyType;
}

export interface EWBPayload {
  supplyType: EWBSupplyType;
  subSupplyType: EWBSubSupplyType;
  docType: EWBDocType;
  docNo: string;
  docDate: string;
  fromGstin: string;
  fromAddr1: string;
  fromStateCode: string;
  toGstin: string;
  toAddr1: string;
  toStateCode: string;
  totalValue: number;
  transMode: EWBTransportMode;
  transDistance: number;
  transporterId: string | null;
  transporterName: string | null;
  vehicleNo: string | null;
  vehicleType: 'regular' | 'odc';
}

const VEHICLE_PATTERN = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/;

/** EWB required when interstate AND total > threshold. */
export function isEWBRequired(
  totalValue: number,
  supplierStateCode: string,
  customerStateCode: string,
  threshold: number,
): boolean {
  if (totalValue <= threshold) return false;
  return supplierStateCode !== customerStateCode;
}

export function buildEWBPayload(ctx: EWBContext): EWBPayload {
  return {
    supplyType: ctx.supply_type,
    subSupplyType: ctx.sub_supply_type,
    docType: ctx.doc_type,
    docNo: ctx.voucher.voucher_no,
    docDate: ctx.voucher.date,
    fromGstin: ctx.supplier_gstin,
    fromAddr1: ctx.supplier_address || 'NA',
    fromStateCode: ctx.supplier_state_code,
    toGstin: ctx.customer_gstin,
    toAddr1: ctx.customer_address || 'NA',
    toStateCode: ctx.customer_state_code,
    totalValue: ctx.voucher.net_amount,
    transMode: ctx.transport_mode,
    transDistance: ctx.transport_distance_km,
    transporterId: ctx.transporter_id,
    transporterName: ctx.transporter_name,
    vehicleNo: ctx.vehicle_no,
    vehicleType: ctx.vehicle_type,
  };
}

export function validateEWBPayload(payload: EWBPayload): string[] {
  const errors: string[] = [];
  if (!payload.docNo) errors.push('Document number required');
  if (payload.totalValue <= 0) errors.push('Total value must be positive');
  if (payload.transDistance <= 0) errors.push('Transport distance required');
  if (payload.transMode === 'road' && payload.vehicleNo) {
    if (!VEHICLE_PATTERN.test(payload.vehicleNo)) {
      errors.push('Vehicle number must match format e.g. MH12AB1234');
    }
  }
  return errors;
}

/** 1 day per 200km, round up. <200km = 1 day. */
export function computeEWBValidity(distanceKm: number, generatedAtIso: string): string {
  const days = Math.max(1, Math.ceil(distanceKm / 200));
  const d = new Date(generatedAtIso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function makeEWBNo(): string {
  return String(Math.floor(Math.random() * 1e12)).padStart(12, '0');
}

export async function generateEWB(
  payload: EWBPayload,
  creds: EWBCredentials,
  ctx: EWBContext,
  entityCode: string,
): Promise<EWBRecord> {
  // [JWT] POST EWB /ewbapi/v1.03/ewayapi (NIC sandbox/production)
  void creds;
  await new Promise(r => setTimeout(r, 700));
  const errors = validateEWBPayload(payload);
  const now = new Date().toISOString();

  const baseRecord: EWBRecord = {
    id: `ewb-${Date.now()}`,
    entity_id: entityCode,
    voucher_id: ctx.voucher.id,
    voucher_no: ctx.voucher.voucher_no,
    voucher_date: ctx.voucher.date,
    irn: ctx.irn,
    supply_type: ctx.supply_type,
    sub_supply_type: ctx.sub_supply_type,
    doc_type: ctx.doc_type,
    transport_mode: ctx.transport_mode,
    transport_distance_km: ctx.transport_distance_km,
    transporter_id: ctx.transporter_id,
    transporter_name: ctx.transporter_name,
    vehicle_no: ctx.vehicle_no,
    vehicle_type: ctx.vehicle_type,
    transport_doc_no: null,
    transport_doc_date: null,
    dispatch_gstin: ctx.supplier_gstin,
    dispatch_addr: ctx.supplier_address,
    dispatch_state_code: ctx.supplier_state_code,
    ship_to_gstin: ctx.customer_gstin,
    ship_to_addr: ctx.customer_address,
    ship_to_state_code: ctx.customer_state_code,
    total_value: ctx.voucher.net_amount,
    ewb_no: null,
    ewb_date: null,
    valid_until: null,
    status: 'pending',
    error_code: null,
    error_message: null,
    cancellation_reason: null,
    cancellation_remarks: null,
    cancelled_at: null,
    cancelled_by: null,
    extended_at: null,
    extension_reason: null,
    extended_valid_until: null,
    generated_by: 'current-user',
    generated_at: null,
    created_at: now,
    updated_at: now,
  };

  if (errors.length > 0) {
    return { ...baseRecord, status: 'pending', error_code: '4001', error_message: errors.join('; ') };
  }

  const ewbNo = makeEWBNo();
  const validUntil = computeEWBValidity(ctx.transport_distance_km, now);
  return {
    ...baseRecord,
    ewb_no: ewbNo,
    ewb_date: now,
    valid_until: validUntil,
    status: 'generated',
    generated_at: now,
  };
}

export async function cancelEWB(
  ewbNo: string,
  reasonCode: string,
  remarks: string,
  creds: EWBCredentials,
): Promise<Partial<EWBRecord>> {
  // [JWT] POST EWB /ewbapi/v1.03/canewb
  void ewbNo; void creds;
  await new Promise(r => setTimeout(r, 500));
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

export async function extendEWB(
  ewbNo: string,
  reasonCode: string,
  additionalKm: number,
  newVehicleNo: string | null,
  creds: EWBCredentials,
): Promise<Partial<EWBRecord>> {
  // [JWT] POST EWB /ewbapi/v1.03/extendvalidity
  void ewbNo; void creds;
  await new Promise(r => setTimeout(r, 500));
  const now = new Date().toISOString();
  const newValid = computeEWBValidity(additionalKm, now);
  return {
    status: 'extended',
    extended_at: now,
    extension_reason: reasonCode,
    extended_valid_until: newValid,
    valid_until: newValid,
    vehicle_no: newVehicleNo ?? null,
    updated_at: now,
  };
}
