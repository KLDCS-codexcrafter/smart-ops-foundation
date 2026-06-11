/**
 * @file purchase-cost-variance-category-panel.test.tsx — RPT-5c dashboard recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PurchaseCostVarianceCategoryPanel } from '../PurchaseCostVarianceCategoryPanel';

describe('RPT-5c · PurchaseCostVarianceCategoryPanel (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<PurchaseCostVarianceCategoryPanel />);
    expect(screen.getByTestId('pr-cost-variance-cat-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('pr-cost-variance-cat-integrity-badge')).toBeInTheDocument();
  });
  it('preserves Purchase Cost Variance · Category heading', () => {
    render(<PurchaseCostVarianceCategoryPanel />);
    expect(screen.getAllByText(/Purchase Cost Variance/i).length).toBeGreaterThanOrEqual(1);
  });
});
