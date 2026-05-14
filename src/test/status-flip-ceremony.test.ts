/**
 * @file        src/test/status-flip-ceremony.test.ts
 * @purpose     ⭐ MOAT #24 banking · servicedesk status flip 'coming_soon' → 'active' · ACTIVE 24→25
 * @sprint      T-Phase-1.C.2 · Block F.2
 */
import { describe, it, expect } from 'vitest';
import { OPERIX_APPLICATIONS } from '@/components/operix-core/applications';

describe('Status flip ceremony · ServiceDesk → active · MOAT #24', () => {
  it('servicedesk has status: active (post-flip)', () => {
    const sd = OPERIX_APPLICATIONS.find((a) => a.id === 'servicedesk');
    expect(sd).toBeDefined();
    expect(sd?.status).toBe('active');
  });

  it('ACTIVE roster count = 25 (was 24 · +1 servicedesk)', () => {
    const active = OPERIX_APPLICATIONS.filter((a) => a.status === 'active');
    expect(active.length).toBe(25);
  });

  it('servicedesk route remains /erp/servicedesk', () => {
    const sd = OPERIX_APPLICATIONS.find((a) => a.id === 'servicedesk');
    expect(sd?.route).toBe('/erp/servicedesk');
  });

  it('servicedesk description references Smartpower-type institutional foreshadowing', () => {
    const sd = OPERIX_APPLICATIONS.find((a) => a.id === 'servicedesk');
    expect(sd?.description.toLowerCase()).toContain('smartpower');
  });
});
