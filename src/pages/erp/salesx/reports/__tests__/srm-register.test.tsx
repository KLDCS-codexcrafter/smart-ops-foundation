import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SRMRegisterPanel } from '../SRMRegister';

describe('RPT-7a · sx-srm (toggle recipe)', () => {
  it('mounts TableChartToggle host + integrity badge, defaults to Table, no standalone chart host', () => {
    render(<MemoryRouter><SRMRegisterPanel /></MemoryRouter>);
    expect(screen.getByTestId('sx-srm-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('sx-srm-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table')).toHaveAttribute('data-state', 'active');
    expect(screen.queryByTestId('sx-srm-chart-host')).toBeNull();
  });
});
