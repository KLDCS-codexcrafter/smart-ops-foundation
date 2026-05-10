/**
 * @file src/test/engineeringx-reference-library.test.ts
 * @sprint T-Phase-1.A.12 · Q-LOCK-14a · Block H.2
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

describe('T-Phase-1.A.12 · Reference Project Library + CloneDrawing', () => {
  it('ReferenceProjectLibrary panel exists · ProjX + EngineeringX consumer', () => {
    const p = 'src/pages/erp/engineeringx/registers/ReferenceProjectLibrary.tsx';
    expect(existsSync(p)).toBe(true);
    const content = readFileSync(p, 'utf8');
    expect(content).toMatch(/useProjects/);
    expect(content).toMatch(/listDrawingsByProject/);
  });

  it('CloneDrawing form · D-NEW-CE 16th consumer · FR-29 12-item discipline', () => {
    const p = 'src/pages/erp/engineeringx/transactions/CloneDrawing.tsx';
    expect(existsSync(p)).toBe(true);
    const content = readFileSync(p, 'utf8');
    expect(content).toMatch(/useFormCarryForwardChecklist/);
    expect(content).toMatch(/D-NEW-CE/);
    // 12 FR-29 keys present
    const keys = [
      'useLastVoucher', 'sprint27d1', 'sprint27d2', 'sprint27e',
      'keyboardOverlay', 'draftRecovery', 'decimalHelpers', 'fr30Header',
      'smartDefaults', 'pinnedTemplates', 'ctrlSSave', 'saveAndNewCarryover',
    ];
    for (const k of keys) expect(content).toContain(k);
  });

  it('CloneDrawing sets reference_source_drawing_id custom_tag (D-NEW-CP)', () => {
    const content = readFileSync('src/pages/erp/engineeringx/transactions/CloneDrawing.tsx', 'utf8');
    expect(content).toMatch(/reference_source_drawing_id/);
    expect(content).toMatch(/D-NEW-CP/);
  });

  it('reference_source_drawing_id present in DRAWING_CUSTOM_TAG_KEYS', () => {
    const content = readFileSync('src/types/engineering-drawing.ts', 'utf8');
    expect(content).toMatch(/reference_source_drawing_id/);
  });

  it('ReferenceProjectsPlaceholder.tsx deleted', () => {
    expect(existsSync('src/pages/erp/engineeringx/placeholders/ReferenceProjectsPlaceholder.tsx')).toBe(false);
  });

  it('EngineeringX sidebar has e b · e g · e l · e c shortcuts (D-NEW-CC extension)', () => {
    const content = readFileSync('src/apps/erp/configs/engineeringx-sidebar-config.ts', 'utf8');
    expect(content).toMatch(/'e b'/);
    expect(content).toMatch(/'e g'/);
    expect(content).toMatch(/'e l'/);
    expect(content).toMatch(/'e c'/);
  });

  it('EngineeringXModule union has 11 elements at A.12', () => {
    const content = readFileSync('src/pages/erp/engineeringx/EngineeringXSidebar.types.ts', 'utf8');
    const matches = content.match(/^\s*\|\s*'/gm);
    expect(matches?.length).toBe(11);
  });
});
