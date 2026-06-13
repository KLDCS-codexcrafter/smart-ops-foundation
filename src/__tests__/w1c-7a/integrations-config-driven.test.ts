/**
 * W1C-7a · Block 3 — Integrations are config-driven (ruling b · no fake connected).
 *   - Demo entity → seeded "connected" set (Tally · GST Portal · SMTP).
 *   - Fresh real entity (no key) → every integration shows not_configured.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  seedCCConfigForDemoEntities,
  loadIntegrationsForEntity,
  DEMO_ENTITY_CODES,
} from '@/lib/cc-config-seed';

beforeEach(() => localStorage.clear());

describe('W1C-7a · integrations config-driven', () => {
  it('demo entity → connected set renders', () => {
    seedCCConfigForDemoEntities();
    const list = loadIntegrationsForEntity(DEMO_ENTITY_CODES[0]);
    const map = Object.fromEntries(list.map(r => [r.name, r.status]));
    expect(map['Tally ERP']).toBe('connected');
    expect(map['GST Portal']).toBe('connected');
    expect(map['SMTP Email']).toBe('connected');
    expect(map['WhatsApp Business']).toBe('not_configured');
    expect(map['SMS Gateway']).toBe('not_configured');
  });

  it('fresh real entity (no key) → every integration is not_configured', () => {
    const list = loadIntegrationsForEntity('NONDEMO_NEW');
    expect(list.length).toBeGreaterThan(0);
    for (const r of list) expect(r.status).toBe('not_configured');
  });
});
