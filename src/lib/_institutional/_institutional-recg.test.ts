/**
 * @file        src/lib/_institutional/_institutional-recg.test.ts
 * @purpose     Register-Empirical Coupling Gate (RECG · FR-101 candidate · Lesson 22)
 * @sprint      T-Phase-4.FAR-2 · Block 13 · structural immune system
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { FAR_CAPABILITIES } from './far-extended-scorecard';
import { FK_CAPABILITIES } from './fk-extended-scorecard';
import { MOATS } from './moat-register';
import { SIBLINGS } from './sibling-register';

const REPO_ROOT = process.cwd();

describe('Register-Empirical Coupling Gate (RECG) · FR-101 candidate · Lesson 22 immune response', () => {

  describe('FAR-CAPs claiming FULL must have evidenceFiles existing on disk', () => {
    for (const cap of FAR_CAPABILITIES.filter(c => c.state === 'full')) {
      it(`${cap.id} (${cap.name}) · evidenceFiles all exist`, () => {
        const evidence = cap.evidenceFiles;
        if (!evidence || evidence.length === 0) {
          throw new Error(
            `${cap.id} claims FULL but has no evidenceFiles · RECG hard gate`,
          );
        }
        for (const path of evidence) {
          expect(existsSync(join(REPO_ROOT, path)), `${cap.id} evidenceFile missing: ${path}`).toBe(true);
        }
      });
    }
  });

  describe('FK-CAPs claiming FULL must have evidenceFiles existing on disk', () => {
    for (const cap of FK_CAPABILITIES.filter(c => c.state === 'full')) {
      it(`${cap.id} (${cap.name}) · evidenceFiles all exist`, () => {
        const evidence = cap.evidenceFiles;
        if (!evidence || evidence.length === 0) {
          throw new Error(
            `${cap.id} claims FULL but has no evidenceFiles · RECG hard gate`,
          );
        }
        for (const path of evidence) {
          expect(existsSync(join(REPO_ROOT, path)), `${cap.id} evidenceFile missing: ${path}`).toBe(true);
        }
      });
    }
  });

  describe('MOATs CONFIRMED must have all backingFiles existing on disk', () => {
    for (const moat of MOATS.filter(m => m.provenance === 'CONFIRMED')) {
      it(`${moat.id} backingFiles all exist`, () => {
        const backing = moat.backingFiles;
        if (!backing || backing.length === 0) return; // historical moats grandfathered
        for (const path of backing) {
          expect(existsSync(join(REPO_ROOT, path)), `${moat.id} backingFile missing: ${path}`).toBe(true);
        }
      });
    }
  });

  describe('SIBLINGs CONFIRMED must have path existing on disk', () => {
    for (const sib of SIBLINGS.filter(s => s.provenance === 'CONFIRMED')) {
      it(`${sib.id} path exists`, () => {
        if (!sib.path) return;
        expect(existsSync(join(REPO_ROOT, sib.path)), `${sib.id} path missing: ${sib.path}`).toBe(true);
      });
    }
  });

  describe('Empirical PATTERN_CHECKS · grep-able UI patterns must match', () => {
    const PATTERN_CHECKS: Array<[string, string, string]> = [
      ['FK-CAP-1', 'src/pages/erp/accounting/capital-assets/CapitalAssetMaster.tsx', 'custodian_employee_id'],
      ['FK-CAP-3', 'src/pages/erp/maintainpro/masters/EquipmentMaster.tsx', 'Linked Fixed Asset'],
      ['FK-CAP-5', 'src/pages/erp/pay-hub/masters/EmployeeMaster.tsx', 'asset_id'],
      ['FK-CAP-6', 'src/apps/erp/configs/production-sidebar-config.ts', 'assets-group'],
      ['FK-CAP-2', 'src/pages/erp/accounting/capital-assets/FixedAssetRegister.tsx', 'Linked Machines'],
      ['FK-CAP-8', 'src/pages/erp/accounting/capital-assets/FixedAssetRegister.tsx', 'Linked Machines'],
      ['FAR-CAP-12', 'src/pages/erp/accounting/capital-assets/AMCWarrantyTracker.tsx', 'Calibration'],
      ['FAR-CAP-12', 'src/pages/erp/accounting/capital-assets/FACalibrationStatusReport.tsx', 'Calibration'],
      ['FAR-CAP-13', 'src/pages/erp/accounting/capital-assets/FAPhysicalVerification.tsx', 'verification'],
      ['FAR-CAP-14', 'src/pages/erp/accounting/capital-assets/FAAMCRenewalPipeline.tsx', 'Renewal'],
      ['FAR-CAP-14', 'src/pages/erp/accounting/capital-assets/AMCWarrantyTracker.tsx', 'Renewal Pipeline'],
      ['FAR-CAP-15', 'src/pages/erp/accounting/capital-assets/FAVehicleRegister.tsx', 'Vehicle'],
      ['FAR-CAP-15', 'src/lib/vehicle-fa-bridge.ts', 'linkVehicleToFA'],
      // 🆕 Sprint 67 FAR-3 · Block 14 · PATTERN_CHECKS for FAR-CAP-16/17/18 (compute engines)
      ['FAR-CAP-16', 'src/lib/uop-depreciation-engine.ts', 'uop_units_consumed'],
      ['FAR-CAP-17', 'src/lib/component-depreciation-engine.ts', 'component_breakdown'],
      ['FAR-CAP-18', 'src/lib/multi-gaap-depreciation-engine.ts', 'IndAS'],
    ];
    for (const [capId, file, pattern] of PATTERN_CHECKS) {
      it(`${capId} · ${file} contains "${pattern}"`, () => {
        const full = join(REPO_ROOT, file);
        expect(existsSync(full), `${capId} pattern check: file missing: ${file}`).toBe(true);
        const content = readFileSync(full, 'utf8');
        expect(content.includes(pattern), `${capId}: file ${file} should contain "${pattern}"`).toBe(true);
      });
    }
  });

});
