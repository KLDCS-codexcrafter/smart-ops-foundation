/**
 * @file        src/test/settings-ui-4-pages.test.ts
 * @purpose     Verify 4 settings UI pages exist + consume getter helpers · MOAT #24 banking
 * @sprint      T-Phase-1.C.2 · Block F.1
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCommissionRateSettings,
  getEmailTemplateSettings,
  getTellicallerTriggerSettings,
  DEFAULT_COMMISSION_RATE_SETTINGS,
} from '@/lib/cc-compliance-settings';
import { listActiveCallTypes } from '@/lib/servicedesk-engine';

describe('Settings UI 4 pages · helper consumption', () => {
  beforeEach(() => localStorage.clear());

  it('CommissionRates getter returns defaults on first read', () => {
    const s = getCommissionRateSettings('DEMO');
    expect(s.salesman_default_rate).toBe(DEFAULT_COMMISSION_RATE_SETTINGS.salesman_default_rate);
  });

  it('EmailTemplates getter returns shape with templates array', () => {
    const s = getEmailTemplateSettings('DEMO');
    expect(Array.isArray(s.templates)).toBe(true);
  });

  it('TellicallerTriggers getter returns shape with triggers array', () => {
    const s = getTellicallerTriggerSettings('DEMO');
    expect(Array.isArray(s.triggers)).toBe(true);
  });

  it('CallTypeMaster surfaces active call types from engine', () => {
    const cts = listActiveCallTypes();
    expect(Array.isArray(cts)).toBe(true);
    expect(cts.every((c) => c.is_active)).toBe(true);
  });

  it('All 4 settings UI files importable', async () => {
    const m1 = await import('@/pages/erp/servicedesk/settings/CommissionRatesSettings');
    const m2 = await import('@/pages/erp/servicedesk/settings/EmailTemplatesSettings');
    const m3 = await import('@/pages/erp/servicedesk/settings/TellicallerTriggersSettings');
    const m4 = await import('@/pages/erp/servicedesk/settings/CallTypeMasterSettings');
    expect(m1.CommissionRatesSettings).toBeDefined();
    expect(m2.EmailTemplatesSettings).toBeDefined();
    expect(m3.TellicallerTriggersSettings).toBeDefined();
    expect(m4.CallTypeMasterSettings).toBeDefined();
  });
});
