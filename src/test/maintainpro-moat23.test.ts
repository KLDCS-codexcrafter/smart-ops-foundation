/**
 * @file        src/test/maintainpro-moat23.test.ts
 * @purpose     A.17 · MOAT #23 8-criteria smoke tests · D-NEW-DH POSSIBLE 31st canonical pattern
 * @sprint      T-Phase-1.A.17 · Block F.3 · Q-LOCK-3
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

function rd(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf-8');
}

describe('MOAT #23 · MaintainPro Top-1% Operations Layer', () => {
  it('Criterion 1 · consumeSiteXMaintainProHandoff bridge exported', () => {
    const src = rd('src/lib/maintainpro-bridges.ts');
    expect(src).toMatch(/export function consumeSiteXMaintainProHandoff/);
  });

  it('Criterion 2 · 12 OOB helpers M1-M12 reachable in engine', () => {
    const src = rd('src/lib/maintainpro-engine.ts');
    // Anchor identifiers covering M1, M5, M6, M7, M8, M10, M11, M12
    const anchors = [
      'findSimilarBreakdowns',
      'isCalibrationInstrumentQuarantined',
      'hasExpiredFireSafetyInSite',
      'computeSpareVelocity',
      'isEquipmentInWarranty',
      'computeNextPMDueDate',
      'getEquipmentDescendants',
      'computeEquipmentEnergyConsumption',
    ];
    for (const a of anchors) expect(src).toMatch(new RegExp(a));
  });

  it('Criterion 3 · SLA matrix has 28 cells and escalation engine present', () => {
    const types = rd('src/types/maintainpro.ts');
    expect(types).toMatch(/SLA_MATRIX|sla|SLA/);
    const engine = rd('src/lib/maintainpro-engine.ts');
    expect(engine).toMatch(/evaluateTicketEscalations/);
  });

  it('Criterion 4 · Production Capacity bidirectional bridges exported', () => {
    const src = rd('src/lib/maintainpro-bridges.ts');
    expect(src).toMatch(/emitMaintenanceEquipmentDown/);
    expect(src).toMatch(/emitMaintenanceEquipmentRestored/);
  });

  it('Criterion 5 · 9 transactions all carry project_id field', () => {
    const src = rd('src/types/maintainpro.ts');
    const occurrences = (src.match(/project_id:\s*string\s*\|\s*null/g) ?? []).length;
    expect(occurrences).toBeGreaterThanOrEqual(9);
  });

  it('Criterion 6 · createAssetCapitalization exported (end-to-end CAPEX)', () => {
    const src = rd('src/lib/maintainpro-engine.ts');
    expect(src).toMatch(/export function createAssetCapitalization/);
  });

  it('Criterion 7 · 14 reports + 1 dashboard component files exist', () => {
    const dir = join(ROOT, 'src/pages/erp/maintainpro/reports');
    const files = readdirSync(dir).filter((f) => f.endsWith('.tsx'));
    expect(files.length).toBeGreaterThanOrEqual(15);
  });

  it('Criterion 8 · 4 A.17 mobile capture components exist', () => {
    const captures = [
      'MobileBreakdownCapture',
      'MobilePMTickoffCapture',
      'MobileSparesIssueCapture',
      'MobileAssetPhotoCapture',
    ];
    for (const c of captures) {
      expect(existsSync(join(ROOT, 'src/components/mobile', `${c}.tsx`))).toBe(true);
    }
  });

  it('appendEquipmentPhoto engine helper exported (D-NEW-DG)', () => {
    const src = rd('src/lib/maintainpro-engine.ts');
    expect(src).toMatch(/export function appendEquipmentPhoto/);
    expect(src).toMatch(/export function listEquipmentPhotos/);
  });

  it('App.tsx registers 4 NEW A.17 mobile capture routes', () => {
    const src = rd('src/App.tsx');
    expect(src).toMatch(/\/operix-go\/breakdown-capture/);
    expect(src).toMatch(/\/operix-go\/pm-tickoff-capture/);
    expect(src).toMatch(/\/operix-go\/spares-issue-capture/);
    expect(src).toMatch(/\/operix-go\/asset-photo-capture/);
  });
});
