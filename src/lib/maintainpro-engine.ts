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
