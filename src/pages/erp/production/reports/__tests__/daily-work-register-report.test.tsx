/**
 * @file daily-work-register-report.test.tsx — RPT-6a toggle recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DailyWorkRegisterReportPanel as Comp } from '../DailyWorkRegisterReport';

describe('RPT-6a · prod-daily-work (toggle recipe)', () => {
  it('mounts toggle host + integrity badge', () => {
    render(<MemoryRouter><Comp /></MemoryRouter>);
    expect(screen.getByTestId('prod-daily-work-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('prod-daily-work-integrity-badge')).toBeInTheDocument();
  });
});
