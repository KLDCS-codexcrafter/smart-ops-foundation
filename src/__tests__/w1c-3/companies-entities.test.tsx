/**
 * @sprint W1C-3 Block 1 — CompaniesEntitiesPage real listing
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CompaniesEntitiesPage from '@/pages/erp/comply360/companies/CompaniesEntitiesPage';

function renderPage() {
  return render(
    <MemoryRouter><CompaniesEntitiesPage /></MemoryRouter>
  );
}

describe('W1C-3 · CompaniesEntitiesPage', () => {
  beforeEach(() => localStorage.clear());

  it('shows honest empty state when erp_companies store is empty', () => {
    renderPage();
    expect(screen.getByText(/No companies registered yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Open Company form/i)).toBeInTheDocument();
  });

  it('lists real companies from erp_companies with compliance chips', () => {
    localStorage.setItem('erp_companies', JSON.stringify([
      { id: 'c-1', legalEntityName: 'Sharma Traders Pvt Ltd', shortCode: 'SHTR',
        status: 'Active', city: 'Mumbai', state: 'MH',
        gstRegs: [{}, {}], lutBonds: [{}] },
    ]));
    renderPage();
    expect(screen.getByText('Sharma Traders Pvt Ltd')).toBeInTheDocument();
    expect(screen.getByText('SHTR')).toBeInTheDocument();
    expect(screen.getByText(/GST · 2/)).toBeInTheDocument();
    expect(screen.getByText(/LUT · 1/)).toBeInTheDocument();
  });

  it('preserves the 3 compliance sub-tabs (S77b shell contract)', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: /Schedule M/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /CARO Extended/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /CFR Part 11/i })).toBeInTheDocument();
  });
});
