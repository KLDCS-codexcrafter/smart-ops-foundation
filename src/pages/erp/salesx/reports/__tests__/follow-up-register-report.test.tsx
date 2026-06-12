import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FollowUpRegisterReportPanel } from '../FollowUpRegisterReport';

describe('RPT-7a · sx-followups (toggle recipe)', () => {
  it('mounts TableChartToggle host + integrity badge, defaults to Table, no standalone chart host', () => {
    render(<MemoryRouter><FollowUpRegisterReportPanel entityCode="SMRT" /></MemoryRouter>);
    expect(screen.getByTestId('sx-followups-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('sx-followups-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table')).toHaveAttribute('data-state', 'active');
    expect(screen.queryByTestId('sx-followups-chart-host')).toBeNull();
  });
});
