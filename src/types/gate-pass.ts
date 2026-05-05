/**
 * @file        gate-pass.ts
 * @sprint      T-Phase-1.2.6f-d-2-card4-4-pre-1 · Block A · per D-302 · D-305
 * @purpose     Gate Pass type · single type with direction discriminator (Q2=A) · 5-state workflow (Q4=A)
 *              · optional FK linking (Q3=A) · matches FineCore voucher pattern.
 *              [JWT] erp_gate_passes_<entityCode>
 * @decisions   D-302 (single type · direction discriminator · 5-state workflow · optional FK)
 *              · D-305 (storage key namespace)
 * @reuses      None (new) · references types/po · types/git · types/voucher (read-only · for linked_voucher_type)
 */

export type GatePassDirection = 'inward' | 'outward';

export type GatePassStatus =
  | 'pending'      // Gate guard creates entry · awaiting verification
  | 'verified'     // Security verified driver/docs · vehicle approved to enter
  | 'in_progress'  // Vehicle inside premises · being unloaded/loaded
  | 'partial'      // Inward partial-receipt scenario (matches GIT 3-c-1 pattern)
  | 'completed'    // Vehicle exited · gate pass closed
  | 'cancelled';   // Entry rejected/aborted

export type LinkedVoucherType =
  | 'po'           // Purchase Order (Procure360 · 3-c-1)
  | 'git_stage1'   // GIT Stage 1 (3-c-1 · received_at_gate)
  | 'dln'          // Delivery Note (FineCore voucher)
  | 'som'          // Sample Outward Memo (Dispatch)
  | 'dom'          // Demo Outward Memo (Dispatch)
  | 'gst_invoice'      // GST Invoice (FineCore)
  | 'inward_receipt'   // Inward Receipt (Card #6 · 6-pre-1 · Block E bridge)
  | null;              // Walk-in · visitor · service vendor · ad-hoc

export interface GatePass {
  id: string;
  gate_pass_no: string;             // 'GP/${entity}/${YY-YY}/0001' (Q5=A · finecore generateDocNo)
  direction: GatePassDirection;
  entity_id: string;
  entity_code: string;
  status: GatePassStatus;

  // Vehicle + Driver
  vehicle_no: string;               // e.g., 'KA-01-AB-1234'
  vehicle_type: string;             // 'truck' · 'van' · 'tempo' · 'car' · 'two-wheeler' · 'walk-in'
  driver_name: string;
  driver_phone: string;
  driver_license_no?: string;

  // Linked voucher (optional FK · Q3=A)
  linked_voucher_type: LinkedVoucherType;
  linked_voucher_id?: string;
  linked_voucher_no?: string;       // human-readable (for display in queue)

  // Counterparty (inward = vendor · outward = customer)
  counterparty_name: string;        // vendor or customer name (free-text if walk-in)
  counterparty_id?: string;

  // Timing
  entry_time: string;               // ISO · when vehicle arrived at gate
  verified_time?: string;           // ISO · when security verified
  in_progress_time?: string;        // ISO · when entered premises
  exit_time?: string;               // ISO · when vehicle left

  // Purpose + remarks
  purpose: string;
  remarks?: string;

  // Verification
  verified_by_user_id?: string;
  verified_by_name?: string;

  // Sprint 4-pre-2 · Block E · D-307 (master FKs) · D-310 (ANPR)
  vehicle_id?: string;                    // optional FK to vehicle-master · existing vehicle_no preserved as fallback
  driver_id?: string;                     // optional FK to driver-master · existing driver_name preserved as fallback
  weighbridge_in_ticket_id?: string;      // FK to weighbridge-ticket (first weigh)
  weighbridge_out_ticket_id?: string;     // FK to weighbridge-ticket (second weigh)
  anpr_image_url?: string;                // ANPR camera capture · captured at gate entry · manual verify

  // Sprint 4-pre-3 · Block A · D-313 (Q3=A · POD pre-stage capture)
  // 3 NEW nullable image fields · matches D-291 additive precedent · existing fields preserved
  pod_image_urls?: string[];              // multi-image · vehicle/load photos · inward + outward
  driver_license_image_url?: string;      // license document photo · captured once at Step 2
  vehicle_inspection_image_url?: string;  // overall vehicle photo at gate · Step 4

  // Audit
  created_at: string;
  created_by_user_id: string;
  updated_at: string;
}

export const gatePassesKey = (entityCode: string): string => `erp_gate_passes_${entityCode}`;
