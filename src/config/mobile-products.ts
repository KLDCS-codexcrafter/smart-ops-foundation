/**
 * @file        src/config/mobile-products.ts
 * @purpose     MOBILE_PRODUCTS registry · D-NEW-CV mobile catalog incremental pattern · per-role mobile landing entries
 * @sprint      T-Phase-1.A.16c · Block F.3 · Q-LOCK-5 · NEW
 * @decisions   D-NEW-CV 13th consumer maintainpro
 * @disciplines FR-30 standard headers
 */

export interface MobileProductEntry {
  id: string;
  role: string;
  landingPath: string;
  displayName: string;
  icon: string;
}

export const MOBILE_PRODUCTS: MobileProductEntry[] = [
  {
    id: 'sitex',
    role: 'site_engineer',
    landingPath: '/operix-go/site-engineer',
    displayName: 'SiteX Engineer',
    icon: 'map-pin',
  },
  {
    id: 'maintainpro',
    role: 'maintenance_technician',
    landingPath: '/operix-go/maintenance-technician',
    displayName: 'MaintainPro Technician',
    icon: 'wrench',
  },
];
