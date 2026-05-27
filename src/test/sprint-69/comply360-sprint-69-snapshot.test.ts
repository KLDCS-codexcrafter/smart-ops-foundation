/**
 * @file        src/test/sprint-69/comply360-sprint-69-snapshot.test.ts
 * @purpose     Sprint 69 institutional snapshot · Comply360 Main Arc 1.1
 * @sprint      Sprint 69 · T-Phase-5.A.1.1 · Cycle 3 · Block 4
 * @disciplines FR-58 · FR-100 RECG · Lesson 24 historical-snapshot from inception
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

import { applications } from '@/components/operix-core/applications';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { comply360SidebarItems } from '@/apps/erp/configs/comply360-sidebar-config';
import { COMPLIANCE_MODULE_WEIGHTS } from '@/lib/comply360-health-score-engine';
import { COMPLY360_DEFAULT_ENTITY_PREFS } from '@/lib/cc-compliance-settings';

describe('Sprint 69 · T-Phase-5.A.1.1 · Comply360 Main Arc 1.1 · institutional snapshot (FR-58 + Lesson 24 historical-snapshot)', () => {
  it('Sprint 69 entry exists in sprint-history with grade A with adaptations', () => {
    const entry = SPRINTS.find((s) => s.sprintNumber === 69);
    expect(entry).toBeDefined();
    expect(entry?.code).toBe('T-Phase-5.A.1.1');
    expect(entry?.grade).toBe('A with adaptations');
    expect(entry?.predecessorSha).toBe('9925e6269e53e5a0d30b8e2669fb3fde5398e9fb');
  });

  it('comply360-health-score-engine SIBLING registered with CONFIRMED provenance', () => {
    const sibling = SIBLINGS.find((s) => s.id === 'comply360-health-score-engine');
    expect(sibling).toBeDefined();
    expect(sibling?.path).toBe('src/lib/comply360-health-score-engine.ts');
    expect(sibling?.provenance).toBe('CONFIRMED');
    expect(sibling?.sprintAdded).toBe(69);
  });

  it('comply360-statutory-memory SIBLING registered with CONFIRMED provenance', () => {
    const sibling = SIBLINGS.find((s) => s.id === 'comply360-statutory-memory');
    expect(sibling).toBeDefined();
    expect(sibling?.path).toBe('src/lib/comply360-statutory-memory.ts');
    expect(sibling?.provenance).toBe('CONFIRMED');
    expect(sibling?.sprintAdded).toBe(69);
  });

  it('FR-100 RECG · Sprint 69 SIBLING backing files exist on disk at HEAD', () => {
    const repoRoot = process.cwd();
    const s69 = SIBLINGS.filter((s) => s.sprintAdded === 69);
    expect(s69.length).toBeGreaterThanOrEqual(2);
    for (const sib of s69) {
      const full = path.join(repoRoot, sib.path ?? '');
      expect(fs.existsSync(full), `${sib.id} backing file missing: ${sib.path}`).toBe(true);
    }
  });

  it('comply360 application has status active and route /erp/comply360', () => {
    const app = applications.find((a) => a.id === 'comply360');
    expect(app).toBeDefined();
    expect(app?.status).toBe('active');
    expect(app?.route).toBe('/erp/comply360');
  });

  it('comply360 sidebar exports the canonical 23 mega-menu ids per Bharat Comply 360 SSOT', () => {
    const actualIds = comply360SidebarItems.map((i) => i.id);
    const expectedIds = [
      'home', 'calendar', 'companies', 'tax-gst', 'payroll', 'payments',
      'challan-vault', 'roc', 'fixed-assets', 'internal-audit', 'external-audit',
      'exim', 'vendor', 'licenses', 'esg', 'legal', 'finance-hub', 'reports',
      'ai-center', 'docs', 'integrations', 'workflow', 'admin',
    ];
    for (const id of expectedIds) {
      expect(actualIds, `mega-menu id "${id}" missing`).toContain(id);
    }
  });

  it('DP-S69-5 module weights sum to 1.0 (ratified)', () => {
    const sum = Object.values(COMPLIANCE_MODULE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1.0)).toBeLessThan(1e-9);
    expect(COMPLIANCE_MODULE_WEIGHTS['tax-gst']).toBe(0.20);
    expect(COMPLIANCE_MODULE_WEIGHTS['tds']).toBe(0.15);
    expect(COMPLIANCE_MODULE_WEIGHTS['mca-roc']).toBe(0.15);
    expect(COMPLIANCE_MODULE_WEIGHTS['payroll']).toBe(0.15);
    expect(COMPLIANCE_MODULE_WEIGHTS['audit-trail']).toBe(0.10);
    expect(COMPLIANCE_MODULE_WEIGHTS['licenses']).toBe(0.10);
    expect(COMPLIANCE_MODULE_WEIGHTS['msme']).toBe(0.05);
    expect(COMPLIANCE_MODULE_WEIGHTS['esg']).toBe(0.05);
    expect(COMPLIANCE_MODULE_WEIGHTS['other']).toBe(0.05);
  });

  it('Comply360EntityPrefs schema exists with sane defaults', () => {
    expect(COMPLY360_DEFAULT_ENTITY_PREFS).toBeDefined();
    expect(COMPLY360_DEFAULT_ENTITY_PREFS.show_statutory_memory_widget).toBe(true);
    expect(COMPLY360_DEFAULT_ENTITY_PREFS.show_health_score_breakdown).toBe(true);
    expect(typeof COMPLY360_DEFAULT_ENTITY_PREFS.alert_threshold_overdue).toBe('number');
    expect(typeof COMPLY360_DEFAULT_ENTITY_PREFS.alert_threshold_health_score).toBe('number');
  });

  it('Dashboard FA tile refresh imports the weighted health engine (D-S69-4 LIVE)', () => {
    const dashSrc = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/erp/Dashboard.tsx'),
      'utf-8',
    );
    expect(dashSrc).toContain('computeWeightedComplianceHealth');
    expect(dashSrc).toContain('@/lib/comply360-statutory-memory');
  });
});
