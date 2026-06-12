import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SecondarySalesRegisterPanel } from '../SecondarySalesRegister';

describe('RPT-7a · sx-secondary (toggle recipe)', () => {
  it('mounts TableChartToggle host + integrity badge, defaults to Table, no standalone chart host', () => {
    render(<MemoryRouter><SecondarySalesRegisterPanel /></MemoryRouter>);
    expect(screen.getByTestId('sx-secondary-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('sx-secondary-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table')).toHaveAttribute('data-state', 'active');
    expect(screen.queryByTestId('sx-secondary-chart-host')).toBeNull();
  });
});
