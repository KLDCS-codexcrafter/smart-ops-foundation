/**
 * @file        src/types/vendor-zone.ts
 * @purpose     Vendor geographic/operational zone master · ccc-shape-aligned (Wave-2 migration-ready)
 * @sprint      T-VPG-VendorPortal-Gaps · Wave-1 tail
 * @decisions   ccc reference (vendor_zones) · field-name parity for Wave-2 backend persistence
 */

export interface VendorZone {
  id: string;
  zone_code: string;
  zone_name: string;
  region: string;
  parent_zone_id?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const vendorZonesKey = (entityCode: string): string =>
  `erp_vendor_zones_${entityCode}`;
