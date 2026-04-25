/**
 * @file     CityMaster.constants.ts
 * @purpose  CITY_CATEGORIES constant extracted from CityMaster.tsx to satisfy
 *           react-refresh/only-export-components.
 * @who      Operix Engineering
 * @when     Apr-2026
 * @sprint   T-H1.5-Z-Cleanup-1c-a
 * @iso      Maintainability (HIGH+ component file scope cleaned)
 *           Performance (HIGH+ HMR fast-refresh works correctly)
 * @whom     CityMaster.tsx · geography category consumers
 * @depends  none
 */
export const CITY_CATEGORIES = [
  { value:'metro', label:'Metro', desc:'Population 4M+, Tier-0 cities' },
  { value:'tier1', label:'Tier 1', desc:'Population 1M–4M, major state capitals' },
  { value:'tier2', label:'Tier 2', desc:'Population 100K–1M, district HQ' },
  { value:'tier3', label:'Tier 3', desc:'Population 20K–100K, sub-district towns' },
  { value:'town', label:'Town', desc:'Population under 20K' },
  { value:'rural', label:'Rural / Village', desc:'Rural area or village' },
  { value:'biz_area', label:'Business Area', desc:'UAE: JAFZA, DIFC, KIZAD etc.' },
  { value:'fz', label:'Free Zone', desc:'UAE/International free trade zones' },
];
