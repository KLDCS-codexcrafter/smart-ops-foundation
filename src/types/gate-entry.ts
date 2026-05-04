/**
 * @file        gate-entry.ts
 * @sprint      T-Phase-1.2.6f-d-2-card4-4-pre-1 · Block A · per D-302 · D-305
 * @purpose     Gate Entry · pre-pass log of arrivals (rough log).
 *              GateEntry is the rough log of arrivals at gate · GatePass is the formal authorization.
 *              Many GateEntries may not become GatePasses (e.g., visitor walks away · turned back at security).
 *              [JWT] erp_gate_entries_<entityCode>
 * @decisions   D-305 (separate storage from GatePass · cleaner query separation)
 * @reuses      None (new)
 */

export type GateEntryOutcome =
  | 'pending'           // Just logged · awaiting decision
  | 'promoted_to_pass'  // GatePass created from this entry
  | 'turned_back'       // Refused entry
  | 'no_show';          // Logged but no follow-up after timeout

export interface GateEntry {
  id: string;
  entity_id: string;
  entity_code: string;
  entry_time: string;
  vehicle_no?: string;
  visitor_name?: string;
  purpose: string;
  outcome: GateEntryOutcome;
  promoted_gate_pass_id?: string;
  remarks?: string;
  logged_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export const gateEntriesKey = (entityCode: string): string => `erp_gate_entries_${entityCode}`;
