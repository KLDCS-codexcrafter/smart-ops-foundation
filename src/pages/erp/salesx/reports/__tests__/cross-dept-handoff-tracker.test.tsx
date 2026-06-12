import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CrossDeptHandoffTrackerPanel } from '../CrossDeptHandoffTracker';

describe('RPT-7b · sx-handoff (toggle recipe)', () => {
  it('mounts TableChartToggle host + integrity badge, defaults to Table', () => {
    render(<MemoryRouter><CrossDeptHandoffTrackerPanel entityCode="SMRT" /></MemoryRouter>);
    expect(screen.getByTestId('sx-handoff-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('sx-handoff-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table')).toHaveAttribute('data-state', 'active');
  });
});
