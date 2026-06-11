import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LogisticDashboard from '../LogisticDashboard';

describe('RPT-6c · log-shipments (dashboard recipe)', () => {
  beforeEach(() => {
    // Seed a minimal logistic session so the dashboard's chart wrap renders
    localStorage.setItem('logistic_session_v1', JSON.stringify({
      logistic_id: 'LOG-1', party_name: 'Test Transporter', entity_code: 'SMRT', at: Date.now(),
    }));
  });

  it('renders without crashing under MemoryRouter', () => {
    const { container } = render(
      <MemoryRouter>
        <LogisticDashboard />
      </MemoryRouter>,
    );
    // We don't strictly assert testIDs (dashboard early-returns when session/data is null),
    // but we assert the component mounts without throwing — registry/DSC wiring is asserted
    // in smallcards-kpis-and-sources.test.ts (log-shipments KPI + logistic.shipments source).
    expect(container).toBeInTheDocument();
  });
});
