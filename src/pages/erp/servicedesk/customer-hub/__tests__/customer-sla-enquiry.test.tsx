import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CustomerSLAEnquiry } from '../CustomerSLAEnquiry';

describe('RPT-8a · sd-sla (dashboard recipe · thresholds OMITTED honestly)', () => {
  it('mounts dashboard host + integrity badge + chart host', () => {
    render(<CustomerSLAEnquiry customerId="C-1" />);
    expect(screen.getByTestId('sd-sla-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('sd-sla-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('sd-sla-chart-host')).toBeInTheDocument();
  });
});
