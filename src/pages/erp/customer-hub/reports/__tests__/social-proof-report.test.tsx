import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SocialProofReportPanel } from '../SocialProofReport';

describe('RPT-7c · cu-social (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge + chart host', () => {
    render(<MemoryRouter><SocialProofReportPanel /></MemoryRouter>);
    expect(screen.getByTestId('cu-social-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('cu-social-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('cu-social-chart-host')).toBeInTheDocument();
  });
});
