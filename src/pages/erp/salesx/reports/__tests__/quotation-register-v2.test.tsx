import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QuotationRegisterV2Panel } from '../QuotationRegisterV2';

describe('RPT-7a · sx-quotations (toggle recipe)', () => {
  it('mounts TableChartToggle host + integrity badge, defaults to Table, no standalone chart host', () => {
    render(<MemoryRouter><QuotationRegisterV2Panel /></MemoryRouter>);
    expect(screen.getByTestId('sx-quotations-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('sx-quotations-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table')).toHaveAttribute('data-state', 'active');
    expect(screen.queryByTestId('sx-quotations-chart-host')).toBeNull();
  });
});
