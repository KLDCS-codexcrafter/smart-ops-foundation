/**
 * @file Sprint 65 FAR-1 · EPCG FA bridge · ID-lookup test pattern per Lesson 19
 * @sprint T-Phase-4.FAR-1.TFix
 */
import { describe, it, expect } from 'vitest';
import {
  computeEPCGObligation,
  trackExportFulfillment,
  getEPCGStatus,
  generateEPCGStatusReport,
  linkToSinhaExportShipments,
} from '@/lib/epcg-fa-bridge';

const E = 'SINHA';
const ASSET_ID = 'fa-epcg-test-001';

describe('EPCG FA bridge · ID-lookup smoke', () => {
  it('computeEPCGObligation returns EPCGObligation shape', () => {
    const o = computeEPCGObligation(E, ASSET_ID);
    expect(o.entityCode).toBe(E);
    expect(o.assetId).toBe(ASSET_ID);
    expect(typeof o.dutySavedInr).toBe('number');
    expect(typeof o.exportObligationInr).toBe('number');
    expect(['active', 'fulfilled', 'breached', 'expired']).toContain(o.status);
  });

  it('export obligation is 6x duty saved per EPCG scheme', () => {
    const o = computeEPCGObligation(E, ASSET_ID);
    if (o.dutySavedInr > 0) {
      expect(o.exportObligationInr).toBeCloseTo(o.dutySavedInr * 6, 0);
    }
  });

  it('getEPCGStatus returns a valid status enum value', () => {
    const status = getEPCGStatus(E, ASSET_ID);
    expect(['active', 'fulfilled', 'breached', 'expired']).toContain(status);
  });

  it('trackExportFulfillment is callable (placeholder signature accepted)', () => {
    expect(() => trackExportFulfillment(E, ASSET_ID)).not.toThrow();
    const result = trackExportFulfillment(E, ASSET_ID);
    expect(Array.isArray(result)).toBe(true);
  });

  it('linkToSinhaExportShipments returns an array', () => {
    const links = linkToSinhaExportShipments(ASSET_ID, E);
    expect(Array.isArray(links)).toBe(true);
  });

  it('generateEPCGStatusReport returns EPCGStatusReport shape', () => {
    const report = generateEPCGStatusReport(E);
    expect(report).toBeDefined();
    expect(report.entityCode).toBe(E);
    expect(typeof report.totalObligations).toBe('number');
    expect(typeof report.totalExportObligationInr).toBe('number');
  });
});
