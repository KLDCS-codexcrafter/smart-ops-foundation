import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LRTrackerPanel } from '../LRTracker';

describe('RPT-8a · dp-lr (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge + chart host', () => {
    render(<MemoryRouter><LRTrackerPanel onModuleChange={() => {}} /></MemoryRouter>);
    expect(screen.getByTestId('dp-lr-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('dp-lr-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('dp-lr-chart-host')).toBeInTheDocument();
  });
});
