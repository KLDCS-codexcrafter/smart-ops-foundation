import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EcomXOrdersPage } from '../EcomXOrdersPage';

describe('RPT-7c · ec-orders (dashboard recipe)', () => {
  beforeEach(() => {
    localStorage.setItem('erp-selected-company', 'SMRT');
  });
  it('mounts dashboard host + integrity badge + chart host', () => {
    render(<MemoryRouter><EcomXOrdersPage /></MemoryRouter>);
    expect(screen.getByTestId('ec-orders-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('ec-orders-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('ec-orders-chart-host')).toBeInTheDocument();
  });
});
