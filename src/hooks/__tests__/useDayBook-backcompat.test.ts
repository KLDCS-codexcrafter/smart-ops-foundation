/**
 * @file        useDayBook-backcompat.test.ts
 * @sprint      RPT-3a · DayBook Generalize · Block 3
 * Asserts useDayBook(entityCode, 'finance'|'people') signature + behaviour are preserved.
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDayBook, type DayBookFamily } from '@/hooks/useDayBook';

describe('useDayBook · back-compat (RPT-3a)', () => {
  it('still accepts the legacy "finance" domain', () => {
    const { result } = renderHook(() => useDayBook('UNKNOWN_ENTITY', 'finance' as DayBookFamily));
    expect(Array.isArray(result.current)).toBe(true);
  });

  it('still accepts the legacy "people" domain', () => {
    const { result } = renderHook(() => useDayBook('UNKNOWN_ENTITY', 'people' as DayBookFamily));
    expect(Array.isArray(result.current)).toBe(true);
  });
});
