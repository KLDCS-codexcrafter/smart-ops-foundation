/**
 * @file        src/data/fa-universal-vendor-categories-seed-data.ts
 * @sprint      T-Phase-4.FAR-0 · Theme 1 · FAR-CAP-2
 */

export interface FAVendorCategory {
  id: string;
  name: string;
  description: string;
  example_assets: string[];
}

export const FA_UNIVERSAL_VENDOR_CATEGORIES: FAVendorCategory[] = [
  { id: 'vcat-oem', name: 'OEM', description: 'Original equipment manufacturer', example_assets: ['CNC', 'Reactor'] },
  { id: 'vcat-auth-dealer', name: 'Authorized Dealer', description: 'OEM-authorized reseller', example_assets: ['Vehicle', 'AC'] },
  { id: 'vcat-reseller', name: 'Reseller', description: 'General reseller', example_assets: ['Computer', 'Mobile'] },
  { id: 'vcat-local', name: 'Local Vendor', description: 'Local supplier', example_assets: ['Furniture', 'Fixture'] },
  { id: 'vcat-foreign', name: 'Foreign Vendor', description: 'Imported equipment supplier', example_assets: ['Imported Machinery'] },
  { id: 'vcat-service', name: 'Service Provider', description: 'AMC / service contracts', example_assets: ['AMC Contract'] },
  { id: 'vcat-software', name: 'Software Vendor', description: 'Intangible software supplier', example_assets: ['ERP License', 'CAD License'] },
  { id: 'vcat-lease', name: 'Lease Vendor', description: 'Leasing company', example_assets: ['Leased Vehicle', 'Leased Equipment'] },
];

export const faUniversalVendorCategoriesKey = (entityCode: string): string =>
  `erp_fa_universal_vendor_categories_${entityCode}`;

// [JWT] GET /api/fa/universal/vendor-categories?entityCode=...
export function seedFAUniversalVendorCategories(entityCode: string): void {
  const key = faUniversalVendorCategoriesKey(entityCode);
  if (!localStorage.getItem(key)) {
    // [JWT] POST /api/fa/universal/vendor-categories
    localStorage.setItem(key, JSON.stringify(FA_UNIVERSAL_VENDOR_CATEGORIES));
  }
}
