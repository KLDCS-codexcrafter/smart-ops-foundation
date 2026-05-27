/**
 * @file        src/lib/comply360-role-config.test.ts
 * @purpose     Unit tests · DP-S69-6 role matrix for Comply360 mega-menus
 * @sprint      Sprint 69 · T-Phase-5.A.1.1 · Cycle 2 Remediation · Block 7
 */
import { describe, it, expect } from 'vitest';
import {
  COMPLY360_ROLE_MATRIX,
  canSeeModule,
  filterModulesByRole,
  type Comply360Role,
} from './comply360-role-config';
import type { Comply360Module } from '@/pages/erp/comply360/Comply360Sidebar.types';

describe('COMPLY360_ROLE_MATRIX', () => {
  it('has entries for all 8 roles', () => {
    const expected: Comply360Role[] = [
      'super_admin', 'tenant_admin', 'finance', 'compliance_officer',
      'auditor_external', 'auditor_internal', 'hr', 'view_only',
    ];
    for (const r of expected) {
      expect(COMPLY360_ROLE_MATRIX[r]).toBeDefined();
    }
  });

  it('view_only is the most restrictive non-admin role', () => {
    expect(COMPLY360_ROLE_MATRIX.view_only.length).toBeLessThan(
      COMPLY360_ROLE_MATRIX.finance.length,
    );
  });
});

describe('canSeeModule', () => {
  it('super_admin sees everything', () => {
    expect(canSeeModule('super_admin', 'admin')).toBe(true);
    expect(canSeeModule('super_admin', 'ai-center')).toBe(true);
  });
  it('tenant_admin sees everything', () => {
    expect(canSeeModule('tenant_admin', 'integrations')).toBe(true);
  });
  it('view_only cannot see admin', () => {
    expect(canSeeModule('view_only', 'admin')).toBe(false);
    expect(canSeeModule('view_only', 'home')).toBe(true);
  });
  it('hr can see payroll but not tax-gst', () => {
    expect(canSeeModule('hr', 'payroll')).toBe(true);
    expect(canSeeModule('hr', 'tax-gst')).toBe(false);
  });
  it('auditor_external is read-narrow', () => {
    expect(canSeeModule('auditor_external', 'external-audit')).toBe(true);
    expect(canSeeModule('auditor_external', 'payroll')).toBe(false);
  });
  it('compliance_officer covers most modules but not admin', () => {
    expect(canSeeModule('compliance_officer', 'tax-gst')).toBe(true);
    expect(canSeeModule('compliance_officer', 'admin')).toBe(false);
  });
});

describe('filterModulesByRole', () => {
  const items: Array<{ id: Comply360Module; label: string }> = [
    { id: 'home', label: 'Home' },
    { id: 'tax-gst', label: 'Tax' },
    { id: 'admin', label: 'Admin' },
    { id: 'payroll', label: 'Payroll' },
  ];

  it('view_only keeps only home', () => {
    const r = filterModulesByRole(items, 'view_only');
    expect(r.map((i) => i.id)).toEqual(['home']);
  });
  it('hr keeps home and payroll', () => {
    const r = filterModulesByRole(items, 'hr');
    expect(r.map((i) => i.id)).toEqual(['home', 'payroll']);
  });
  it('tenant_admin keeps everything', () => {
    const r = filterModulesByRole(items, 'tenant_admin');
    expect(r.length).toBe(4);
  });
});
