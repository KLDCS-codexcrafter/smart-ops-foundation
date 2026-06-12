import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MilestoneStatusReportPanel } from '../MilestoneStatusReport';

describe('RPT-7b · px-milestones (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge + chart host', () => {
    render(<MemoryRouter><MilestoneStatusReportPanel /></MemoryRouter>);
    expect(screen.getByTestId('px-milestones-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('px-milestones-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('px-milestones-chart-host')).toBeInTheDocument();
  });
});
