import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProjectRegisterPanel } from '../ProjectRegister';

describe('RPT-7b · px-projects (toggle recipe)', () => {
  it('mounts TableChartToggle host + integrity badge, defaults to Table', () => {
    render(<MemoryRouter><ProjectRegisterPanel /></MemoryRouter>);
    expect(screen.getByTestId('px-projects-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('px-projects-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table')).toHaveAttribute('data-state', 'active');
  });
});
