/**
 * gate-alerts-engines.test.ts — Sprint 4-pre-3 · Block B · D-314
 * Covers vehicle-expiry-alerts · driver-expiry-alerts · gate-dwell-alerts.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { vehicleMasterKey } from '@/types/vehicle-master';
import { driverMasterKey } from '@/types/driver-master';
import { gatePassesKey } from '@/types/gate-pass';
import { getExpiringVehicleDocs } from '@/lib/oob/vehicle-expiry-alerts';
import { getExpiringDriverLicenses } from '@/lib/oob/driver-expiry-alerts';
import { getDwellingGatePasses } from '@/lib/oob/gate-dwell-alerts';

const E = 'TEST_ALERTS';
const isoFromNow = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

beforeEach(() => {
  localStorage.clear();
});

describe('vehicle-expiry-alerts', () => {
  it('flags RC + insurance + permit within window · sorts most-urgent-first', () => {
    localStorage.setItem(vehicleMasterKey(E), JSON.stringify([
      {
        id: 'v1', entity_id: E, vehicle_no: 'KA-01-AB-1234', vehicle_type: 'truck',
        make: 'Tata', model: '407', capacity_kg: 1500, fuel_type: 'diesel',
        rc_no: 'RC1', rc_expiry: isoFromNow(20),
        insurance_no: 'INS1', insurance_expiry: isoFromNow(5),
        permit_no: 'PM1', permit_expiry: isoFromNow(60),
        status: 'active', created_at: '', created_by_user_id: 'u', updated_at: '',
      },
    ]));
    const alerts = getExpiringVehicleDocs(E, 30);
    expect(alerts).toHaveLength(2);
    expect(alerts[0].doc_type).toBe('insurance');
    expect(alerts[1].doc_type).toBe('rc');
  });

  it('skips inactive vehicles', () => {
    localStorage.setItem(vehicleMasterKey(E), JSON.stringify([
      {
        id: 'v1', entity_id: E, vehicle_no: 'KA-01-AB-1234', vehicle_type: 'truck',
        make: 'T', model: 'X', capacity_kg: 1, fuel_type: 'diesel',
        rc_expiry: isoFromNow(1),
        status: 'inactive', created_at: '', created_by_user_id: 'u', updated_at: '',
      },
    ]));
    expect(getExpiringVehicleDocs(E)).toHaveLength(0);
  });
});

describe('driver-expiry-alerts', () => {
  it('flags license expiring within window', () => {
    localStorage.setItem(driverMasterKey(E), JSON.stringify([
      {
        id: 'd1', entity_id: E, driver_name: 'Ram', driver_phone: '9876543210',
        driver_license_no: 'KA-2020-1', license_expiry: isoFromNow(10),
        status: 'active', created_at: '', created_by_user_id: 'u', updated_at: '',
      },
      {
        id: 'd2', entity_id: E, driver_name: 'Sita', driver_phone: '9876500000',
        driver_license_no: 'KA-2020-2', license_expiry: isoFromNow(90),
        status: 'active', created_at: '', created_by_user_id: 'u', updated_at: '',
      },
    ]));
    const a = getExpiringDriverLicenses(E, 30);
    expect(a).toHaveLength(1);
    expect(a[0].driver_name).toBe('Ram');
  });
});

describe('gate-dwell-alerts', () => {
  it('flags entries dwelling beyond threshold · sorts longest-first', () => {
    const now = Date.now();
    const min = (m: number) => new Date(now - m * 60000).toISOString();
    localStorage.setItem(gatePassesKey(E), JSON.stringify([
      {
        id: 'g1', gate_pass_no: 'GP/1', direction: 'inward', entity_id: E, entity_code: E,
        status: 'in_progress', vehicle_no: 'KA-1', vehicle_type: 'truck',
        driver_name: 'A', driver_phone: '9', linked_voucher_type: null,
        counterparty_name: 'V1', entry_time: min(120), purpose: 'p',
        created_at: '', created_by_user_id: 'u', updated_at: '',
      },
      {
        id: 'g2', gate_pass_no: 'GP/2', direction: 'outward', entity_id: E, entity_code: E,
        status: 'pending', vehicle_no: 'KA-2', vehicle_type: 'truck',
        driver_name: 'B', driver_phone: '9', linked_voucher_type: null,
        counterparty_name: 'C2', entry_time: min(30), purpose: 'p',
        created_at: '', created_by_user_id: 'u', updated_at: '',
      },
      {
        id: 'g3', gate_pass_no: 'GP/3', direction: 'inward', entity_id: E, entity_code: E,
        status: 'verified', vehicle_no: 'KA-3', vehicle_type: 'truck',
        driver_name: 'C', driver_phone: '9', linked_voucher_type: null,
        counterparty_name: 'V3', entry_time: min(75), purpose: 'p',
        created_at: '', created_by_user_id: 'u', updated_at: '',
      },
    ]));
    const a = getDwellingGatePasses(E, 60, now);
    expect(a).toHaveLength(2);
    expect(a[0].gate_pass_no).toBe('GP/1');
    expect(a[1].gate_pass_no).toBe('GP/3');
  });

  it('returns empty when none exceed threshold', () => {
    localStorage.setItem(gatePassesKey(E), JSON.stringify([]));
    expect(getDwellingGatePasses(E)).toHaveLength(0);
  });
});
