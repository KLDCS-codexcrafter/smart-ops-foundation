/**
 * @file three-way-match-panel.test.tsx — RPT-5c dashboard recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThreeWayMatchStatusPanel } from '../ThreeWayMatchStatusPanel';

describe('RPT-5c · ThreeWayMatchStatusPanel (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<ThreeWayMatchStatusPanel />);
    expect(screen.getByTestId('pr-three-way-match-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('pr-three-way-match-integrity-badge')).toBeInTheDocument();
  });
  it('preserves 3-Way Match Status heading', () => {
    render(<ThreeWayMatchStatusPanel />);
    expect(screen.getAllByText(/3-Way Match Status/i).length).toBeGreaterThanOrEqual(1);
  });
});
