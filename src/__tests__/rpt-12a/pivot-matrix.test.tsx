/**
 * @file        pivot-matrix.test.tsx
 * @sprint      RPT-12a · Block 1 · PivotMatrix matrix math
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PivotMatrix } from '@/components/operix-core/report-framework/PivotMatrix';
import { buildPivotModel } from '@/components/operix-core/report-framework/pivot-model';

const FIXTURE = [
  { region: 'North', product: 'A', sum_amount: 100 },
  { region: 'North', product: 'B', sum_amount: 50 },
  { region: 'South', product: 'A', sum_amount: 30 },
  { region: 'South', product: 'B', sum_amount: 20 },
];

describe('RPT-12a · PivotMatrix · math', () => {
  it('builds correct row totals', () => {
    const m = buildPivotModel(FIXTURE, ['region', 'product'], 'sum_amount');
    expect(m.rowTotals.get('North')).toBe(150);
    expect(m.rowTotals.get('South')).toBe(50);
  });

  it('builds correct column totals', () => {
    const m = buildPivotModel(FIXTURE, ['region', 'product'], 'sum_amount');
    expect(m.colTotals.get('A')).toBe(130);
    expect(m.colTotals.get('B')).toBe(70);
  });

  it('builds correct grand total', () => {
    const m = buildPivotModel(FIXTURE, ['region', 'product'], 'sum_amount');
    expect(m.grandTotal).toBe(200);
  });

  it('cells reflect raw values', () => {
    const m = buildPivotModel(FIXTURE, ['region', 'product'], 'sum_amount');
    expect(m.cells.get('North\u0001A')).toBe(100);
    expect(m.cells.get('South\u0001B')).toBe(20);
  });

  it('renders pivot-matrix component', () => {
    render(
      <PivotMatrix rows={FIXTURE} groupBy={['region', 'product']} measureKey="sum_amount" />,
    );
    expect(screen.getByTestId('pivot-matrix')).toBeInTheDocument();
    expect(screen.getByTestId('pivot-grandtotal').textContent).toMatch(/200/);
  });

  it('shows empty-state when no data', () => {
    render(<PivotMatrix rows={[]} groupBy={['region', 'product']} measureKey="sum_amount" />);
    expect(screen.getByTestId('pivot-empty')).toBeInTheDocument();
  });
});
