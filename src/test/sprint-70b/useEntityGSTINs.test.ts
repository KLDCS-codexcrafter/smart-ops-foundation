/**
 * @file        src/test/sprint-70b/useEntityGSTINs.test.ts
 * @purpose     Hook tests · Sprint 70b Cycle-2 Block 9 · useEntityGSTINs (multi-GSTIN)
 * @sprint      Sprint 70b · T-Phase-5.A.1.2-PASS-B · Cycle-2 · MB-3c
 * @lesson-23   Hook signature grepped from src/hooks/useEntityGSTINs.ts pre-write
 *              returns { gstins, activeGSTIN, setActiveGSTIN, loading }
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEntityGSTINs } from '@/hooks/useEntityGSTINs';

beforeEach(() => {
  localStorage.clear();
});

const REG = {
  gstin: '27ABCDE1234F1Z5',
  state: 'Maharashtra',
  registrationType: 'Regular',
  gstr1Periodicity: 'Monthly',
  gstinVerified: true,
};

describe('Sprint 70b · useEntityGSTINs (FR-43)', () => {
  it('returns empty gstins[] and empty activeGSTIN when entity_id is empty string', () => {
    const { result } = renderHook(() => useEntityGSTINs(''));
    expect(result.current.gstins).toEqual([]);
    expect(result.current.activeGSTIN).toBe('');
  });

  it('returns empty gstins[] when entity has no gstRegs', () => {
    localStorage.setItem('erp_companies', JSON.stringify([{ id: 'C0', gstRegs: [] }]));
    const { result } = renderHook(() => useEntityGSTINs('C0'));
    expect(result.current.gstins).toEqual([]);
    expect(result.current.activeGSTIN).toBe('');
  });

  it('reads from erp_parent_company when entity_id="parent-root"', () => {
    localStorage.setItem('erp_parent_company', JSON.stringify({ gstRegs: [REG] }));
    const { result } = renderHook(() => useEntityGSTINs('parent-root'));
    expect(result.current.gstins.length).toBe(1);
    expect(result.current.gstins[0].gstin).toBe(REG.gstin);
  });

  it('reads from erp_companies when entity_id matches a company id', () => {
    localStorage.setItem(
      'erp_companies',
      JSON.stringify([
        {
          id: 'C1',
          gstRegs: [{ ...REG, gstin: '29ABCDE1234F1Z5', state: 'Karnataka' }],
        },
      ]),
    );
    const { result } = renderHook(() => useEntityGSTINs('C1'));
    expect(result.current.gstins.length).toBe(1);
    expect(result.current.gstins[0].state).toBe('Karnataka');
  });

  it('reads from erp_subsidiaries when entity_id matches a subsidiary id', () => {
    localStorage.setItem(
      'erp_subsidiaries',
      JSON.stringify([
        {
          id: 'S1',
          gstRegs: [{ ...REG, gstin: '07ABCDE1234F1Z5', state: 'Delhi' }],
        },
      ]),
    );
    const { result } = renderHook(() => useEntityGSTINs('S1'));
    expect(result.current.gstins.length).toBe(1);
    expect(result.current.gstins[0].state).toBe('Delhi');
  });

  it('first GSTIN is is_primary=true and state_code is derived from gstin[0..1]', () => {
    localStorage.setItem('erp_parent_company', JSON.stringify({ gstRegs: [REG] }));
    const { result } = renderHook(() => useEntityGSTINs('parent-root'));
    expect(result.current.gstins[0].is_primary).toBe(true);
    expect(result.current.gstins[0].state_code).toBe('27');
  });

  it('setActiveGSTIN updates activeGSTIN', () => {
    localStorage.setItem(
      'erp_parent_company',
      JSON.stringify({
        gstRegs: [REG, { ...REG, gstin: '29ABCDE1234F1Z5', state: 'Karnataka' }],
      }),
    );
    const { result } = renderHook(() => useEntityGSTINs('parent-root'));
    expect(result.current.activeGSTIN).toBe('27ABCDE1234F1Z5');
    act(() => result.current.setActiveGSTIN('29ABCDE1234F1Z5'));
    expect(result.current.activeGSTIN).toBe('29ABCDE1234F1Z5');
  });

  it('loading flips to false after mount', () => {
    const { result } = renderHook(() => useEntityGSTINs('parent-root'));
    expect(result.current.loading).toBe(false);
  });
});
