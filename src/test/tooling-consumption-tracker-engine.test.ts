/**
 * @file        src/test/tooling-consumption-tracker-engine.test.ts
 * @sprint      T-Phase-3.PROD-2 · ST14 · LEAK-14 coverage
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectToolingAlerts,
  listOpenToolingAlerts,
  acknowledgeToolingAlert,
  resetTool,
  toolingRegisterKey,
} from '@/lib/tooling-consumption-tracker-engine';

const ENTITY = 'TEST-TOOL';

beforeEach(() => localStorage.clear());

describe('tooling-consumption-tracker-engine', () => {
  it('returns no alerts when register is empty', () => {
    expect(detectToolingAlerts(ENTITY)).toEqual([]);
  });

  it('flags EOL when consumed >= expected_life', () => {
    localStorage.setItem(toolingRegisterKey(ENTITY), JSON.stringify([
      { tool_id: 't1', tool_name: 'Insert A', machine_id: 'm1',
        expected_life_units: 1000, consumed_units: 1050,
        installed_at: '2025-01-01', last_reset_at: null },
    ]));
    const alerts = detectToolingAlerts(ENTITY);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('eol');
  });

  it('warning band 80-95%', () => {
    localStorage.setItem(toolingRegisterKey(ENTITY), JSON.stringify([
      { tool_id: 't1', tool_name: 'Insert A', machine_id: 'm1',
        expected_life_units: 1000, consumed_units: 820,
        installed_at: '2025-01-01', last_reset_at: null },
    ]));
    const alerts = detectToolingAlerts(ENTITY);
    expect(alerts[0].severity).toBe('warning');
  });

  it('ack + reset lifecycle', () => {
    localStorage.setItem(toolingRegisterKey(ENTITY), JSON.stringify([
      { tool_id: 't1', tool_name: 'Insert A', machine_id: 'm1',
        expected_life_units: 1000, consumed_units: 960,
        installed_at: '2025-01-01', last_reset_at: null },
    ]));
    const alerts = detectToolingAlerts(ENTITY);
    expect(alerts.length).toBe(1);
    acknowledgeToolingAlert(alerts[0].id, ENTITY);
    expect(listOpenToolingAlerts(ENTITY).length).toBe(0);
    resetTool('t1', ENTITY);
    const after = detectToolingAlerts(ENTITY);
    expect(after.length).toBe(0);
  });
});
