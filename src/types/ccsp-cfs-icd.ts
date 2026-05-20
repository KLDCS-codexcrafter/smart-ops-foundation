/**
 * @file        src/types/ccsp-cfs-icd.ts
 * @purpose     CCSP / CFS / ICD facility tracking · v7 Compliance Gap #12 addressed at Leg 4
 * @sprint      T-Phase-1.EX-4-MultiLeg-GIT-3Bucket-4Method
 * @decisions   EX-4-Q5=b Leg 4 facility · CCSP license capture · dwell time
 */

export type FacilityType = 'cfs' | 'icd' | 'ccsp_only';

export interface CFSICDFacility {
  facility_code: string;
  facility_name: string;
  facility_type: FacilityType;
  location: string;
  is_ccsp_facility: boolean;
  ccsp_license_no: string | null;
  ccsp_license_expiry: string | null;
  capacity_teu: number;
  has_bonded_warehousing: boolean;
  has_temperature_controlled: boolean;
}

export const FACILITY_TYPE_DESCRIPTIONS: Record<FacilityType, string> = {
  cfs: 'Container Freight Station · port-area facility for stuffing/destuffing containers',
  icd: 'Inland Container Depot · inland facility connected to port via rail/road · ICD acts as port',
  ccsp_only: 'Customs Cargo Service Provider · licensed handler of customs-bonded cargo · v7 Gap #12 priority',
};
