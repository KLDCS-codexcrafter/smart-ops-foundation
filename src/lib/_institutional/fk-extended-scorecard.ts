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
}

export const FK_CAPABILITIES: FKCapability[] = [
  { id: 'FK-CAP-1', name: 'Custodian (FA AssetUnitRecord) ↔ Employee (Pay Hub)', state: 'schema-staged', lastChangedSprint: 64, schemaFile: 'src/types/fixed-asset.ts (custodian_employee_id)', uiClosedAtSprint: null },
  { id: 'FK-CAP-2', name: 'Machine (Production) ↔ Fixed Asset (bidirectional UI)', state: 'partial', lastChangedSprint: null, schemaFile: 'src/types/machine.ts (fixed_asset_id · EXISTING) + FA Register reverse-display', uiClosedAtSprint: null },
  { id: 'FK-CAP-3', name: 'Equipment (MaintainPro) ↔ Fixed Asset + 4-shape unification', state: 'schema-staged', lastChangedSprint: 64, schemaFile: 'src/types/maintainpro.ts (fixed_asset_id) + src/lib/physical-asset-unit-bridge.ts (4-shape)', uiClosedAtSprint: null },
  { id: 'FK-CAP-4', name: 'Pay Hub Asset ↔ Fixed Asset (bidirectional)', state: 'schema-staged', lastChangedSprint: 64, schemaFile: 'src/types/asset-master.ts (fixed_asset_id)', uiClosedAtSprint: null },
  { id: 'FK-CAP-5', name: 'Employee.EquipmentIssued[].asset_id FK', state: 'schema-staged', lastChangedSprint: 64, schemaFile: 'src/types/employee.ts (asset_id)', uiClosedAtSprint: null },
  { id: 'FK-CAP-6', name: 'Production sidebar Machine List + FA-linked Machines report', state: 'absent', lastChangedSprint: null, schemaFile: 'src/apps/erp/configs/production-sidebar-config.ts + src/pages/erp/production/reports/FALinkedMachinesPanel.tsx', uiClosedAtSprint: null },
  { id: 'FK-CAP-7', name: '/erp/dashboard FA card lane (4 tiles)', state: 'absent', lastChangedSprint: null, schemaFile: 'N/A · UI at FAR-4', uiClosedAtSprint: null },
  { id: 'FK-CAP-8', name: 'FA Register → Linked Machines reverse-display', state: 'absent', lastChangedSprint: null, schemaFile: 'src/pages/erp/accounting/capital-assets/FixedAssetRegister.tsx', uiClosedAtSprint: null },
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
