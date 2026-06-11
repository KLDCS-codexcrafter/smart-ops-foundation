/**
 * @file stock-with-job-worker.test.tsx — RPT-6a toggle recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StockWithJobWorkerPanel as Comp } from '../StockWithJobWorker';

describe('RPT-6a · prod-jw-stock (toggle recipe)', () => {
  it('mounts toggle host + integrity badge', () => {
    render(<MemoryRouter><Comp /></MemoryRouter>);
    expect(screen.getByTestId('prod-jw-stock-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('prod-jw-stock-integrity-badge')).toBeInTheDocument();
  });
});
