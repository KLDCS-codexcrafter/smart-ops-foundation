/**
 * @file        vehicle-master.ts
 * @sprint      T-Phase-1.2.6f-d-2-card4-4-pre-2 · Block B · D-307 (Q3=A 12-field)
 * @purpose     Vehicle Master · Indian Motor Vehicles Act compliance
 *              · RC + insurance + permit expiry tracking.
 *              [JWT] erp_vehicle_master_<entityCode>
 */

export type VehicleType =
  | 'truck' | 'tempo' | 'van' | 'pickup' | 'car' | 'two_wheeler' | 'tractor' | 'other';
export type FuelType = 'diesel' | 'petrol' | 'cng' | 'electric' | 'hybrid';

export interface VehicleMaster {
  id: string;
  entity_id: string;

  // Core identity
  vehicle_no: string;             // unique per entity · uppercased · 'KA-01-AB-1234'
  vehicle_type: VehicleType;
  make: string;                   // 'Tata' · 'Ashok Leyland'
  model: string;                  // '407 Gold' · 'Dost Plus'
  capacity_kg: number;
  fuel_type: FuelType;

  // Compliance documents (IMVA)
  rc_no?: string;
  rc_expiry?: string;             // ISO date
  insurance_no?: string;
  insurance_expiry?: string;
  permit_no?: string;
  permit_expiry?: string;

  // Default associations
  default_driver_id?: string;
  transporter_id?: string;        // FK to types/transporter-rate.ts (existing)

  // Status + audit
  status: 'active' | 'inactive';
  remarks?: string;
  created_at: string;
  created_by_user_id: string;
  updated_at: string;
}

export const vehicleMasterKey = (entityCode: string): string =>
  `erp_vehicle_master_${entityCode}`;
