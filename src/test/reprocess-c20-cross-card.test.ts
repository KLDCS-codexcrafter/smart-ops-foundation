/**
 * @file src/test/reprocess-c20-cross-card.test.ts
 * @sprint T-Phase-1.A.5.d-1-Trident-Reports-Reprocess-Bridge · Block F
 * @decisions Q-LOCK-4 Path B · D-NEW-CF
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { findReworkJobCardsForNcr } from '@/lib/qualicheck-bridges';

const ENTITY = 'TEST_RPC';
const KEY = `erp_job_cards_${ENTITY}`;

describe('Reprocess C20 · NCR↔Rework JobCard cross-card', () => {
  beforeEach(() => { localStorage.clear(); });

  it('NCR with matching rework JobCard surfaces linkage', () => {
    localStorage.setItem(KEY, JSON.stringify([
      { id: 'jc-1', doc_no: 'JC/0001', rework_qty: 7, source_ncr_id: 'NCR-A', status: 'in_progress' },
    ]));
    const m = findReworkJobCardsForNcr(ENTITY, 'NCR-A');
    expect(m).toHaveLength(1);
    expect(m[0].rework_qty).toBe(7);
  });

  it('NCR with rework outcome but JobCard source_ncr_id null shows empty linkage', () => {
    localStorage.setItem(KEY, JSON.stringify([
      { id: 'jc-1', doc_no: 'JC/0001', rework_qty: 5, source_ncr_id: null, status: 'planned' },
    ]));
    expect(findReworkJobCardsForNcr(ENTITY, 'NCR-A')).toEqual([]);
  });

  it('multiple JobCards aggregate under same NCR', () => {
    localStorage.setItem(KEY, JSON.stringify([
      { id: 'jc-1', doc_no: 'JC/0001', rework_qty: 3, source_ncr_id: 'NCR-B', status: 'planned' },
      { id: 'jc-2', doc_no: 'JC/0002', rework_qty: 4, source_ncr_id: 'NCR-B', status: 'in_progress' },
      { id: 'jc-3', doc_no: 'JC/0003', rework_qty: 2, source_ncr_id: 'NCR-C', status: 'planned' },
    ]));
    expect(findReworkJobCardsForNcr(ENTITY, 'NCR-B')).toHaveLength(2);
  });
});
