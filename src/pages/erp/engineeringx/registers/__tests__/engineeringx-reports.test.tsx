import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EngineeringXReports } from '../EngineeringXReports';

describe('RPT-6c · eng-reports (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<EngineeringXReports />);
    expect(screen.getByTestId('eng-reports-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('eng-reports-integrity-badge')).toBeInTheDocument();
  });
});
