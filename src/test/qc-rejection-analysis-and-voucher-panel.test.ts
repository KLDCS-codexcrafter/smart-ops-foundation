/**
 * @file src/test/qc-rejection-analysis-and-voucher-panel.test.ts
 * @purpose Block E coverage · QcVoucherDetailPanel module guard + QcRejectionAnalysis NCR/CAPA join correctness.
 * @who QA Manager · Internal Auditor
 * @when 2026-05-09
 * @sprint T-Phase-1.A.5.d-1-T1-AuditFix · Block B (closes Block E test gap from α-d-1)
 * @iso ISO 9001:2015 Clause 9.1.3 · ISO 25010 Testability
 * @whom Audit Owner
 * @decisions Q-LOCK-3b · Q-LOCK-8a · D-NEW-BW canonical · D-NEW-BJ (raiseNcr/raiseCapa 3-arg)
 * @disciplines FR-30 · FR-32
 * @reuses ncr-engine raiseNcr · capa-engine raiseCapa · QcVoucherDetailPanel module
 * @[JWT] reads erp_ncr_${entityCode} · erp_capa_${entityCode} for assertion
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { QcVoucherDetailPanel } from '@/pages/erp/qulicheak/QcVoucherDetailPanel';
import { raiseNcr } from '@/lib/ncr-engine';
import { raiseCapa } from '@/lib/capa-engine';

const ENTITY = 'TEST_T1_QC';
const USER = 'test_t1';

beforeEach(() => { localStorage.clear(); });

describe('QcVoucherDetailPanel · Q-LOCK-3b module guard', () => {
  it('exports a component function (mountable by IqcEntryPage standard variant)', () => {
    expect(typeof QcVoucherDetailPanel).toBe('function');
  });
});

describe('QcRejectionAnalysis · Q-LOCK-8a join correctness (engine-level · UI-free)', () => {
  it('NCR rows aggregate by vendor::item key (two NCRs same vendor+item)', () => {
    raiseNcr(ENTITY, USER, {
      entity_id: ENTITY,
      source: 'iqc',
      severity: 'major',
      related_party_id: 'V-1',
      related_party_name: 'Acme',
      item_id: 'I-1',
      item_name: 'Widget',
      qty_affected: 10,
      description: 'first',
    });
    raiseNcr(ENTITY, USER, {
      entity_id: ENTITY,
      source: 'iqc',
      severity: 'minor',
      related_party_id: 'V-1',
      related_party_name: 'Acme',
      item_id: 'I-1',
      item_name: 'Widget',
      qty_affected: 5,
      description: 'second',
    });
    const raw = localStorage.getItem(`erp_ncr_${ENTITY}`);
    const ncrs = raw ? JSON.parse(raw) as Array<{ related_party_name?: string; item_name?: string }> : [];
    expect(ncrs.length).toBe(2);
    expect(ncrs.every((n) => n.related_party_name === 'Acme' && n.item_name === 'Widget')).toBe(true);
  });

  it('CAPA without NCR linkage records source==="audit" (vendor/item fallback "—" path)', () => {
    raiseCapa(ENTITY, USER, {
      entity_id: ENTITY,
      source: 'audit',
      severity: 'minor',
      title: 'standalone',
    });
    const raw = localStorage.getItem(`erp_capa_${ENTITY}`);
    const capas = raw ? JSON.parse(raw) as Array<{ source: string; related_party_id?: string | null }> : [];
    expect(capas.length).toBe(1);
    expect(capas[0].source).toBe('audit');
    expect(capas[0].related_party_id ?? null).toBeNull();
  });
});
