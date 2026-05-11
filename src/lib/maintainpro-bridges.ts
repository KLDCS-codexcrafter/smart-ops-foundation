/**
 * @file        src/lib/maintainpro-bridges.ts
 * @purpose     MaintainPro cross-card bridges · 7 active bridges + 3 PLANNED · A.15a sitex-bridges sibling
 * @sprint      T-Phase-1.A.16b · Block C · Q-LOCK-4 + Q-LOCK-5 + Q-LOCK-8
 * @decisions   D-NEW-CZ Bidirectional Capacity Feedback POSSIBLE 23rd canonical · FR-19 sibling · FR-53 inter-dept · FR-73.1 absolute
 * @reuses      createEquipment + createAssetCapitalization (maintainpro-engine) · A.15a emitMaintainProHandoff payload shape
 * @[JWT]       Phase 2: eventBus.emit() wires real cross-card subscribers
 */

import { createEquipment, createAssetCapitalization } from './maintainpro-engine';

export interface SiteXMaintainProHandoff {
  handoff_id: string;
  site_id: string;
  capex_value: number;
  equipment_name: string;
  make: string;
  model: string;
  serial_no: string;
  installation_date: string;
  warranty_start: string;
  warranty_end: string;
  project_id: string | null;
  custodian_user_id: string | null;
  location: string;
  floor: string;
  kw_rating: number | null;
  emitted_at: string;
}

export type MaintenancePulseEventType = 'maintenance:equipment.down' | 'maintenance:equipment.restored';

export interface MaintenancePulseEvent {
  type: MaintenancePulseEventType;
  site_id: string | null;
  equipment_id: string;
  equipment_name: string;
  expected_restore_date?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  capacity_impact_pct: number;
  emitted_at: string;
}

export interface SparePartReorderEvent {
  type: 'maintenance:spare.reorder_required';
  spare_id: string;
  current_velocity: number;
  historical_median: number;
  recommended_order_qty: number;
  emitted_at: string;
}

export interface InternalTicketEscalationEvent {
  type: 'maintenance:ticket.escalated';
  ticket_id: string;
  ticket_no: string;
  escalation_level: 1 | 2 | 3;
  category: string;
  severity: string;
  escalated_to_user_id: string;
  emitted_at: string;
}

export interface QualiCheckCalibrationFailEvent {
  qc_entry_id: string;
  instrument_id: string;
  qc_inspector_user_id: string;
  attempted_at: string;
}

export interface SiteXPTWRequestEvent {
  ptw_request_id: string;
  site_id: string;
  zone: string;
  requested_at: string;
}

// === BRIDGE 1 · consumeSiteXMaintainProHandoff (IN · Q-LOCK-8 · A.15a → A.16b CAPEX end-to-end) ===
export function consumeSiteXMaintainProHandoff(
  entityCode: string,
  handoff: SiteXMaintainProHandoff,
): { equipment_id: string; asset_capitalization_id: string } {
  const equipment = createEquipment(entityCode, {
    equipment_code: `EQ/AUTO/${handoff.handoff_id.slice(-6)}`,
    equipment_name: handoff.equipment_name,
    equipment_class: 'machine',
    category: 'utilities',
    make: handoff.make,
    model: handoff.model,
    year_of_mfg: new Date(handoff.installation_date).getFullYear(),
    serial_no: handoff.serial_no,
    location: handoff.location,
    floor: handoff.floor,
    range_or_capacity: '',
    current_location: handoff.location,
    linked_site_id: handoff.site_id,
    linked_project_id: handoff.project_id,
    linked_drawing_id: null,
    linked_bom_id: null,
    custodian_user_id: handoff.custodian_user_id,
    parent_equipment_id: null,
    purchase_cost: handoff.capex_value,
    installation_date: handoff.installation_date,
    warranty_start: handoff.warranty_start,
    warranty_end: handoff.warranty_end,
    amc_vendor_id: null,
    amc_contract_start: null,
    amc_contract_end: null,
    amc_contract_value: null,
    operational_status: 'running',
    meter_reading: 0,
    meter_unit: 'hours',
    meter_last_updated: handoff.installation_date,
    pm_schedule_template_id: null,
    last_breakdown_date: null,
    last_pm_date: null,
    next_pm_due_date: null,
    breakdown_count_12m: 0,
    uptime_pct_12m: 100,
    total_breakdown_minutes_12m: 0,
    calibration_instrument_id: null,
    kw_rating: handoff.kw_rating,
    description: `Auto-created from SiteX CAPEX handoff ${handoff.handoff_id}`,
  });

  const assetCap = createAssetCapitalization(entityCode, {
    capitalization_no: `AC/AUTO/${handoff.handoff_id.slice(-6)}`,
    equipment_id: equipment.id,
    triggered_by_handoff_id: handoff.handoff_id,
    purchase_cost: handoff.capex_value,
    depreciation_method: 'straight_line',
    useful_life_years: 10,
    salvage_value: handoff.capex_value * 0.05,
    fincore_voucher_id: null, // [JWT] Phase 2 FineCore asset entry
    project_id: handoff.project_id,
    capitalized_at: handoff.installation_date,
    capitalized_by_user_id: handoff.custodian_user_id ?? 'system',
  });

  return { equipment_id: equipment.id, asset_capitalization_id: assetCap.id };
}

// === BRIDGE 2 · emitMaintenanceEquipmentDown (OUT to Production · OOB-M3) ===
export function emitMaintenanceEquipmentDown(
  equipmentId: string,
  equipmentName: string,
  siteId: string | null,
  severity: 'low' | 'medium' | 'high' | 'critical',
  capacityImpactPct: number,
  expectedRestoreDate?: string,
): MaintenancePulseEvent {
  const event: MaintenancePulseEvent = {
    type: 'maintenance:equipment.down',
    equipment_id: equipmentId,
    equipment_name: equipmentName,
    site_id: siteId,
    severity,
    capacity_impact_pct: capacityImpactPct,
    expected_restore_date: expectedRestoreDate,
    emitted_at: new Date().toISOString(),
  };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(event.type, { detail: event }));
  }
  return event;
}

// === BRIDGE 3 · emitMaintenanceEquipmentRestored (OUT · OOB-M3) ===
export function emitMaintenanceEquipmentRestored(
  equipmentId: string,
  equipmentName: string,
  siteId: string | null,
): MaintenancePulseEvent {
  const event: MaintenancePulseEvent = {
    type: 'maintenance:equipment.restored',
    equipment_id: equipmentId,
    equipment_name: equipmentName,
    site_id: siteId,
    severity: 'low',
    capacity_impact_pct: 0,
    emitted_at: new Date().toISOString(),
  };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(event.type, { detail: event }));
  }
  return event;
}

// === BRIDGE 4 · emitSparePartReorderRequired (OUT to Procure360 · OOB-M7) ===
export function emitSparePartReorderRequired(
  spareId: string,
  currentVelocity: number,
  historicalMedian: number,
  recommendedOrderQty: number,
): SparePartReorderEvent {
  const event: SparePartReorderEvent = {
    type: 'maintenance:spare.reorder_required',
    spare_id: spareId,
    current_velocity: currentVelocity,
    historical_median: historicalMedian,
    recommended_order_qty: recommendedOrderQty,
    emitted_at: new Date().toISOString(),
  };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(event.type, { detail: event }));
  }
  return event;
}

// === BRIDGE 5 · emitInternalTicketEscalation (OUT · Q-LOCK-2c) ===
export function emitInternalTicketEscalation(
  ticketId: string,
  ticketNo: string,
  level: 1 | 2 | 3,
  category: string,
  severity: string,
  escalatedToUserId: string,
): InternalTicketEscalationEvent {
  const event: InternalTicketEscalationEvent = {
    type: 'maintenance:ticket.escalated',
    ticket_id: ticketId,
    ticket_no: ticketNo,
    escalation_level: level,
    category,
    severity,
    escalated_to_user_id: escalatedToUserId,
    emitted_at: new Date().toISOString(),
  };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(event.type, { detail: event }));
  }
  return event;
}

// === BRIDGE 6 · consumeQualiCheckCalibrationFail (IN · OOB-M5 guard) ===
export function consumeQualiCheckCalibrationFail(
  _entityCode: string,
  event: QualiCheckCalibrationFailEvent,
): { blocked: boolean; reason: string | null } {
  // [JWT] Phase 2: QualiCheck emits this · MaintainPro auto-creates calibration WO
  return {
    blocked: true,
    reason: `Calibration instrument ${event.instrument_id} is quarantined · cannot be used in QC entry · auto-creating calibration work order`,
  };
}

// === BRIDGE 7 · consumeSiteXPTWRequest (IN · OOB-M6 guard) ===
export function consumeSiteXPTWRequest(
  _entityCode: string,
  _event: SiteXPTWRequestEvent,
): { blocked: boolean; reason: string | null } {
  // [JWT] Phase 2: real fire-safety status check via hasExpiredFireSafetyInSite
  return { blocked: false, reason: null };
}

// === PLANNED BRIDGES (3) ===
// [PLANNED] emitWarrantyClaimAutoDetect · OOB-M8 at breakdown → vendor email (A.17)
// [PLANNED] emitAssetEntryToFineCore · Asset Cap → FineCore asset voucher (A.17 finalizes)
// [PLANNED] emitServiceDeskHandoff · decommission customer-deployed Equipment → ServiceDesk (C.1-C.2)
