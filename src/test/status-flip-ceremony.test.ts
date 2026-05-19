/**
 * @file        src/test/status-flip-ceremony.test.ts
 * @purpose     ⭐ MOAT #24 banking · servicedesk status flip 'coming_soon' → 'active' · ACTIVE 24→25
 * @sprint      T-Phase-1.C.2 · Block F.2
 */
import { describe, it, expect } from 'vitest';
import { applications } from '@/components/operix-core/applications';

describe('Status flip ceremony · ServiceDesk → active · MOAT #24', () => {
  it('servicedesk has status: active (post-flip)', () => {
    const sd = applications.find((a) => a.id === 'servicedesk');
    expect(sd).toBeDefined();
    expect(sd?.status).toBe('active');
  });

  it('ACTIVE roster count = 26 (was 25 · +1 eximx · MOAT-28 pre-bank)', () => {
    const active = applications.filter((a) => a.status === 'active');
    expect(active.length).toBe(26);  // EX-1 flip · eximx joins · ACTIVE 25 → 26
  });

  it('servicedesk route remains /erp/servicedesk', () => {
    const sd = applications.find((a) => a.id === 'servicedesk');
    expect(sd?.route).toBe('/erp/servicedesk');
  });

  it('servicedesk description references Smartpower-type institutional foreshadowing', () => {
    const sd = applications.find((a) => a.id === 'servicedesk');
    expect(sd?.description.toLowerCase()).toContain('smartpower');
  });
});
