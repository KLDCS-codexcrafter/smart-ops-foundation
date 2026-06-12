import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SOMRegisterPanel } from '../SOMRegister';

describe('RPT-7a · sx-som (toggle recipe)', () => {
  it('mounts TableChartToggle host + integrity badge, defaults to Table, no standalone chart host', () => {
    render(<MemoryRouter><SOMRegisterPanel /></MemoryRouter>);
    expect(screen.getByTestId('sx-som-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('sx-som-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table')).toHaveAttribute('data-state', 'active');
    expect(screen.queryByTestId('sx-som-chart-host')).toBeNull();
  });
});
