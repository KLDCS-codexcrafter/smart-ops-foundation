/**
 * @file    src/test/useEntityManufacturingMode.test.ts
 * @sprint  T-Phase-3.PROD-2.5 · Sub-theme 11 · Q-LOCK-12
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEntityManufacturingMode } from '@/hooks/useEntityManufacturingMode';
import { applyManufacturingModeToEntity } from '@/lib/entity-setup-service';

describe('useEntityManufacturingMode', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('erp_group_entities', JSON.stringify([
      { id: 'e1', name: 'Test', shortCode: 'TEST', type: 'parent' },
    ]));
  });

  it('returns discrete preset by default', () => {
    const { result } = renderHook(() => useEntityManufacturingMode('TEST'));
    expect(result.current.mode).toBe('discrete');
    expect(result.current.l4COAPackKey).toBe('discrete_mfg');
  });

  it('returns process preset after applying process mode', () => {
    applyManufacturingModeToEntity('TEST', 'process');
    const { result } = renderHook(() => useEntityManufacturingMode('TEST'));
    expect(result.current.mode).toBe('process');
    expect(result.current.l4COAPackKey).toBe('process_mfg');
  });
});
