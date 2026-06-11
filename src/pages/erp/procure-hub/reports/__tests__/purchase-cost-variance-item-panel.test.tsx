/**
 * @file purchase-cost-variance-item-panel.test.tsx — RPT-5c dashboard recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PurchaseCostVarianceItemPanel } from '../PurchaseCostVarianceItemPanel';

describe('RPT-5c · PurchaseCostVarianceItemPanel (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<PurchaseCostVarianceItemPanel />);
    expect(screen.getByTestId('pr-cost-variance-item-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('pr-cost-variance-item-integrity-badge')).toBeInTheDocument();
  });
  it('preserves Purchase Cost Variance · Item heading', () => {
    render(<PurchaseCostVarianceItemPanel />);
    expect(screen.getAllByText(/Purchase Cost Variance/i).length).toBeGreaterThanOrEqual(1);
  });
});
