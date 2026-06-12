import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DrawingRegisterTree } from '../DrawingRegisterTree';

describe('RPT-8b · dv-drawings (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge + chart host', () => {
    render(<DrawingRegisterTree />);
    expect(screen.getByTestId('dv-drawings-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('dv-drawings-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('dv-drawings-chart-host')).toBeInTheDocument();
  });
});
