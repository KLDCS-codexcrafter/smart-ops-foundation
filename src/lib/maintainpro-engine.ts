/**
 * @file        src/lib/maintainpro-engine.ts
 * @purpose     MaintainPro Path B own entity engine · 6th Path B consumer (DocVault Hub purity preserved · FR-73.1) · 6 master CRUD + OOB helpers (M5 calibration quarantine · M6 fire cascade · M8 warranty · M10 PM next-due · M11 genealogy · M12 ESG energy) · D-194 Phase 1 localStorage
 * @who         MaintainPro module
 * @when        2026-05-12
 * @sprint      T-Phase-1.A.16a · Block B · Q-LOCK-2
 * @whom        Audit Owner
 * @decisions   D-NEW-CW Path B 6th consumer · D-NEW-DA POSSIBLE 24th · FR-73.1 absolute
 * @disciplines FR-22 · FR-24 · FR-30 · FR-54
 * @reuses      Equipment + CalibrationInstrument + FireSafetyEquipment + PMScheduleTemplate + SparePartView + MaintenanceVendorView from @/types/maintainpro
 * @[JWT]       Phase 2 wires real GET/POST/PUT/DELETE endpoints
 */

import type {
  Equipment,
  CalibrationInstrument,
  FireSafetyEquipment,
  PMScheduleTemplate,
  SparePartView,
  MaintenanceVendorView,
} from '@/types/maintainpro';
import {
  equipmentKey,
  calibrationInstrumentKey,
  fireSafetyEquipmentKey,
  pmScheduleTemplateKey,
} from '@/types/maintainpro';

const newId = (prefix: string): string =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const nowIso = (): string => new Date().toISOString();

// ============================================================================
// EQUIPMENT CRUD
// ============================================================================

export function listEquipment(entityCode: string): Equipment[] {
  try {
    // [JWT] GET /api/maintainpro/equipment
    const raw = localStorage.getItem(equipmentKey(entityCode));
    return raw ? (JSON.parse(raw) as Equipment[]) : [];
  } catch {
    return [];
  }
}

export function getEquipmentById(entityCode: string, id: string): Equipment | null {
  return listEquipment(entityCode).find((e) => e.id === id) ?? null;
}

export function createEquipment(
  entityCode: string,
  data: Omit<Equipment, 'id' | 'entity_id' | 'created_at' | 'updated_at' | 'is_active' | 'status'>,
): Equipment {
  const now = nowIso();
  const equipment: Equipment = {
    ...data,
    id: newId('eq'),
    entity_id: entityCode,
    status: 'active',
    is_active: true,
    created_at: now,
    updated_at: now,
  };
  const list = listEquipment(entityCode);
  list.push(equipment);
  try {
    // [JWT] POST /api/maintainpro/equipment
    localStorage.setItem(equipmentKey(entityCode), JSON.stringify(list));
  } catch {
    /* quota silent */
  }
  return equipment;
}

export function updateEquipment(
  entityCode: string,
  id: string,
  patch: Partial<Equipment>,
): Equipment | null {
  const list = listEquipment(entityCode);
  const idx = list.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  list[idx] = {
    ...list[idx],
    ...patch,
    id,
    entity_id: entityCode,
    updated_at: nowIso(),
  };
  try {
    // [JWT] PUT /api/maintainpro/equipment/:id
    localStorage.setItem(equipmentKey(entityCode), JSON.stringify(list));
  } catch {
    /* ignore */
  }
  return list[idx];
}

// OOB-M11 Asset Genealogy Tree (BFS descendants)
export function getEquipmentDescendants(entityCode: string, parentId: string): Equipment[] {
  const all = listEquipment(entityCode);
  const result: Equipment[] = [];
  const queue: string[] = [parentId];
  while (queue.length > 0) {
    const currentId = queue.shift() as string;
    const children = all.filter((e) => e.parent_equipment_id === currentId);
    result.push(...children);
    queue.push(...children.map((c) => c.id));
  }
  return result;
}

// OOB-M8 Warranty auto-detect
export function isEquipmentInWarranty(equipment: Equipment): boolean {
  if (!equipment.warranty_end) return false;
  return new Date(equipment.warranty_end) >= new Date();
}

// ============================================================================
// CALIBRATION CRUD + OOB-M5 auto-quarantine
// ============================================================================

export function listCalibrationInstruments(entityCode: string): CalibrationInstrument[] {
  try {
    // [JWT] GET /api/maintainpro/calibration
    const raw = localStorage.getItem(calibrationInstrumentKey(entityCode));
    return raw ? (JSON.parse(raw) as CalibrationInstrument[]) : [];
  } catch {
    return [];
  }
}

export function createCalibrationInstrument(
  entityCode: string,
  data: Omit<
    CalibrationInstrument,
    'id' | 'entity_id' | 'created_at' | 'updated_at' | 'is_active' | 'status'
  >,
): CalibrationInstrument {
  const now = nowIso();
  const instrument: CalibrationInstrument = {
    ...data,
    id: newId('cal'),
    entity_id: entityCode,
    status: 'active',
    is_active: true,
    created_at: now,
    updated_at: now,
  };
  const list = listCalibrationInstruments(entityCode);
  list.push(instrument);
  try {
    // [JWT] POST /api/maintainpro/calibration
    localStorage.setItem(calibrationInstrumentKey(entityCode), JSON.stringify(list));
  } catch {
    /* ignore */
  }
  return instrument;
}

// OOB-M5 computed status
export function getCalibrationStatusComputed(
  instrument: CalibrationInstrument,
): 'active' | 'overdue' | 'quarantined' {
  if (instrument.status === 'decommissioned') return 'quarantined';
  const today = new Date();
  const due = new Date(instrument.due_date);
  if (due < today) return 'quarantined';
  const daysUntilDue = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntilDue <= 7) return 'overdue';
  return 'active';
}

export function isCalibrationInstrumentQuarantined(
  entityCode: string,
  instrumentId: string,
): boolean {
  const instrument = listCalibrationInstruments(entityCode).find((i) => i.id === instrumentId);
  if (!instrument) return false;
  return getCalibrationStatusComputed(instrument) === 'quarantined';
}

// ============================================================================
// FIRE SAFETY CRUD + OOB-M6 cascade
// ============================================================================

export function listFireSafetyEquipment(entityCode: string): FireSafetyEquipment[] {
  try {
    // [JWT] GET /api/maintainpro/firesafety
    const raw = localStorage.getItem(fireSafetyEquipmentKey(entityCode));
    return raw ? (JSON.parse(raw) as FireSafetyEquipment[]) : [];
  } catch {
    return [];
  }
}

export function createFireSafetyEquipment(
  entityCode: string,
  data: Omit<
    FireSafetyEquipment,
    'id' | 'entity_id' | 'created_at' | 'updated_at' | 'is_active' | 'status'
  >,
): FireSafetyEquipment {
  const now = nowIso();
  const equipment: FireSafetyEquipment = {
    ...data,
    id: newId('fs'),
    entity_id: entityCode,
    status: 'active',
    is_active: true,
    created_at: now,
    updated_at: now,
  };
  const list = listFireSafetyEquipment(entityCode);
  list.push(equipment);
  try {
    // [JWT] POST /api/maintainpro/firesafety
    localStorage.setItem(fireSafetyEquipmentKey(entityCode), JSON.stringify(list));
  } catch {
    /* ignore */
  }
  return equipment;
}

// OOB-M6 90/30/day-of cascade
export function getFireSafetyStatusComputed(
  equipment: FireSafetyEquipment,
): 'active' | 'warning_90d' | 'warning_30d' | 'expired' {
  if (equipment.status === 'decommissioned') return 'expired';
  const today = new Date();
  const expiry = new Date(equipment.expiry_date);
  if (expiry < today) return 'expired';
  const daysUntilExpiry = Math.floor(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysUntilExpiry <= 30) return 'warning_30d';
  if (daysUntilExpiry <= 90) return 'warning_90d';
  return 'active';
}

export function hasExpiredFireSafetyInSite(entityCode: string, siteId: string): boolean {
  const equipment = listFireSafetyEquipment(entityCode).filter((e) => e.linked_site_id === siteId);
  return equipment.some((e) => getFireSafetyStatusComputed(e) === 'expired');
}

// ============================================================================
// PM SCHEDULE TEMPLATE CRUD + OOB-M10 4-axis (Phase 1: calendar)
// ============================================================================

export function listPMScheduleTemplates(entityCode: string): PMScheduleTemplate[] {
  try {
    // [JWT] GET /api/maintainpro/pm-templates
    const raw = localStorage.getItem(pmScheduleTemplateKey(entityCode));
    return raw ? (JSON.parse(raw) as PMScheduleTemplate[]) : [];
  } catch {
    return [];
  }
}

export function createPMScheduleTemplate(
  entityCode: string,
  data: Omit<
    PMScheduleTemplate,
    'id' | 'entity_id' | 'created_at' | 'updated_at' | 'is_active' | 'status'
  >,
): PMScheduleTemplate {
  const now = nowIso();
  const template: PMScheduleTemplate = {
    ...data,
    id: newId('pmt'),
    entity_id: entityCode,
    status: 'active',
    is_active: true,
    created_at: now,
    updated_at: now,
  };
  const list = listPMScheduleTemplates(entityCode);
  list.push(template);
  try {
    // [JWT] POST /api/maintainpro/pm-templates
    localStorage.setItem(pmScheduleTemplateKey(entityCode), JSON.stringify(list));
  } catch {
    /* ignore */
  }
  return template;
}

export function computeNextPMDueDate(
  template: PMScheduleTemplate,
  equipment: Equipment,
  currentDate: string,
): string | null {
  const calendarAxis = template.axes.find((a) => a.axis === 'calendar');
  if (
    !calendarAxis ||
    !calendarAxis.calendar_interval_value ||
    !calendarAxis.calendar_interval_unit
  ) {
    return null;
  }
  const base = new Date(equipment.last_pm_date || currentDate);
  const intervalValue = calendarAxis.calendar_interval_value;
  const days =
    calendarAxis.calendar_interval_unit === 'days'
      ? intervalValue
      : calendarAxis.calendar_interval_unit === 'months'
        ? intervalValue * 30
        : intervalValue * 365;
  const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  return next.toISOString().slice(0, 10);
  // [JWT] Phase 2: meter + usage + season axes
}

// ============================================================================
// OOB-M12 ESG energy
// ============================================================================

export function computeEquipmentEnergyConsumption(
  equipment: Equipment,
  operatingHoursPerMonth: number,
): { kwh_per_month: number; co2_kg_per_month: number } | null {
  if (!equipment.kw_rating) return null;
  const kwh = equipment.kw_rating * operatingHoursPerMonth;
  // India grid emission factor ~0.82 kg CO2/kWh (CEA 2024)
  const co2 = kwh * 0.82;
  return { kwh_per_month: kwh, co2_kg_per_month: co2 };
  // [JWT] Phase 2: BRSR Scope 1+2 emissions
}

// ============================================================================
// Replica view helpers (FR-13 · FR-54 SSOT)
// ============================================================================

// [JWT] Phase 1 stub · Phase 2 filters InventoryHub stockitems by stock_group='Maintenance Spares'
export function listSpareParts(_entityCode: string): SparePartView[] {
  return [];
}

// [JWT] Phase 1 stub · Phase 2 filters CC VendorMaster by vendor_type='service_provider'
// (FR-54 SSOT · founder May 12 directive · no duplicate entity)
export function listMaintenanceVendors(_entityCode: string): MaintenanceVendorView[] {
  return [];
}

// ============================================================================
// === A.16b · TRANSACTIONS APPENDED ===
// (Master CRUD + 6 OOB helpers above ABSOLUTE preserved)
// ============================================================================

import type {
  BreakdownReport, WorkOrder, WorkOrderStatus, PMTickoff, SparesIssue, EquipmentMovement,
  CalibrationCertificate, AMCOutToVendor, InternalMaintenanceTicket, AssetCapitalization,
  TicketStatus, EscalationLevel,
} from '@/types/maintainpro';
import {
  breakdownReportKey, workOrderKey, pmTickoffKey, sparesIssueKey, equipmentMovementKey,
  calibrationCertificateKey, amcOutToVendorKey, internalTicketKey, assetCapitalizationKey,
  SLA_MATRIX,
} from '@/types/maintainpro';

function readList<T>(key: string): T[] {
  // [JWT] GET /api/maintainpro/<resource>
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T[] : []; } catch { return []; }
}
function writeList<T>(key: string, list: T[]): void {
  // [JWT] POST/PUT /api/maintainpro/<resource>
  try { localStorage.setItem(key, JSON.stringify(list)); } catch { /* quota silent */ }
}

// === 1. BREAKDOWN REPORT (OOB-M1 + OOB-M8) ===
export function listBreakdownReports(entityCode: string): BreakdownReport[] {
  return readList<BreakdownReport>(breakdownReportKey(entityCode));
}

function findSimilarBreakdowns(
  entityCode: string,
  equipmentId: string,
  complaint: string,
): { count: number; pattern: string | null } {
  const past = listBreakdownReports(entityCode).filter(b => {
    if (b.equipment_id !== equipmentId) return false;
    const ageMs = Date.now() - new Date(b.occurred_at).getTime();
    return ageMs < 365 * 24 * 60 * 60 * 1000;
  });
  const keywords = complaint.toLowerCase().split(/\s+/).filter(w => w.length >= 4);
  const similar = past.filter(b => {
    const pastKeywords = b.nature_of_complaint.toLowerCase().split(/\s+/);
    return keywords.some(k => pastKeywords.some(pk => pk.includes(k) || k.includes(pk)));
  });
  if (similar.length >= 3) {
    return { count: similar.length, pattern: `Recurring pattern: ${similar.length} similar breakdowns in last 12 months · root-cause investigation recommended` };
  }
  return { count: similar.length, pattern: null };
  // [JWT] Phase 2: ML embedding semantic similarity
}

export function createBreakdownReport(
  entityCode: string,
  data: Omit<BreakdownReport, 'id' | 'entity_id' | 'created_at' | 'updated_at' | 'status' |
    'similar_breakdowns_last_12m_count' | 'similar_breakdowns_pattern_detected' |
    'is_equipment_in_warranty' | 'warranty_claim_recommended' | 'warranty_contact'>,
): BreakdownReport {
  const similar = findSimilarBreakdowns(entityCode, data.equipment_id, data.nature_of_complaint);
  const equipment = getEquipmentById(entityCode, data.equipment_id);
  const inWarranty = equipment ? isEquipmentInWarranty(equipment) : false;
  const now = nowIso();
  const breakdown: BreakdownReport = {
    ...data,
    id: newId('bd'),
    entity_id: entityCode,
    status: 'open',
    similar_breakdowns_last_12m_count: similar.count,
    similar_breakdowns_pattern_detected: similar.pattern,
    is_equipment_in_warranty: inWarranty,
    warranty_claim_recommended: inWarranty,
    warranty_contact: equipment?.amc_vendor_id ?? null,
    created_at: now,
    updated_at: now,
  };
  const list = listBreakdownReports(entityCode);
  list.push(breakdown);
  writeList(breakdownReportKey(entityCode), list);
  return breakdown;
}

// === 2. WORK ORDER ===
export function listWorkOrders(entityCode: string): WorkOrder[] {
  return readList<WorkOrder>(workOrderKey(entityCode));
}
export function createWorkOrder(
  entityCode: string,
  data: Omit<WorkOrder, 'id' | 'entity_id' | 'created_at' | 'updated_at'>,
): WorkOrder {
  const now = nowIso();
  const wo: WorkOrder = { ...data, id: newId('wo'), entity_id: entityCode, created_at: now, updated_at: now };
  const list = listWorkOrders(entityCode);
  list.push(wo);
  writeList(workOrderKey(entityCode), list);
  return wo;
}
export function updateWorkOrderStatus(
  entityCode: string,
  woId: string,
  newStatus: WorkOrderStatus,
): WorkOrder | null {
  const list = listWorkOrders(entityCode);
  const idx = list.findIndex(w => w.id === woId);
  if (idx === -1) return null;
  const now = nowIso();
  list[idx] = {
    ...list[idx],
    status: newStatus,
    started_at: newStatus === 'in_progress' && !list[idx].started_at ? now : list[idx].started_at,
    completed_at: newStatus === 'completed' ? now : list[idx].completed_at,
    updated_at: now,
  };
  writeList(workOrderKey(entityCode), list);
  return list[idx];
}

// === 3. PM TICK-OFF ===
export function listPMTickoffs(entityCode: string): PMTickoff[] {
  return readList<PMTickoff>(pmTickoffKey(entityCode));
}
export function createPMTickoff(
  entityCode: string,
  data: Omit<PMTickoff, 'id' | 'entity_id' | 'created_at' | 'updated_at'>,
): PMTickoff {
  const now = nowIso();
  const t: PMTickoff = { ...data, id: newId('pm'), entity_id: entityCode, created_at: now, updated_at: now };
  const list = listPMTickoffs(entityCode);
  list.push(t);
  writeList(pmTickoffKey(entityCode), list);
  return t;
}

// === 4. SPARES ISSUE (OOB-M7) ===
export function listSparesIssues(entityCode: string): SparesIssue[] {
  return readList<SparesIssue>(sparesIssueKey(entityCode));
}
function computeSpareVelocity(entityCode: string, spareId: string): { current: number; median: number } {
  const past = listSparesIssues(entityCode).filter(i => i.spare_id === spareId);
  const now = Date.now();
  const last3m = past.filter(i => now - new Date(i.issued_at).getTime() < 90 * 24 * 60 * 60 * 1000);
  const current = last3m.reduce((sum, i) => sum + i.qty, 0) / 3;
  const all = past.length > 0 ? past.reduce((sum, i) => sum + i.qty, 0) / Math.max(past.length / 30, 1) : 0;
  return { current, median: all };
  // [JWT] Phase 2: rolling 24-month median
}
export function createSparesIssue(
  entityCode: string,
  data: Omit<SparesIssue, 'id' | 'entity_id' | 'created_at' |
    'current_velocity' | 'historical_median_velocity' | 'velocity_spike_detected' | 'reorder_alert_emitted'>,
): SparesIssue {
  const velocity = computeSpareVelocity(entityCode, data.spare_id);
  const spike = velocity.current > velocity.median * 2;
  const issue: SparesIssue = {
    ...data,
    id: newId('si'),
    entity_id: entityCode,
    current_velocity: velocity.current,
    historical_median_velocity: velocity.median,
    velocity_spike_detected: spike,
    reorder_alert_emitted: spike,
    created_at: nowIso(),
  };
  const list = listSparesIssues(entityCode);
  list.push(issue);
  writeList(sparesIssueKey(entityCode), list);
  return issue;
}

// === 5. EQUIPMENT MOVEMENT ===
export function listEquipmentMovements(entityCode: string): EquipmentMovement[] {
  return readList<EquipmentMovement>(equipmentMovementKey(entityCode));
}
export function createEquipmentMovement(
  entityCode: string,
  data: Omit<EquipmentMovement, 'id' | 'entity_id' | 'created_at'>,
): EquipmentMovement {
  const m: EquipmentMovement = { ...data, id: newId('em'), entity_id: entityCode, created_at: nowIso() };
  const list = listEquipmentMovements(entityCode);
  list.push(m);
  writeList(equipmentMovementKey(entityCode), list);
  return m;
}

// === 6. CALIBRATION CERTIFICATE ===
export function listCalibrationCertificates(entityCode: string): CalibrationCertificate[] {
  return readList<CalibrationCertificate>(calibrationCertificateKey(entityCode));
}
export function createCalibrationCertificate(
  entityCode: string,
  data: Omit<CalibrationCertificate, 'id' | 'entity_id' | 'created_at'>,
): CalibrationCertificate {
  const cert: CalibrationCertificate = { ...data, id: newId('cert'), entity_id: entityCode, created_at: nowIso() };
  const list = listCalibrationCertificates(entityCode);
  list.push(cert);
  writeList(calibrationCertificateKey(entityCode), list);
  // [JWT] Phase 2: update linked CalibrationInstrument.calibrated_on + due_date
  return cert;
}

// === 7. AMC OUT-TO-VENDOR (OOB-M2) ===
export function listAMCOutToVendor(entityCode: string): AMCOutToVendor[] {
  return readList<AMCOutToVendor>(amcOutToVendorKey(entityCode));
}
export function createAMCOutToVendor(
  entityCode: string,
  data: Omit<AMCOutToVendor, 'id' | 'entity_id' | 'created_at' | 'updated_at' |
    'reminder_50pct_sent' | 'reminder_75pct_sent' | 'reminder_overdue_sent'>,
): AMCOutToVendor {
  const now = nowIso();
  const amc: AMCOutToVendor = {
    ...data,
    id: newId('amc'),
    entity_id: entityCode,
    reminder_50pct_sent: false,
    reminder_75pct_sent: false,
    reminder_overdue_sent: false,
    created_at: now,
    updated_at: now,
  };
  const list = listAMCOutToVendor(entityCode);
  list.push(amc);
  writeList(amcOutToVendorKey(entityCode), list);
  return amc;
}
function isReminderDue(amc: AMCOutToVendor, now: number, pct: number): boolean {
  const sent = new Date(amc.sent_date).getTime();
  const expected = new Date(amc.expected_return_date).getTime();
  const elapsed = now - sent;
  const total = expected - sent;
  return elapsed >= total * pct;
}
export function getAMCRemindersDue(entityCode: string): {
  fifty_pct: AMCOutToVendor[];
  seventy_five_pct: AMCOutToVendor[];
  overdue: AMCOutToVendor[];
} {
  const all = listAMCOutToVendor(entityCode).filter(a => a.status !== 'returned' && a.status !== 'cancelled');
  const now = Date.now();
  return {
    fifty_pct: all.filter(a => !a.reminder_50pct_sent && isReminderDue(a, now, 0.5)),
    seventy_five_pct: all.filter(a => !a.reminder_75pct_sent && isReminderDue(a, now, 0.75)),
    overdue: all.filter(a => !a.reminder_overdue_sent && new Date(a.expected_return_date).getTime() < now),
  };
}

// === 8. INTERNAL TICKET + SLA + 3-LEVEL ESCALATION ===
export function listInternalTickets(entityCode: string): InternalMaintenanceTicket[] {
  return readList<InternalMaintenanceTicket>(internalTicketKey(entityCode));
}
export function createInternalTicket(
  entityCode: string,
  data: Omit<InternalMaintenanceTicket, 'id' | 'entity_id' | 'created_at' | 'updated_at' |
    'sla_ack_hours' | 'sla_resolution_hours' | 'is_ack_breached' | 'is_resolution_breached' |
    'escalation_level' | 'escalation_log' | 'reopened_count' | 'receiving_department_id'>,
): InternalMaintenanceTicket {
  const sla = SLA_MATRIX[data.category][data.severity];
  const now = nowIso();
  const ticket: InternalMaintenanceTicket = {
    ...data,
    id: newId('tkt'),
    entity_id: entityCode,
    receiving_department_id: 'maintenance',
    sla_ack_hours: sla.ack_hours,
    sla_resolution_hours: sla.resolution_hours,
    is_ack_breached: false,
    is_resolution_breached: false,
    escalation_level: 0,
    escalation_log: [],
    reopened_count: 0,
    created_at: now,
    updated_at: now,
  };
  const list = listInternalTickets(entityCode);
  list.push(ticket);
  writeList(internalTicketKey(entityCode), list);
  return ticket;
}
export function transitionTicketStatus(
  entityCode: string,
  ticketId: string,
  newStatus: TicketStatus,
  byUserId: string,
  resolutionNotes?: string,
): InternalMaintenanceTicket | null {
  const list = listInternalTickets(entityCode);
  const idx = list.findIndex(t => t.id === ticketId);
  if (idx === -1) return null;
  const now = nowIso();
  const t = list[idx];
  switch (newStatus) {
    case 'acknowledged':
      t.acknowledged_at = now;
      t.acknowledged_by_user_id = byUserId;
      break;
    case 'in_progress':
      t.in_progress_at = now;
      break;
    case 'resolved':
      t.resolved_at = now;
      t.resolved_by_user_id = byUserId;
      if (resolutionNotes) t.resolution_notes = resolutionNotes;
      break;
    case 'closed':
      t.closed_at = now;
      break;
    case 'reopened':
      t.reopened_count += 1;
      t.acknowledged_at = null;
      t.acknowledged_by_user_id = null;
      t.in_progress_at = null;
      t.resolved_at = null;
      t.resolved_by_user_id = null;
      list[idx] = { ...t, status: 'open', updated_at: now };
      writeList(internalTicketKey(entityCode), list);
      return list[idx];
    case 'open':
      break;
  }
  list[idx] = { ...t, status: newStatus, updated_at: now };
  writeList(internalTicketKey(entityCode), list);
  return list[idx];
}
export function evaluateTicketEscalations(entityCode: string): InternalMaintenanceTicket[] {
  const list = listInternalTickets(entityCode);
  const now = Date.now();
  const updated: InternalMaintenanceTicket[] = [];
  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    if (t.status === 'closed' || t.status === 'resolved') continue;
    const createdMs = new Date(t.created_at).getTime();
    const ackMs = t.sla_ack_hours * 60 * 60 * 1000;
    const resMs = t.sla_resolution_hours * 60 * 60 * 1000;
    const elapsed = now - createdMs;
    let newLevel: EscalationLevel = t.escalation_level;
    if (elapsed > resMs * 2 && t.escalation_level < 3) newLevel = 3;
    else if (elapsed > resMs && t.escalation_level < 2 && !t.resolved_at) newLevel = 2;
    else if (elapsed > ackMs && t.escalation_level < 1 && !t.acknowledged_at) newLevel = 1;
    if (newLevel !== t.escalation_level) {
      const escalatedToUserId = `escalation_target_L${newLevel}`;
      list[i] = {
        ...t,
        escalation_level: newLevel,
        escalation_log: [...t.escalation_log, { level: newLevel as 1|2|3, escalated_at: new Date().toISOString(), escalated_to_user_id: escalatedToUserId }],
        is_ack_breached: !t.acknowledged_at && elapsed > ackMs,
        is_resolution_breached: !t.resolved_at && elapsed > resMs,
        updated_at: new Date().toISOString(),
      };
      updated.push(list[i]);
    }
  }
  if (updated.length > 0) writeList(internalTicketKey(entityCode), list);
  return updated;
  // [JWT] Phase 2: cron job invokes this periodically
}

// === 9. ASSET CAPITALIZATION ===
export function listAssetCapitalizations(entityCode: string): AssetCapitalization[] {
  return readList<AssetCapitalization>(assetCapitalizationKey(entityCode));
}
export function createAssetCapitalization(
  entityCode: string,
  data: Omit<AssetCapitalization, 'id' | 'entity_id' | 'created_at'>,
): AssetCapitalization {
  const cap: AssetCapitalization = { ...data, id: newId('cap'), entity_id: entityCode, created_at: nowIso() };
  const list = listAssetCapitalizations(entityCode);
  list.push(cap);
  writeList(assetCapitalizationKey(entityCode), list);
  return cap;
}

// ============================================================================
// === A.17 · MOBILE CAPTURE HELPERS (APPENDED · existing 23 functions ABSOLUTE preserved) ===
// D-NEW-DG POSSIBLE 30th canonical · Equipment Photo Append Pattern
// ============================================================================

interface EquipmentPhotoRecord {
  equipment_id: string;
  photo_url: string;
  context: string;
  taken_by: string;
  taken_at: string;
}

const equipmentPhotosKey = (entityCode: string): string =>
  `erp_maintainpro_equipment_photos_${entityCode}`;

export function appendEquipmentPhoto(
  entityCode: string,
  equipmentId: string,
  photoUrl: string,
  context: 'pre_maintenance' | 'post_maintenance' | 'warranty_claim' | 'audit' | 'general',
  takenBy: string,
): { equipment_id: string; photo_count: number } {
  const key = equipmentPhotosKey(entityCode);
  let photos: EquipmentPhotoRecord[];
  try {
    const raw = localStorage.getItem(key);
    photos = raw ? (JSON.parse(raw) as EquipmentPhotoRecord[]) : [];
  } catch {
    photos = [];
  }
  photos.push({
    equipment_id: equipmentId,
    photo_url: photoUrl,
    context,
    taken_by: takenBy,
    taken_at: new Date().toISOString(),
  });
  try {
    localStorage.setItem(key, JSON.stringify(photos));
  } catch {
    /* ignore quota */
  }
  // [JWT] Phase 2: real upload to DocVault · returns CDN URL
  return {
    equipment_id: equipmentId,
    photo_count: photos.filter((p) => p.equipment_id === equipmentId).length,
  };
}

export function listEquipmentPhotos(
  entityCode: string,
  equipmentId: string,
): Array<{ photo_url: string; context: string; taken_by: string; taken_at: string }> {
  const key = equipmentPhotosKey(entityCode);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const photos = JSON.parse(raw) as EquipmentPhotoRecord[];
    return photos
      .filter((p) => p.equipment_id === equipmentId)
      .map(({ photo_url, context, taken_by, taken_at }) => ({ photo_url, context, taken_by, taken_at }));
  } catch {
    return [];
  }
}
