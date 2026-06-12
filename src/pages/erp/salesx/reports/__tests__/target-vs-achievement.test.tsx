import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TargetVsAchievementPanel } from '../TargetVsAchievement';

describe('RPT-7b · sx-target-ach (toggle recipe)', () => {
  it('mounts TableChartToggle host + integrity badge, defaults to Table', () => {
    render(<MemoryRouter><TargetVsAchievementPanel entityCode="SMRT" /></MemoryRouter>);
    expect(screen.getByTestId('sx-target-ach-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('sx-target-ach-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table')).toHaveAttribute('data-state', 'active');
  });
});
