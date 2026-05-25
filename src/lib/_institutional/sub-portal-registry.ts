/**
 * @file        src/lib/_institutional/sub-portal-registry.ts
 * @purpose     Source-of-truth register for 3 external sub-portals (D13 surfacing)
 * @sprint      T-Phase-3.HK-D14-InstitutionalRegisters
 * @disciplines NOT FR-19 SIBLING · institutional reference data
 *              Codifies vendor-portal-pattern external surfaces invisible to main app navigation
 */

export interface SubPortalEntry {
  id: string;
  name: string;
  loginRoute: string;
  layoutShell: string;
  authEngine: string;
  fileCount: number | null;
  locCount: number | null;
  parentCard: string | null;
}

export const SUB_PORTALS: SubPortalEntry[] = [
  {
    id: 'vendor-portal-external',
    name: 'Vendor Portal · External',
    loginRoute: '/erp/vendor-portal/login',
    layoutShell: 'VendorPortalLayout',
    authEngine: 'vendor-portal-auth',
    fileCount: 13,
    locCount: 2202,
    parentCard: 'vendor-portal',
  },
  {
    id: 'distributor-external',
    name: 'Distributor External Portal',
    loginRoute: '/erp/distributor-hub/portal/login',
    layoutShell: 'DistributorPortalLayout',
    authEngine: 'distributor-portal-auth',
    fileCount: null,
    locCount: null,
    parentCard: 'distributor-hub',
  },
  {
    id: 'logistic-transporter',
    name: 'Logistic Transporter Portal',
    loginRoute: '/erp/logistic/login',
    layoutShell: 'LogisticTransporterLayout',
    authEngine: 'logistic-transporter-auth',
    fileCount: 7,
    locCount: 1908,
    parentCard: 'logistics',
  },
];

export function getSubPortalCount(): number {
  return SUB_PORTALS.length;
}
