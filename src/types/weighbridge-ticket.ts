/**
 * @file        weighbridge-ticket.ts
 * @sprint      T-Phase-1.2.6f-d-2-card4-4-pre-2 · Block A · D-306
 * @purpose     Weighbridge Ticket type · 5-state two-weigh workflow (Q5=A)
 *              · MANUAL ticket entry + photo proof (Q1=A) · NO hardware in MVP.
 *              [JWT] erp_weighbridge_tickets_<entityCode>
 * @decisions   D-306 (manual+photo · 5-state) · D-308 (numbering 'WB' prefix)
 *              · D-309 (gate_pass FK required)
 */

export type WeighbridgeTicketStatus =
  | 'pending_in'    // Vehicle approached · awaiting first weigh
  | 'weighed_in'    // First weigh done · vehicle proceeded
  | 'pending_out'   // Vehicle returned · awaiting second weigh
  | 'weighed_out'   // Second weigh done · ticket complete (awaiting close)
  | 'closed';       // Ticket finalized · audit-locked

export interface WeighbridgeTicket {
  id: string;
  ticket_no: string;                    // 'WB/${entity}/${YY-YY}/0001' (D-308)
  entity_id: string;
  entity_code: string;
  status: WeighbridgeTicketStatus;

  // Linked gate pass (FK · required)
  gate_pass_id: string;
  gate_pass_no: string;
  direction: 'inward' | 'outward';

  // Vehicle reference
  vehicle_no: string;
  vehicle_id?: string;                  // optional FK to vehicle-master

  // First weigh (in)
  gross_in_kg?: number;
  tare_in_kg?: number;
  net_in_kg?: number;                   // computed gross - tare
  weighed_in_at?: string;
  in_photo_url?: string;                // weighbridge display photo via camera-bridge
  in_operator_user_id?: string;

  // Second weigh (out)
  gross_out_kg?: number;
  tare_out_kg?: number;
  net_dispatched_kg?: number;           // |gross_out - gross_in|
  weighed_out_at?: string;
  out_photo_url?: string;
  out_operator_user_id?: string;

  // Variance (computed at close)
  variance_kg?: number;
  variance_pct?: number;
  variance_remarks?: string;

  // Audit
  weighbridge_serial?: string;          // manual ID of weighbridge machine
  remarks?: string;
  created_at: string;
  created_by_user_id: string;
  updated_at: string;
  closed_at?: string;
  closed_by_user_id?: string;
}

export const weighbridgeTicketsKey = (entityCode: string): string =>
  `erp_weighbridge_tickets_${entityCode}`;
