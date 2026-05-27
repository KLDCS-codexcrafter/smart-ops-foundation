/**
 * @file        src/lib/_institutional/fk-extended-scorecard.ts
 * @purpose     8-FK-CAP scorecard (cross-card-integrity capabilities)
 * @sprint      T-Phase-4.FAR-0 · 4 schema-staged at Sprint 64
 */

export type FKCapabilityState = 'absent' | 'schema-staged' | 'partial' | 'full';

export interface FKCapability {
  id: string;
  name: string;
  state: FKCapabilityState;
  lastChangedSprint: number | null;
  schemaFile: string;
  uiClosedAtSprint: number | null;
  /** 🆕 Sprint 66 FAR-2 Block 13 · additive · empirical evidence files for RECG gate */
  evidenceFiles?: string[];
}

export const FK_CAPABILITIES: FKCapability[] = [
  { id: 'FK-CAP-1', name: 'Custodian (FA AssetUnitRecord) ↔ Employee (Pay Hub)', state: 'full', lastChangedSprint: 66, schemaFile: 'src/types/fixed-asset.ts (custodian_employee_id)', uiClosedAtSprint: 66, evidenceFiles: ['src/pages/erp/accounting/capital-assets/CapitalAssetMaster.tsx'] },
  { id: 'FK-CAP-2', name: 'Machine (Production) ↔ Fixed Asset (bidirectional UI)', state: 'full', lastChangedSprint: 66, schemaFile: 'src/types/machine.ts (fixed_asset_id · EXISTING) + FA Register reverse-display', uiClosedAtSprint: 66, evidenceFiles: ['src/pages/erp/accounting/capital-assets/FixedAssetRegister.tsx'] },
  { id: 'FK-CAP-3', name: 'Equipment (MaintainPro) ↔ Fixed Asset + 4-shape unification', state: 'full', lastChangedSprint: 66, schemaFile: 'src/types/maintainpro.ts (fixed_asset_id) + src/lib/physical-asset-unit-bridge.ts (4-shape)', uiClosedAtSprint: 66, evidenceFiles: ['src/pages/erp/maintainpro/masters/EquipmentMaster.tsx'] },
  { id: 'FK-CAP-4', name: 'Pay Hub Asset ↔ Fixed Asset (bidirectional)', state: 'schema-staged', lastChangedSprint: 64, schemaFile: 'src/types/asset-master.ts (fixed_asset_id)', uiClosedAtSprint: null },
  { id: 'FK-CAP-5', name: 'Employee.EquipmentIssued[].asset_id FK', state: 'full', lastChangedSprint: 66, schemaFile: 'src/types/employee.ts (asset_id)', uiClosedAtSprint: 66, evidenceFiles: ['src/pages/erp/pay-hub/masters/EmployeeMaster.tsx'] },
  { id: 'FK-CAP-6', name: 'Production sidebar Machine List + FA-linked Machines report', state: 'full', lastChangedSprint: 66, schemaFile: 'N/A · UI at FAR-2', uiClosedAtSprint: 66, evidenceFiles: ['src/apps/erp/configs/production-sidebar-config.ts','src/pages/erp/production/ProductionPage.tsx','src/pages/erp/production/reports/FALinkedMachinesPanel.tsx'] },
  { id: 'FK-CAP-7', name: '/erp/dashboard FA card lane (4 tiles)', state: 'full', lastChangedSprint: 68, schemaFile: 'N/A · UI at FAR-4', uiClosedAtSprint: 68, evidenceFiles: ['src/pages/erp/Dashboard.tsx'] },
  { id: 'FK-CAP-8', name: 'FA Register → Linked Machines reverse-display', state: 'full', lastChangedSprint: 66, schemaFile: 'N/A · UI at FAR-2', uiClosedAtSprint: 66, evidenceFiles: ['src/pages/erp/accounting/capital-assets/FixedAssetRegister.tsx'] },
];

export function getFKCapabilityCount(): number {
  return FK_CAPABILITIES.length;
}

export function getFKCapabilityScoreSchemaStaged(): string {
  const staged = FK_CAPABILITIES.filter(c => c.state === 'schema-staged').length;
  return `${staged}/8`;
}

export function getFKCapabilityScoreFullOnly(): string {
  const full = FK_CAPABILITIES.filter(c => c.state === 'full').length;
  return `${full}/8`;
}
