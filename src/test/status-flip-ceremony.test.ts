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

  it('ACTIVE roster includes servicedesk + eximx + comply360 (Lesson 24 historical-snapshot · 3rd recurrence post-Sprint-69 Cycle-3)', () => {
    // Sprint 56 flip: servicedesk → active (active count was 25)
    // Sprint EX-1 flip: eximx → active (active count was 26)
    // Sprint 69 flip: comply360 → active (active count was 27 at Sprint 69 bank · FR-103 chain)
    // Future flips extend this list; DO NOT assert active.length.
    const active = applications.filter((a) => a.status === 'active');
    const activeIds = active.map((a) => a.id);
    expect(activeIds).toContain('servicedesk');
    expect(activeIds).toContain('eximx');
    expect(activeIds).toContain('comply360');
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
