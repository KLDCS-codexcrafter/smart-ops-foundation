/**
 * @file        RoleDashboard.test.tsx
 * @sprint      RPT-4
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleDashboard } from '@/components/operix-core/report-framework/RoleDashboard';

describe('RPT-4 · RoleDashboard component', () => {
  it('renders the My Dashboard heading and the three layer chips', () => {
    render(<RoleDashboard />);
    expect(screen.getByRole('heading', { name: /My Dashboard/i })).toBeInTheDocument();
    expect(screen.getByTestId('layer-chip-operator')).toBeInTheDocument();
    expect(screen.getByTestId('layer-chip-manager')).toBeInTheDocument();
    expect(screen.getByTestId('layer-chip-management')).toBeInTheDocument();
  });

  it('renders at least one section or the empty state', () => {
    render(<RoleDashboard />);
    const sections = screen.queryAllByText(/KPI/i);
    // Either we have sections (with KPI badges) OR the empty state
    const empty = screen.queryByTestId('role-dashboard-empty');
    expect(sections.length + (empty ? 1 : 0)).toBeGreaterThanOrEqual(1);
  });
});
