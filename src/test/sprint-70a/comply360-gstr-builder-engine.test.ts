/**
 * @file        src/test/sprint-70a/comply360-gstr-builder-engine.test.ts
 * @purpose     Unit tests · Sprint 70a Block 3 GSTR builder engine
 * @sprint      Sprint 70a · Pass A · Block 5
 * @lesson-23   Signatures grepped from src/lib/comply360-gstr-builder-engine.ts
 */
import { describe, it, expect } from 'vitest';
import {
  buildGSTR1,
  buildGSTR1A,
  buildGSTR2B,
  validateGSTR1Payload,
  computeHSNSummary,
  computeDocIssueSection,
  type IMSActionInput,
} from '@/lib/comply360-gstr-builder-engine';
import type { CrossCardSupply } from '@/lib/comply360-gst-aggregator-engine';
import type { GSTR1Payload } from '@/lib/gst-portal-service';

const GSTIN = '27AAAPL1234C1Z5';
const RECIP = '29AAAPL1234C1Z5';

const mk = (over: Partial<CrossCardSupply> = {}): CrossCardSupply => ({
  source_card: 'salesx',
  source_ref: 'so-1',
  entity_id: 'ent',
  gstin_supplier: GSTIN,
  gstin_recipient: RECIP,
  invoice_no: 'INV/0001',
  invoice_date: '2026-04-10',
  hsn_sac: '8471',
  taxable_value: 100000,
  igst: 18000, cgst: 0, sgst: 0, cess: 0,
  pos_state_code: '29',
  supply_type: 'b2b',
  ...over,
});

describe('Sprint 70a · Block 3 · comply360-gstr-builder-engine', () => {
  it('buildGSTR1 returns valid result with B2B group for clean input', () => {
    const res = buildGSTR1([mk()], { gstin: GSTIN, return_period: '04-2026' });
    expect(res.builder).toBe('gstr-1');
    expect(res.valid).toBe(true);
    const p = res.payload as GSTR1Payload;
    expect(p.b2b).toHaveLength(1);
    expect(p.b2b[0].ctin).toBe(RECIP);
    expect(p.b2b[0].inv[0].inum).toBe('INV/0001');
  });

  it('buildGSTR1 flags GSTIN_INVALID on bad filer GSTIN', () => {
    const res = buildGSTR1([mk()], { gstin: 'BAD', return_period: '04-2026' });
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.code === 'GSTIN_INVALID')).toBe(true);
  });

  it('buildGSTR1 flags DATE_OUT_OF_PERIOD when invoice falls outside period', () => {
    const res = buildGSTR1([mk({ invoice_date: '2026-05-10' })], { gstin: GSTIN, return_period: '04-2026' });
    expect(res.errors.some(e => e.code === 'DATE_OUT_OF_PERIOD')).toBe(true);
  });

  it('buildGSTR1 emits POS_MISMATCH warning when pos != recipient state', () => {
    const res = buildGSTR1(
      [mk({ pos_state_code: '07' })],
      { gstin: GSTIN, return_period: '04-2026' },
    );
    expect(res.warnings.some(w => w.code === 'POS_MISMATCH')).toBe(true);
  });

  it('buildGSTR1 groups B2CS rows by pos+rate', () => {
    const res = buildGSTR1(
      [
        mk({ supply_type: 'b2cs', gstin_recipient: undefined, source_ref: 'a', invoice_no: 'A', taxable_value: 1000, igst: 180 }),
        mk({ supply_type: 'b2cs', gstin_recipient: undefined, source_ref: 'b', invoice_no: 'B', taxable_value: 2000, igst: 360 }),
      ],
      { gstin: GSTIN, return_period: '04-2026' },
    );
    const p = res.payload as GSTR1Payload;
    expect(p.b2cs).toHaveLength(1);
    expect(p.b2cs[0].txval).toBe(3000);
  });

  it('buildGSTR1 builds B2CL section grouped by pos', () => {
    const res = buildGSTR1(
      [mk({ supply_type: 'b2cl', gstin_recipient: undefined, taxable_value: 300000, igst: 54000 })],
      { gstin: GSTIN, return_period: '04-2026' },
    );
    const p = res.payload as GSTR1Payload;
    expect(p.b2cl).toHaveLength(1);
    expect(p.b2cl[0].pos).toBe('29');
  });

  it('buildGSTR1 builds exports section', () => {
    const res = buildGSTR1(
      [mk({ supply_type: 'export_with_pmt', gstin_recipient: undefined, pos_state_code: '96' })],
      { gstin: GSTIN, return_period: '04-2026' },
    );
    const p = res.payload as GSTR1Payload;
    expect(p.exp).toHaveLength(1);
  });

  it('buildGSTR1A carries amendment supplies only with builder tag gstr-1a', () => {
    const res = buildGSTR1A(
      [mk(), mk({ source_ref: 'a2', invoice_no: 'A2', amendment_flag: true })],
      { gstin: GSTIN, return_period: '04-2026', orig_return_period: '03-2026' },
    );
    expect(res.builder).toBe('gstr-1a');
    expect((res.payload as Record<string, unknown>).amendment_count).toBe(1);
    expect((res.payload as Record<string, unknown>).orig_fp).toBe('03-2026');
  });

  it('buildGSTR2B buckets supplies by IMS action status', () => {
    const supplies = [
      mk({ source_ref: 'r1', invoice_no: 'I1' }),
      mk({ source_ref: 'r2', invoice_no: 'I2' }),
      mk({ source_ref: 'r3', invoice_no: 'I3' }),
    ];
    const actions: IMSActionInput[] = [
      { source_invoice_ref: 'r1', status: 'accepted' },
      { source_invoice_ref: 'r2', status: 'rejected' },
      { source_invoice_ref: 'r3', status: 'kept_pending' },
    ];
    const res = buildGSTR2B(supplies, actions, { gstin: GSTIN, return_period: '04-2026' });
    expect(res.builder).toBe('gstr-2b');
    const p = res.payload as Record<string, unknown>;
    const summary = p.summary as Record<string, { taxable_value: number }>;
    expect(summary.itc_eligible.taxable_value).toBe(100000);
    expect(summary.itc_ineligible.taxable_value).toBe(100000);
    expect(summary.vendor_pending.taxable_value).toBe(100000);
  });

  it('validateGSTR1Payload returns errors for invalid payload', () => {
    const r = validateGSTR1Payload({
      gstin: 'BAD', fp: 'XX', b2b: [], b2cl: [], b2cs: [], exp: [], cdnr: [], cdnur: [],
      hsn: { data: [] }, doc_issue: { doc_det: [] },
    } as unknown as GSTR1Payload);
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('computeHSNSummary returns rows shaped for GSTR1HSNRow', () => {
    const rows = computeHSNSummary([mk()]);
    expect(rows[0].hsn_sc).toBe('8471');
    expect(rows[0].txval).toBe(100000);
  });

  it('computeDocIssueSection returns single tax-invoice range', () => {
    const ds = computeDocIssueSection([mk({ invoice_no: 'A' }), mk({ source_ref: 'b', invoice_no: 'B' })]);
    expect(ds.doc_det[0].docs[0].from).toBe('A');
    expect(ds.doc_det[0].docs[0].to).toBe('B');
    expect(ds.doc_det[0].docs[0].totnum).toBe(2);
  });
});
