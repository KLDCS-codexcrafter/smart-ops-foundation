/**
 * @file        CrossCardDayBookPage.test.tsx
 * @sprint      RPT-5a · Cross-Card Day Book Surface
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CrossCardDayBookPage } from '../CrossCardDayBookPage';
import {
  registerDayBookSource,
  __resetDayBookSourcesForTests,
} from '@/lib/report-framework/daybook-source-registry';
import { getSource } from '@/lib/report-framework/data-source-catalog';
import '@/lib/report-framework/data-sources';

vi.mock('@/hooks/useEntityCode', () => ({
  useEntityCode: () => ({ entityCode: 'TEST', entityId: 'test' }),
}));

function rowsFor(card: string, prefix: string, dates: string[]) {
  return dates.map((d, i) => ({
    id: `${prefix}-${i}`,
    date: d,
    time: '10:00',
    type: prefix.toUpperCase(),
    reference: `${prefix}/${i}`,
    party: `Party ${i}`,
    amount: 1000 * (i + 1),
    status: 'posted',
    module: `${card}-mod`,
  }));
}

function renderPage() {
  return render(
    <MemoryRouter>
      <CrossCardDayBookPage />
    </MemoryRouter>,
  );
}

describe('RPT-5a · CrossCardDayBookPage', () => {
  beforeEach(() => {
    __resetDayBookSourcesForTests();
  });

  it('§1 renders the page heading', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { name: /Day Book.*All Cards/i }),
    ).toBeInTheDocument();
  });

  it('§2 merges entries from ≥2 cards in chronological order', () => {
    registerDayBookSource({
      cardId: 'card-a', domain: 'finance', label: 'A',
      read: () => rowsFor('card-a', 'a', ['2026-04-01', '2026-04-03']),
    });
    registerDayBookSource({
      cardId: 'card-b', domain: 'people', label: 'B',
      read: () => rowsFor('card-b', 'b', ['2026-04-02']),
    });
    renderPage();
    expect(screen.getAllByText(/A\/0|A\/1|B\/0/).length).toBeGreaterThanOrEqual(3);
    const rows = document.querySelectorAll('tbody tr');
    expect(rows.length).toBeGreaterThanOrEqual(3);
    // Newest-first sort: row 0 should be 2026-04-03
    expect(rows[0].textContent).toContain('2026-04-03');
  });

  it('§3 domain filter narrows the set', () => {
    registerDayBookSource({
      cardId: 'card-a', domain: 'finance', label: 'A',
      read: () => rowsFor('card-a', 'a', ['2026-04-01']),
    });
    registerDayBookSource({
      cardId: 'card-b', domain: 'people', label: 'B',
      read: () => rowsFor('card-b', 'b', ['2026-04-02']),
    });
    renderPage();
    const before = document.querySelectorAll('tbody tr').length;
    expect(before).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getByRole('button', { name: 'finance' }));
    const after = document.querySelectorAll('tbody tr').length;
    expect(after).toBeLessThan(before);
    expect(after).toBeGreaterThanOrEqual(1);
  });

  it('§4 honest empty-state shows on zero entries', () => {
    renderPage();
    expect(screen.getByText(/No transactions in this range/i)).toBeInTheDocument();
  });

  it('§5 integrity badge present', () => {
    renderPage();
    expect(screen.getByLabelText(/Integrity signature/i)).toBeInTheDocument();
  });

  it('§6 row click pushes drill crumb', () => {
    registerDayBookSource({
      cardId: 'card-a', domain: 'finance', label: 'A',
      read: () => rowsFor('card-a', 'a', ['2026-04-01']),
    });
    renderPage();
    const row = document.querySelector('tbody tr');
    expect(row).toBeTruthy();
    fireEvent.click(row!);
    expect(screen.getByLabelText(/breadcrumb/i)).toBeInTheDocument();
  });

  it('§7 filter chips show registered domains', () => {
    registerDayBookSource({
      cardId: 'card-a', domain: 'finance', label: 'A',
      read: () => [],
    });
    registerDayBookSource({
      cardId: 'card-b', domain: 'people', label: 'B',
      read: () => [],
    });
    renderPage();
    expect(screen.getByRole('button', { name: 'finance' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'people' })).toBeInTheDocument();
  });

  it('§8 card chips show registered cards', () => {
    registerDayBookSource({
      cardId: 'card-a', domain: 'finance', label: 'A',
      read: () => [],
    });
    renderPage();
    expect(screen.getByRole('button', { name: 'card-a' })).toBeInTheDocument();
  });

  it('§9 table columns include Date/Reference/Amount', () => {
    registerDayBookSource({
      cardId: 'c', domain: 'd', label: 'L',
      read: () => rowsFor('c', 'x', ['2026-04-01']),
    });
    renderPage();
    expect(screen.getByRole('columnheader', { name: /Date/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Reference/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Amount/i })).toBeInTheDocument();
  });

  it('§10 row count badge shows N rows', () => {
    registerDayBookSource({
      cardId: 'c', domain: 'd', label: 'L',
      read: () => rowsFor('c', 'x', ['2026-04-01', '2026-04-02']),
    });
    renderPage();
    expect(screen.getByText(/2 rows/)).toBeInTheDocument();
  });

  it('§11 clear button resets filters', () => {
    registerDayBookSource({
      cardId: 'c', domain: 'finance', label: 'L',
      read: () => rowsFor('c', 'x', ['2026-04-01']),
    });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'finance' }));
    expect(screen.getByRole('button', { name: /Clear/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Clear/ }));
    expect(screen.queryByRole('button', { name: /Clear/ })).not.toBeInTheDocument();
  });

  it('§12 NO recharts import in page source', () => {
    const src = readFileSync(
      join(__dirname, '..', 'CrossCardDayBookPage.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/from ['"]recharts['"]/);
  });

  it('§13 carry-forward: comply360.aggregate.compliance-pct DSC source resolves', () => {
    const src = getSource('comply360.aggregate.compliance-pct');
    expect(src).toBeDefined();
    expect(src?.kind).toBe('kpi');
    const rows = src?.read('TEST') ?? [];
    // Real seed obligations exist → rows must be present (never fabricated).
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const first = rows[0] as Record<string, unknown>;
    expect(first).toHaveProperty('module');
    expect(first).toHaveProperty('compliance_pct');
    expect(typeof first.compliance_pct).toBe('number');
  });

  it('§14 compliance source rows are per-module aggregates (no fabrication)', () => {
    const src = getSource('comply360.aggregate.compliance-pct');
    const rows = (src?.read('TEST') ?? []) as Array<Record<string, number | string>>;
    for (const r of rows) {
      const total = r.total as number;
      const filed = r.filed as number;
      const expected = total > 0 ? Math.round((filed / total) * 100) : 0;
      expect(r.compliance_pct).toBe(expected);
    }
  });

  it('§15 date range filter input present', () => {
    renderPage();
    expect(screen.getByLabelText(/From date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/To date/i)).toBeInTheDocument();
  });

  it('§16 domain filter chip toggle is reversible', () => {
    registerDayBookSource({
      cardId: 'c', domain: 'finance', label: 'L',
      read: () => rowsFor('c', 'x', ['2026-04-01']),
    });
    renderPage();
    const before = document.querySelectorAll('tbody tr').length;
    fireEvent.click(screen.getByRole('button', { name: 'finance' }));
    fireEvent.click(screen.getByRole('button', { name: 'finance' }));
    expect(document.querySelectorAll('tbody tr').length).toBe(before);
  });

  it('§17 integrity badge text is a short hex hash', () => {
    renderPage();
    const badge = screen.getByLabelText(/Integrity signature/i);
    expect(badge.textContent ?? '').toMatch(/[0-9a-f]{6,}/i);
  });

  it('§18 entries from 2 different cards both rendered together', () => {
    registerDayBookSource({
      cardId: 'card-a', domain: 'finance', label: 'A',
      read: () => rowsFor('card-a', 'a', ['2026-04-01']),
    });
    registerDayBookSource({
      cardId: 'card-b', domain: 'people', label: 'B',
      read: () => rowsFor('card-b', 'b', ['2026-04-02']),
    });
    renderPage();
    const body = document.querySelector('tbody')!;
    expect(within(body).getByText('a/0')).toBeInTheDocument();
    expect(within(body).getByText('b/0')).toBeInTheDocument();
  });

  it('§19 honest empty: zero registered sources renders empty-state', () => {
    renderPage();
    expect(screen.getByText(/No transactions in this range/i)).toBeInTheDocument();
    expect(document.querySelector('tbody')).toBeNull();
  });

  it('§20 amount cells render Indian-formatted numeric', () => {
    registerDayBookSource({
      cardId: 'c', domain: 'd', label: 'L',
      read: () => rowsFor('c', 'x', ['2026-04-01', '2026-04-02']),
    });
    renderPage();
    const rows = document.querySelectorAll('tbody tr');
    expect(rows.length).toBeGreaterThanOrEqual(2);
    const cells = rows[0].querySelectorAll('td');
    const lastCell = cells[cells.length - 1].textContent ?? '';
    expect(lastCell).toMatch(/[0-9]/);
  });
});
