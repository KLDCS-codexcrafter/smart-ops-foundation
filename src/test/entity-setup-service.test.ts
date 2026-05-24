/**
 * @file    src/test/entity-setup-service.test.ts
 * @sprint  T-Phase-3.PROD-2.5 · Sub-theme 11 · Q-LOCK-12
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadManufacturingModePreset,
  applyManufacturingModeToEntity,
  getEntityManufacturingMode,
  inheritManufacturingModeFromParent,
} from '@/lib/entity-setup-service';

describe('entity-setup-service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadManufacturingModePreset returns correct preset for each mode', () => {
    const discrete = loadManufacturingModePreset('discrete');
    expect(discrete.mode).toBe('discrete');
    expect(discrete.l4COAPackKey).toBe('discrete_mfg');
    expect(discrete.productionOrderDefaults.mode).toBe('discrete');

    const process = loadManufacturingModePreset('process');
    expect(process.l4COAPackKey).toBe('process_mfg');
    expect(process.productionOrderDefaults.mode).toBe('process_batch');
  });

  it('applyManufacturingModeToEntity writes mode field only (no cascading)', () => {
    localStorage.setItem('erp_group_entities', JSON.stringify([
      { id: 'e1', name: 'Test Entity', shortCode: 'TEST', type: 'parent' },
    ]));
    applyManufacturingModeToEntity('TEST', 'process');
    const stored = JSON.parse(localStorage.getItem('erp_group_entities') || '[]');
    expect(stored[0].manufacturingMode).toBe('process');
    expect(stored[0].shortCode).toBe('TEST');
    expect(stored[0].name).toBe('Test Entity');
  });

  it('getEntityManufacturingMode returns default discrete if unset', () => {
    localStorage.setItem('erp_group_entities', JSON.stringify([
      { id: 'e1', name: 'Test Entity', shortCode: 'TEST', type: 'parent' },
    ]));
    expect(getEntityManufacturingMode('TEST')).toBe('discrete');
  });

  it('inheritManufacturingModeFromParent copies parent mode to child', () => {
    localStorage.setItem('erp_group_entities', JSON.stringify([
      { id: 'e1', name: 'Parent', shortCode: 'PARENT', type: 'parent', manufacturingMode: 'process' },
      { id: 'e2', name: 'Child', shortCode: 'CHILD', type: 'subsidiary' },
    ]));
    inheritManufacturingModeFromParent('CHILD', 'PARENT');
    expect(getEntityManufacturingMode('CHILD')).toBe('process');
  });
});
