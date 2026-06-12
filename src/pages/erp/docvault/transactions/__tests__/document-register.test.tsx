import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DocumentRegister } from '../DocumentRegister';

describe('RPT-8b · dv-documents (toggle recipe)', () => {
  it('mounts TableChartToggle host + integrity badge, defaults to Table', () => {
    render(<DocumentRegister />);
    expect(screen.getByTestId('dv-documents-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('dv-documents-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table')).toHaveAttribute('data-state', 'active');
  });
});
