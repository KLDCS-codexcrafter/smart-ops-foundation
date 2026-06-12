import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DOMRegisterPanel } from '../DOMRegister';

describe('RPT-7a · sx-dom (toggle recipe)', () => {
  it('mounts TableChartToggle host + integrity badge, defaults to Table, no standalone chart host', () => {
    render(<MemoryRouter><DOMRegisterPanel /></MemoryRouter>);
    expect(screen.getByTestId('sx-dom-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('sx-dom-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table')).toHaveAttribute('data-state', 'active');
    expect(screen.queryByTestId('sx-dom-chart-host')).toBeNull();
  });
});
