import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DemoSerialRegisterPanel } from '../DemoSerialRegister';

describe('RPT-8a · dp-demo-serial (toggle recipe)', () => {
  it('mounts TableChartToggle host + integrity badge, defaults to Table', () => {
    render(<MemoryRouter><DemoSerialRegisterPanel /></MemoryRouter>);
    expect(screen.getByTestId('dp-demo-serial-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('dp-demo-serial-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table')).toHaveAttribute('data-state', 'active');
  });
});
