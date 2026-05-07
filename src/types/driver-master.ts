/**
 * @file        driver-master.ts
 * @sprint      T-Phase-1.2.6f-d-2-card4-4-pre-2 (Block B) · T-Phase-1.A.1.a (Driver Safety OOB additive)
 * @purpose     Driver Master · license expiry tracking + KYC (Aadhaar last 4 only · privacy-friendly).
 *              [JWT] erp_driver_master_<entityCode>
 */

export type LicenseClass = 'LMV' | 'HMV' | 'HCV' | 'TWO_WHEELER';

export interface DriverMaster {
  id: string;
  entity_id: string;

  driver_name: string;
  driver_phone: string;
  driver_license_no: string;
  license_expiry?: string;
  license_class?: LicenseClass;

  aadhaar_last_4?: string;        // last 4 only · NOT full Aadhaar (privacy-friendly)

  // Sprint T-Phase-1.A.1.a · D-NEW-E · Driver Safety OOB additive
  safety_incident_count?: number;       // count of recorded safety incidents · default 0 implicit
  last_incident_date?: string;          // ISO date string · YYYY-MM-DD

  default_vehicle_id?: string;

  status: 'active' | 'inactive';
  remarks?: string;
  created_at: string;
  created_by_user_id: string;
  updated_at: string;
}

export const driverMasterKey = (entityCode: string): string =>
  `erp_driver_master_${entityCode}`;
