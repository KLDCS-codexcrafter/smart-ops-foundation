import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EcomXClaimsPage } from '../EcomXClaimsPage';

describe('RPT-7c · ec-claims (dashboard recipe)', () => {
  beforeEach(() => {
    localStorage.setItem('erp-selected-company', 'SMRT');
  });
  it('mounts dashboard host + integrity badge + chart host', () => {
    render(<MemoryRouter><EcomXClaimsPage /></MemoryRouter>);
    expect(screen.getByTestId('ec-claims-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('ec-claims-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('ec-claims-chart-host')).toBeInTheDocument();
  });
});
