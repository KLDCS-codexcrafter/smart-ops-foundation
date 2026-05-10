/**
 * @file src/test/d-new-cf-jobcard-source-ncr.test.ts
 * @sprint T-Phase-1.A.5.d-1-Trident-Reports-Reprocess-Bridge · Block A
 * @decisions D-NEW-CF · D-NEW-BV
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { findReworkJobCardsForNcr } from '@/lib/qualicheck-bridges';

const ENTITY = 'TEST_CF';
const KEY = `erp_job_cards_${ENTITY}`;

describe('D-NEW-CF · JobCard source_ncr_id', () => {
  beforeEach(() => { localStorage.clear(); });

  it('returns [] when storage empty or missing NCR id', () => {
    expect(findReworkJobCardsForNcr(ENTITY, null)).toEqual([]);
    expect(findReworkJobCardsForNcr(ENTITY, 'NCR-1')).toEqual([]);
  });

  it('legacy JobCards (without source_ncr_id) round-trip without breaking', () => {
    localStorage.setItem(KEY, JSON.stringify([
      { id: 'jc-1', doc_no: 'JC/0001', rework_qty: 0, status: 'planned' },
    ]));
    expect(findReworkJobCardsForNcr(ENTITY, 'NCR-1')).toEqual([]);
  });

  it('returns matches filtered by rework_qty>0 AND source_ncr_id', () => {
    localStorage.setItem(KEY, JSON.stringify([
      { id: 'jc-1', doc_no: 'JC/0001', rework_qty: 0, source_ncr_id: 'NCR-1', status: 'planned' },
      { id: 'jc-2', doc_no: 'JC/0002', rework_qty: 5, source_ncr_id: 'NCR-1', status: 'in_progress', actual_start: '2026-05-09T10:00:00Z' },
      { id: 'jc-3', doc_no: 'JC/0003', rework_qty: 3, source_ncr_id: 'NCR-2', status: 'planned' },
    ]));
    const matches = findReworkJobCardsForNcr(ENTITY, 'NCR-1');
    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe('jc-2');
    expect(matches[0].rework_qty).toBe(5);
  });

  it('returns [] on malformed JSON', () => {
    localStorage.setItem(KEY, '{ broken json');
    expect(findReworkJobCardsForNcr(ENTITY, 'NCR-1')).toEqual([]);
  });
});
