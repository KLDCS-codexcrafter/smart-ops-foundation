import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EcomXReturnsPage } from '../EcomXReturnsPage';

describe('RPT-7c · ec-returns (dashboard recipe)', () => {
  beforeEach(() => {
    localStorage.setItem('erp-selected-company', 'SMRT');
  });
  it('mounts dashboard host + integrity badge + chart host', () => {
    render(<MemoryRouter><EcomXReturnsPage /></MemoryRouter>);
    expect(screen.getByTestId('ec-returns-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('ec-returns-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('ec-returns-chart-host')).toBeInTheDocument();
  });
});
