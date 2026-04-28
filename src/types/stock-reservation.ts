/**
 * stock-reservation.ts — Soft-hold reservations for SalesX
 * Sprint T-Phase-1.1.1m · Operix MOAT #19 · D-186
 *
 * Phase 1: localStorage · Phase 2: real inventory API
 *
 * Reservation levels (per D-186 founder Input 2 v5-pre):
 *   Level A · quote-level (24-48h soft hold) — created when Quotation is saved
 *   Level B · order-level (until invoice/delivery hard hold) — created when SO is confirmed
 *   Level C · batch/serial-level — deferred to Phase 1.3 Make (serial/batch core)
 *
 * D-127/D-128: This type never touches voucher.ts or voucher-type.ts.
 * [JWT] GET/POST/PATCH /api/inventory/reservations
 */

export type ReservationLevel = 'quote' | 'order';
export type ReservationStatus = 'active' | 'released' | 'expired';

export interface StockReservation {
  id: string;
  entity_id: string;
  item_name: string;         // Phase 1: match by name (Phase 2: item_id FK)
  reserved_qty: number;
  level: ReservationLevel;
  status: ReservationStatus;
  source_type: 'quotation' | 'sales_order' | 'supply_request_memo';
  source_id: string;
  source_no: string;
  customer_name: string | null;
  salesman_name: string | null;
  reserved_at: string;
  expires_at: string | null;  // null = order-level (no expiry until fulfillment)
  released_at: string | null;
  created_at: string;
  updated_at: string;
}

export const stockReservationsKey = (e: string) => `erp_stock_reservations_${e}`;

export const QUOTE_RESERVATION_TTL_MS = 48 * 60 * 60 * 1000; // 48h
