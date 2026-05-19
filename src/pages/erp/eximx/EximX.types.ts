/**
 * @file        src/pages/erp/eximx/EximX.types.ts
 * @purpose     EximX module ID types · canonical TypeScript discipline
 */
export type EximXModule =
  | 'welcome'
  | 'eximx-export'
  | 'eximx-import'
  | 'eximx-unified'
  | 'saathi-tdl-gaps-atlas';

export type EximXExportModule =
  | 'export-welcome' | 'lut-master' | 'export-orders' | 'shipping-bills'
  | 'foreign-customers' | 'export-shipments' | 'e-brc' | 'firc' | 'fema-tracker'
  | 'rodtep' | 'drawback' | 'export-council' | 'export-dashboard'
  | 'buyer-reliability' | 'export-config';

export type EximXImportModule =
  | 'import-welcome' | 'iec-master' | 'import-orders' | 'bill-of-entry'
  | 'foreign-vendors' | 'import-shipments' | 'landed-cost' | 'customs-revaluation'
  | 'cth-master' | 'rms-declaration' | 'aeo-tier-mapping' | 'carotar-coo'
  | 'import-dashboard' | 'import-config';

export type EximXUnifiedModule =
  | 'unified-welcome' | 'sanctions-watchlist' | 'fema-compounding' | 'forex-rates'
  | 'unified-dashboard' | 'unified-config';
