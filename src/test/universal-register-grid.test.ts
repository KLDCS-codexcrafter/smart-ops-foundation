/**
 * universal-register-grid.test.ts — UTS Foundation tests
 *
 * Sprint T-Phase-1.2.6a · Card #2.6 sub-sprint 1 of 5
 *
 * Pure-logic tests (no React renderer): exercise the type-level contracts
 * and the universal-export-engine helpers. UI rendering tests land in 1.2.6e
 * once @testing-library/react is part of the harness.
 *
 * Tests UR1 — UR8.
 */

import { describe, it, expect } from 'vitest';
import {
  getCellValue,
} from '@/lib/universal-export-engine';
import type {
  RegisterColumn, RegisterMeta, SummaryCard, StatusOption,
} from '@/components/registers/UniversalRegisterTypes';

interface DemoRow {
  id: string;
  doc_no: string;
  primary_date: string;
  effective_date?: string | null;
  amount: number;
  status: 'draft' | 'posted';
}

const cols: RegisterColumn<DemoRow>[] = [
  { key: 'doc_no', label: 'Doc No', render: r => r.doc_no, exportKey: 'doc_no' },
  { key: 'date',   label: 'Date',   render: r => r.primary_date,
    exportKey: r => r.effective_date ?? r.primary_date },
  { key: 'amount', label: 'Amount', render: r => r.amount, exportKey: 'amount', align: 'right' },
  { key: 'note',   label: 'Note',   render: () => '—' /* render-only · no exportKey */ },
];

const rows: DemoRow[] = [
  { id: 'r1', doc_no: 'DOC/26-27/0001', primary_date: '2026-04-10', effective_date: null,        amount: 1500, status: 'posted' },
  { id: 'r2', doc_no: 'DOC/26-27/0002', primary_date: '2026-04-12', effective_date: '2026-04-15', amount:  500, status: 'draft'  },
];

const meta: RegisterMeta<DemoRow> = {
  registerCode: 'demo_register',
  title: 'Demo Register',
  description: 'UTS test',
  dateAccessor: r => r.effective_date ?? r.primary_date,
};

describe('UniversalRegisterGrid foundation (UR1-UR8)', () => {
  it('UR1 · column type contract carries label + render', () => {
    expect(cols[0].label).toBe('Doc No');
    expect(typeof cols[0].render).toBe('function');
    expect(cols[0].render(rows[0])).toBe('DOC/26-27/0001');
  });

  it('UR2 · meta exposes registerCode + title + dateAccessor', () => {
    expect(meta.registerCode).toBe('demo_register');
    expect(meta.title).toBe('Demo Register');
    expect(meta.dateAccessor(rows[0])).toBe('2026-04-10');
    expect(meta.dateAccessor(rows[1])).toBe('2026-04-15');
  });

  it('UR3 · summary card shape supports tones', () => {
    const card: SummaryCard = { label: 'Total', value: '₹2,000', tone: 'positive' };
    expect(card.tone).toBe('positive');
    expect(card.value).toBe('₹2,000');
  });

  it('UR4 · status options structure', () => {
    const opts: StatusOption[] = [
      { value: 'draft', label: 'Draft' },
      { value: 'posted', label: 'Posted' },
    ];
    expect(opts.length).toBe(2);
    expect(opts[0].value).toBe('draft');
  });

  it('UR5 · getCellValue resolves keyof T accessor', () => {
    expect(getCellValue(rows[0], cols[0])).toBe('DOC/26-27/0001');
    expect(getCellValue(rows[0], cols[2])).toBe(1500);
  });

  it('UR6 · getCellValue resolves function accessor (effective_date fallback)', () => {
    // r1: effective_date is null → falls back to primary_date
    expect(getCellValue(rows[0], cols[1])).toBe('2026-04-10');
    // r2: effective_date set → wins
    expect(getCellValue(rows[1], cols[1])).toBe('2026-04-15');
  });

  it('UR7 · render-only column (no exportKey) returns empty string', () => {
    expect(getCellValue(rows[0], cols[3])).toBe('');
  });

  it('UR8 · effective_date schema field is optional + backward-compat (D-226)', () => {
    // Pattern: record.effective_date ?? record.primary_date
    const legacy: DemoRow = { id: 'legacy', doc_no: 'L/1', primary_date: '2026-04-01', amount: 0, status: 'draft' };
    expect(legacy.effective_date).toBeUndefined();
    expect(meta.dateAccessor(legacy)).toBe('2026-04-01');
  });
});
